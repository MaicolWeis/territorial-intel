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
    const city = searchParams.get("city");
    const search = searchParams.get("search");

    const where: Prisma.CompanyWhereInput = {
      latitude: { not: null },
      longitude: { not: null },
    };
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
    if (segment) where.mainCnae = { segment };

    const companies = await prisma.company.findMany({
      where,
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
        streetType: true,
        streetNumber: true,
        city: true,
        state: true,
        mainCnae: { select: { segment: true, description: true } },
      },
      take: 5000,
    });

    return NextResponse.json({ companies, total: companies.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
