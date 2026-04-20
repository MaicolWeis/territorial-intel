import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStatusLabel, getSizeLabel } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const segment = searchParams.get("segment");
    const size = searchParams.get("size");
    const status = searchParams.get("status");
    const neighborhood = searchParams.get("neighborhood");
    const search = searchParams.get("search");
    const city = searchParams.get("city") || undefined;

    const where: Record<string, unknown> = {};
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (status) where.registrationStatus = status;
    if (size) where.companySizeCode = size;
    if (neighborhood) where.neighborhood = { contains: neighborhood, mode: "insensitive" };
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { tradeName: { contains: search, mode: "insensitive" } },
      ];
    }
    if (segment) {
      where.mainCnae = { segment };
    }

    const [
      total,
      bySegmentRaw,
      byStatusRaw,
      bySizeRaw,
      byNeighborhoodRaw,
      topCnaesRaw,
    ] = await Promise.all([
      prisma.company.count({ where }),

      prisma.$queryRaw<{ segment: string; count: bigint }[]>`
        SELECT c2.segment, COUNT(c1.id)::bigint as count
        FROM companies c1
        LEFT JOIN cnaes c2 ON c1.main_cnae_code = c2.code
        WHERE 1=1
          ${segment ? prisma.$queryRaw`AND c2.segment = ${segment}` : prisma.$queryRaw``}
          ${status ? prisma.$queryRaw`AND c1.registration_status = ${status}` : prisma.$queryRaw``}
          ${size ? prisma.$queryRaw`AND c1.company_size_code = ${size}` : prisma.$queryRaw``}
          ${city ? prisma.$queryRaw`AND c1.city ILIKE ${`%${city}%`}` : prisma.$queryRaw``}
        GROUP BY c2.segment
        ORDER BY count DESC
      `,

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

      prisma.$queryRaw<{ code: string; description: string; count: bigint }[]>`
        SELECT c2.code, c2.description, COUNT(c1.id)::bigint as count
        FROM companies c1
        LEFT JOIN cnaes c2 ON c1.main_cnae_code = c2.code
        WHERE c1.main_cnae_code IS NOT NULL
          ${city ? prisma.$queryRaw`AND c1.city ILIKE ${`%${city}%`}` : prisma.$queryRaw``}
          ${status ? prisma.$queryRaw`AND c1.registration_status = ${status}` : prisma.$queryRaw``}
          ${size ? prisma.$queryRaw`AND c1.company_size_code = ${size}` : prisma.$queryRaw``}
        GROUP BY c2.code, c2.description
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    return NextResponse.json({
      total,
      bySegment: bySegmentRaw.map((r) => ({
        segment: r.segment || "Outros",
        count: Number(r.count),
      })),
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
        code: r.code || "?",
        description: r.description || "Não classificado",
        count: Number(r.count),
      })),
    });
  } catch (err: unknown) {
    console.error("Dashboard API error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
