import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const segments = await prisma.cnae.findMany({
      where: { segment: { not: null } },
      select: { segment: true },
      distinct: ["segment"],
      orderBy: { segment: "asc" },
    });
    const list = segments.map((s) => s.segment).filter(Boolean) as string[];
    if (!list.includes("Outros")) list.push("Outros");
    return NextResponse.json({ segments: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
