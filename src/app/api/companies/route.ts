import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const segment = searchParams.get("segment");
    const size = searchParams.get("size");
    const status = searchParams.get("status");
    const neighborhood = searchParams.get("neighborhood");
    const cnae = searchParams.get("cnae");
    const search = searchParams.get("search");
    const city = searchParams.get("city");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") || "25")));
    const sortBy = searchParams.get("sortBy") || "companyName";
    const sortDir = (searchParams.get("sortDir") || "asc") as "asc" | "desc";
    const mapMode = searchParams.get("map") === "1"; // returns only lat/lng/id for map

    const where: Prisma.CompanyWhereInput = {};

    if (city) where.city = { contains: city, mode: "insensitive" };
    if (status) where.registrationStatus = status;
    if (size) where.companySizeCode = size;
    if (cnae) where.mainCnaeCode = cnae;
    if (neighborhood) where.neighborhood = { contains: neighborhood, mode: "insensitive" };
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { tradeName: { contains: search, mode: "insensitive" } },
        { cnpjFull: { contains: search } },
      ];
    }
    if (segment) {
      where.mainCnae = { segment };
    }

    // Map mode: return minimal data for all geocoded companies
    if (mapMode) {
      const companies = await prisma.company.findMany({
        where: { ...where, latitude: { not: null }, longitude: { not: null } },
        select: {
          id: true,
          cnpjFull: true,
          companyName: true,
          tradeName: true,
          latitude: true,
          longitude: true,
          mainCnaeCode: true,
          registrationStatus: true,
          companySizeCode: true,
          neighborhood: true,
          street: true,
          streetNumber: true,
          mainCnae: { select: { segment: true, description: true } },
        },
        take: 5000, // cap for map performance
      });
      return NextResponse.json({ companies });
    }

    const validSortFields = ["companyName", "tradeName", "cnpjFull", "neighborhood", "registrationStatus", "companySizeCode", "mainCnaeCode"];
    const orderField = validSortFields.includes(sortBy) ? sortBy : "companyName";

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          mainCnae: { select: { code: true, description: true, segment: true } },
        },
        orderBy: { [orderField]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.company.count({ where }),
    ]);

    return NextResponse.json({
      companies,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: unknown) {
    console.error("Companies API error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
