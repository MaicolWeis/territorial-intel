import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStatusLabel, getSizeLabel } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city") || "PENHA";
    const segment = searchParams.get("segment") || undefined;
    const size = searchParams.get("size") || undefined;
    const status = searchParams.get("status") || undefined;
    const neighborhood = searchParams.get("neighborhood") || undefined;

    const where: Record<string, unknown> = {
      city: { contains: city, mode: "insensitive" },
    };
    if (status) where.registrationStatus = status;
    if (size) where.companySizeCode = size;
    if (neighborhood) where.neighborhood = { contains: neighborhood, mode: "insensitive" };
    if (segment) where.mainCnae = { segment };

    const [
      total,
      byStatusRaw,
      bySizeRaw,
      byNeighborhoodRaw,
      topCnaesRaw,
      allCompanies,
    ] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.groupBy({
        by: ["registrationStatus"],
        _count: { id: true },
        where,
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.company.groupBy({
        by: ["companySizeCode"],
        _count: { id: true },
        where,
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.company.groupBy({
        by: ["neighborhood"],
        _count: { id: true },
        where: { ...where, neighborhood: { not: null } },
        orderBy: { _count: { id: "desc" } },
        take: 15,
      }),
      prisma.company.groupBy({
        by: ["mainCnaeCode"],
        _count: { id: true },
        where: { ...where, mainCnaeCode: { not: null } },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.company.findMany({
        where,
        select: { mainCnae: { select: { segment: true } } },
      }),
    ]);

    // Count by segment
    const segmentMap: Record<string, number> = {};
    for (const c of allCompanies) {
      const seg = c.mainCnae?.segment || "Outros";
      segmentMap[seg] = (segmentMap[seg] || 0) + 1;
    }
    const bySegment = Object.entries(segmentMap)
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count);

    // Get CNAE descriptions
    const cnaeCodesRaw = topCnaesRaw.map((r) => r.mainCnaeCode).filter(Boolean) as string[];
    const cnaeDescriptions = await prisma.cnae.findMany({
      where: { code: { in: cnaeCodesRaw } },
      select: { code: true, description: true },
    });
    const cnaeMap = Object.fromEntries(cnaeDescriptions.map((c) => [c.code, c.description]));

    return NextResponse.json({
      total,
      bySegment,
      byStatus: byStatusRaw.map((r) => ({
        status: r.registrationStatus || "00",
        label: getStatusLabel(r.registrationStatus),
        count: r._count.id,
      })),
      bySize: bySizeRaw.map((r) => ({
        size: r.companySizeCode || "00",
        label: getSizeLabel(r.companySizeCode),
        count: r._count.id,
      })),
      byNeighborhood: byNeighborhoodRaw.map((r) => ({
        neighborhood: r.neighborhood || "Não informado",
        count: r._count.id,
      })),
      topCnaes: topCnaesRaw.map((r) => ({
        code: r.mainCnaeCode || "?",
        description: cnaeMap[r.mainCnaeCode || ""] || "Não classificado",
        count: r._count.id,
      })),
    });
  } catch (err: unknown) {
    console.error("Dashboard API error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
