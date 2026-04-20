#!/usr/bin/env node
// Usa conexão direta do Supabase (sem PgBouncer) para ETL
if (process.env.DIRECT_URL) { process.env.DATABASE_URL = process.env.DIRECT_URL; }
/**
 * ETL: Import CNAE reference data
 *
 * Source: IBGE CONCLA official CNAE 2.3 file
 * File expected: data/input/cnae_2_3_estrutura.csv  (or .xlsx converted to CSV)
 *
 * Official download: https://concla.ibge.gov.br/busca-online-cnae.html
 * Alternative flat file: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/consultas/arquivos/CNAERF.txt
 *
 * The importer is tolerant: if the official CSV is not found, it seeds
 * with a minimal built-in dataset covering the most common divisions.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");
const { classifyCnae } = require("./cnae-classifier");

const prisma = new PrismaClient();
const INPUT_DIR = process.env.DATA_INPUT_PATH || "./data/input";

// Minimal built-in CNAE seed for most common codes in small Brazilian cities
// Full list has ~1300 entries; this covers the main segments for an MVP
const BUILTIN_CNAES = [
  // Restaurants / Food
  { code: "5611201", description: "Restaurantes e similares", division: "56", group: "56.1", class: "56.11", subclass: "5611-2/01" },
  { code: "5611202", description: "Bares e outros estabelecimentos especializados em servir bebidas", division: "56", group: "56.1", class: "56.11", subclass: "5611-2/02" },
  { code: "5611203", description: "Lanchonetes, casas de chá, de sucos e similares", division: "56", group: "56.1", class: "56.11", subclass: "5611-2/03" },
  { code: "5620101", description: "Fornecimento de alimentos preparados – Catering", division: "56", group: "56.2", class: "56.20", subclass: "5620-1/01" },
  // Hotels / Lodging
  { code: "5510801", description: "Hotéis", division: "55", group: "55.1", class: "55.10", subclass: "5510-8/01" },
  { code: "5510802", description: "Apart-hotéis", division: "55", group: "55.1", class: "55.10", subclass: "5510-8/02" },
  { code: "5590601", description: "Albergues, exceto assistenciais", division: "55", group: "55.9", class: "55.90", subclass: "5590-6/01" },
  { code: "5590602", description: "Campings", division: "55", group: "55.9", class: "55.90", subclass: "5590-6/02" },
  { code: "5590603", description: "Pensões (alojamento)", division: "55", group: "55.9", class: "55.90", subclass: "5590-6/03" },
  // Commerce
  { code: "4711301", description: "Comércio varejista de mercadorias em geral (hipermercados)", division: "47", group: "47.1", class: "47.11", subclass: "4711-3/01" },
  { code: "4711302", description: "Comércio varejista de mercadorias em geral (supermercados)", division: "47", group: "47.1", class: "47.11", subclass: "4711-3/02" },
  { code: "4712100", description: "Comércio varejista de mercadorias em geral (lojas de conveniência)", division: "47", group: "47.1", class: "47.12", subclass: "4712-1/00" },
  { code: "4721102", description: "Padaria, confeitaria com predominância de revenda", division: "47", group: "47.2", class: "47.21", subclass: "4721-1/02" },
  { code: "4722901", description: "Comércio varejista de carnes – açougues", division: "47", group: "47.2", class: "47.22", subclass: "4722-9/01" },
  { code: "4731800", description: "Comércio varejista de combustíveis", division: "47", group: "47.3", class: "47.31", subclass: "4731-8/00" },
  { code: "4741500", description: "Comércio varejista de tintas e materiais para pintura", division: "47", group: "47.4", class: "47.41", subclass: "4741-5/00" },
  { code: "4744001", description: "Comércio varejista de ferragens, madeira e materiais de construção", division: "47", group: "47.4", class: "47.44", subclass: "4744-0/01" },
  { code: "4771701", description: "Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas", division: "47", group: "47.7", class: "47.71", subclass: "4771-7/01" },
  { code: "4781400", description: "Comércio varejista de artigos do vestuário e acessórios", division: "47", group: "47.8", class: "47.81", subclass: "4781-4/00" },
  { code: "4782201", description: "Comércio varejista de calçados", division: "47", group: "47.8", class: "47.82", subclass: "4782-2/01" },
  // Industry / Fishing (important for Penha)
  { code: "1020101", description: "Preservação de peixes, crustáceos e moluscos", division: "10", group: "10.2", class: "10.20", subclass: "1020-1/01" },
  { code: "1020102", description: "Fabricação de conservas de peixes, crustáceos e moluscos", division: "10", group: "10.2", class: "10.20", subclass: "1020-1/02" },
  { code: "0311601", description: "Pesca de peixes em água salgada", division: "03", group: "03.1", class: "03.11", subclass: "0311-6/01" },
  { code: "0311602", description: "Pesca de crustáceos e moluscos em água salgada", division: "03", group: "03.1", class: "03.11", subclass: "0311-6/02" },
  { code: "0321301", description: "Criação de peixes em água salgada e salobra", division: "03", group: "03.2", class: "03.21", subclass: "0321-3/01" },
  { code: "1311100", description: "Preparação e fiação de fibras de algodão", division: "13", group: "13.1", class: "13.11", subclass: "1311-1/00" },
  { code: "1411801", description: "Confecção de roupas íntimas", division: "14", group: "14.1", class: "14.11", subclass: "1411-8/01" },
  { code: "1531901", description: "Fabricação de calçados de couro", division: "15", group: "15.3", class: "15.31", subclass: "1531-9/01" },
  // Construction
  { code: "4120400", description: "Construção de edifícios", division: "41", group: "41.2", class: "41.20", subclass: "4120-4/00" },
  { code: "4321500", description: "Instalação e manutenção elétrica", division: "43", group: "43.2", class: "43.21", subclass: "4321-5/00" },
  // Health
  { code: "8621601", description: "UTI móvel", division: "86", group: "86.2", class: "86.21", subclass: "8621-6/01" },
  { code: "8630502", description: "Atividade médica ambulatorial com recursos para realização de procedimentos cirúrgicos", division: "86", group: "86.3", class: "86.30", subclass: "8630-5/02" },
  { code: "8630503", description: "Atividade médica ambulatorial restrita a consultas", division: "86", group: "86.3", class: "86.30", subclass: "8630-5/03" },
  { code: "8630504", description: "Atividade odontológica", division: "86", group: "86.3", class: "86.30", subclass: "8630-5/04" },
  { code: "8640202", description: "Laboratorios clínicos", division: "86", group: "86.4", class: "86.40", subclass: "8640-2/02" },
  { code: "8650001", description: "Atividades de enfermagem", division: "86", group: "86.5", class: "86.50", subclass: "8650-0/01" },
  { code: "8650004", description: "Atividades de fisioterapia", division: "86", group: "86.5", class: "86.50", subclass: "8650-0/04" },
  { code: "8650005", description: "Atividades de psicologia e psicanálise", division: "86", group: "86.5", class: "86.50", subclass: "8650-0/05" },
  // Education
  { code: "8511200", description: "Educação infantil – creche", division: "85", group: "85.1", class: "85.11", subclass: "8511-2/00" },
  { code: "8512100", description: "Educação infantil – pré-escola", division: "85", group: "85.1", class: "85.12", subclass: "8512-1/00" },
  { code: "8513900", description: "Ensino fundamental", division: "85", group: "85.1", class: "85.13", subclass: "8513-9/00" },
  { code: "8520100", description: "Ensino médio", division: "85", group: "85.2", class: "85.20", subclass: "8520-1/00" },
  { code: "8531700", description: "Educação superior – graduação", division: "85", group: "85.3", class: "85.31", subclass: "8531-7/00" },
  { code: "8599601", description: "Formação de condutores", division: "85", group: "85.9", class: "85.99", subclass: "8599-6/01" },
  { code: "8599604", description: "Treinamento em desenvolvimento profissional", division: "85", group: "85.9", class: "85.99", subclass: "8599-6/04" },
  // Technology
  { code: "6201501", description: "Desenvolvimento de programas de computador sob encomenda", division: "62", group: "62.0", class: "62.01", subclass: "6201-5/01" },
  { code: "6202300", description: "Desenvolvimento e licenciamento de programas de computador", division: "62", group: "62.0", class: "62.02", subclass: "6202-3/00" },
  { code: "6209100", description: "Suporte técnico, manutenção e outros serviços em tecnologia", division: "62", group: "62.0", class: "62.09", subclass: "6209-1/00" },
  // Personal Services
  { code: "9602501", description: "Cabeleireiros, manicure e pedicure", division: "96", group: "96.0", class: "96.02", subclass: "9602-5/01" },
  { code: "9602502", description: "Atividades de estética e outros serviços de cuidados com a beleza", division: "96", group: "96.0", class: "96.02", subclass: "9602-5/02" },
  { code: "9609204", description: "Serviços de tatuagem e colocação de piercing", division: "96", group: "96.0", class: "96.09", subclass: "9609-2/04" },
  // Professional Services
  { code: "6911701", description: "Serviços advocatícios", division: "69", group: "69.1", class: "69.11", subclass: "6911-7/01" },
  { code: "6920601", description: "Atividades de contabilidade", division: "69", group: "69.2", class: "69.20", subclass: "6920-6/01" },
  { code: "7020400", description: "Atividades de consultoria em gestão empresarial", division: "70", group: "70.2", class: "70.20", subclass: "7020-4/00" },
  { code: "7410202", description: "Design de interiores", division: "74", group: "74.1", class: "74.10", subclass: "7410-2/02" },
  // Transport
  { code: "4921301", description: "Transporte rodoviário coletivo de passageiros", division: "49", group: "49.2", class: "49.21", subclass: "4921-3/01" },
  { code: "4923001", description: "Serviço de táxi", division: "49", group: "49.2", class: "49.23", subclass: "4923-0/01" },
  { code: "4929901", description: "Transporte rodoviário coletivo de passageiros não especificado anteriormente", division: "49", group: "49.2", class: "49.29", subclass: "4929-9/01" },
  { code: "4930201", description: "Transporte rodoviário de carga, exceto produtos perigosos e mudanças", division: "49", group: "49.3", class: "49.30", subclass: "4930-2/01" },
  // Real Estate
  { code: "6810201", description: "Compra e venda de imóveis próprios", division: "68", group: "68.1", class: "68.10", subclass: "6810-2/01" },
  { code: "6820800", description: "Aluguel de imóveis próprios", division: "68", group: "68.2", class: "68.20", subclass: "6820-8/00" },
  // Financial
  { code: "6422100", description: "Bancos múltiplos, com carteira comercial", division: "64", group: "64.2", class: "64.22", subclass: "6422-1/00" },
  { code: "6611803", description: "Bolsas de valores", division: "66", group: "66.1", class: "66.11", subclass: "6611-8/03" },
  // Tourism
  { code: "7911200", description: "Agências de viagens", division: "79", group: "79.1", class: "79.11", subclass: "7911-2/00" },
  { code: "9319101", description: "Produção e promoção de eventos esportivos", division: "93", group: "93.1", class: "93.19", subclass: "9319-1/01" },
];

async function loadCnaeCsvFile() {
  // Try multiple known file name patterns from official sources
  const candidates = [
    "cnae_2_3_estrutura.csv",
    "CNAERF.txt",
    "cnae_subclasses_2_3.csv",
    "cnae.csv",
    "Estrutura_Detalhada_e_Notas_Explicativas_da_CNAE_2_3.xlsx.csv",
  ];

  for (const name of candidates) {
    const fpath = path.join(INPUT_DIR, name);
    if (fs.existsSync(fpath)) {
      logger.info(`Found CNAE file: ${fpath}`);
      return fpath;
    }
  }
  return null;
}

async function parseCnaeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const records = parse(content, {
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  const cnaes = [];
  for (const row of records) {
    // Try to find code column (field names vary by IBGE file version)
    const code = (row["Subclasse"] || row["codigo"] || row["CODIGO"] || row["code"] || "")
      .replace(/[.\-/]/g, "")
      .trim();
    const description = (row["Denominação"] || row["descricao"] || row["DESCRICAO"] || row["description"] || "").trim();

    if (code.length >= 4 && description) {
      const { segment, rule } = classifyCnae(code);
      cnaes.push({ code: code.padEnd(7, "0").substring(0, 7), description, segment, segmentRule: rule });
    }
  }
  return cnaes;
}

async function upsertCnaes(cnaes) {
  let count = 0;
  const BATCH = 100;
  for (let i = 0; i < cnaes.length; i += BATCH) {
    const batch = cnaes.slice(i, i + BATCH);
    await Promise.all(
      batch.map((c) =>
        prisma.cnae.upsert({
          where: { code: c.code },
          update: { description: c.description, segment: c.segment, segmentRule: c.segmentRule },
          create: {
            code: c.code,
            description: c.description,
            division: c.code.substring(0, 2),
            groupName: c.group || null,
            className: c.class || null,
            subclassName: c.subclass || null,
            segment: c.segment,
            segmentRule: c.segmentRule,
          },
        })
      )
    );
    count += batch.length;
    logger.info(`  Upserted CNAEs: ${count}/${cnaes.length}`);
  }
  return count;
}

async function main() {
  logger.info("=== CNAE Import Started ===");

  const job = await prisma.importJob.create({
    data: { source: "cnae-import", status: "running" },
  });

  try {
    let cnaes;
    const csvPath = await loadCnaeCsvFile();

    if (csvPath) {
      logger.info("Parsing CNAE CSV file...");
      cnaes = await parseCnaeFile(csvPath);
      logger.info(`Parsed ${cnaes.length} CNAE entries from file`);
    } else {
      logger.warn("No CNAE CSV file found in data/input. Using built-in minimal seed.");
      logger.warn("For full CNAE data, download from: https://concla.ibge.gov.br/busca-online-cnae.html");
      cnaes = BUILTIN_CNAES.map((c) => {
        const { segment, rule } = classifyCnae(c.code);
        return { ...c, segment, segmentRule: rule };
      });
    }

    const count = await upsertCnaes(cnaes);

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "done",
        finishedAt: new Date(),
        recordsProcessed: cnaes.length,
        recordsImported: count,
        notes: csvPath ? `From file: ${csvPath}` : "Built-in seed used",
      },
    });

    logger.info(`=== CNAE Import Done: ${count} records ===`);
  } catch (err) {
    logger.error(`CNAE import failed: ${err.message}`);
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "error", finishedAt: new Date(), notes: err.message },
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
