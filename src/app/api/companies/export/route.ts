import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getStatusLabel, getSizeLabel } from "@/lib/types";

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
      ];
    }
    if (segment) where.mainCnae = { segment };

    const companies = await prisma.company.findMany({
      where,
      include: { mainCnae: { select: { description: true, segment: true } } },
      orderBy: { companyName: "asc" },
      take: 10000,
    });

    const header = [
      "CNPJ","Razão Social","Nome Fantasia","Segmento","CNAE Principal",
      "Descrição CNAE","Status","Porte","Bairro","Logradouro",
      "Número","CEP","Município","UF","Latitude","Longitude",
    ].join(";");

    const rows = companies.map((c) => [
      c.cnpjFull,
      `"${(c.companyName || "").replace(/"/g, '""')}"`,
      `"${(c.tradeName || "").replace(/"/g, '""')}"`,
      c.mainCnae?.segment || "Outros",
      c.mainCnaeCode || "",
      `"${(c.mainCnae?.description || "").replace(/"/g, '""')}"`,
      getStatusLabel(c.registrationStatus),
      getSizeLabel(c.companySizeCode),
      `"${(c.neighborhood || "").replace(/"/g, '""')}"`,
      `"${([c.streetType, c.street].filter(Boolean).join(" ") || "").replace(/"/g, '""')}"`,
      c.streetNumber || "",
      c.zipCode || "",
      c.city || "",
      c.state || "",
      c.latitude?.toFixed(6) || "",
      c.longitude?.toFixed(6) || "",
    ].join(";"));

    const csv = [header, ...rows].join("\n");
    const bom = "\uFEFF";

    return new NextResponse(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="empresas-${city || "todas"}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
