import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [companies, geocoded, cnaes, municipalities] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { latitude: { not: null } } }),
      prisma.cnae.count(),
      prisma.municipality.count(),
    ]);
    return NextResponse.json({ companies, geocoded, cnaes, municipalities });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
