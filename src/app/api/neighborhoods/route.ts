import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const where: Record<string, unknown> = { neighborhood: { not: null } };
    if (city) where.city = { contains: city, mode: "insensitive" };

    const neighborhoods = await prisma.company.findMany({
      where,
      select: { neighborhood: true },
      distinct: ["neighborhood"],
      orderBy: { neighborhood: "asc" },
    });

    return NextResponse.json({
      neighborhoods: neighborhoods.map((n) => n.neighborhood).filter(Boolean),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
