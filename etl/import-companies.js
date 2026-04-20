#!/usr/bin/env node
/**
 * ETL: Importa dados da Receita Federal direto no Supabase
 *
 * Configure no .env:
 *   DIRECT_URL = string de conexão direta do Supabase (não o pooler)
 *   TARGET_CITY = PENHA
 *   TARGET_STATE = SC
 *   TARGET_CITY_IBGE = 4212908
 *
 * Arquivos esperados em data/input/:
 *   Estabelecimentos0.csv ... Estabelecimentos9.csv
 *   Empresas0.csv ... Empresas9.csv
 *
 * Fonte: https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/
 */

// Força uso da DIRECT_URL para o ETL (sem pooler — necessário para queries longas)
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const iconv = require("iconv-lite");
const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");
const { classifyCnae } = require("./cnae-classifier");

const prisma = new PrismaClient();

const INPUT_DIR = process.env.DATA_INPUT_PATH || "./data/input";
const TARGET_CITY = (process.env.TARGET_CITY || "PENHA").toUpperCase().trim();
const TARGET_STATE = (process.env.TARGET_STATE || "SC").toUpperCase().trim();
const TARGET_IBGE = process.env.TARGET_CITY_IBGE || "";
const BATCH_SIZE = parseInt(process.env.IMPORT_BATCH_SIZE || "200");

// Colunas Estabelecimentos (pipe-delimited, sem header)
const E = {
  CNPJ_BASE: 0, CNPJ_ORDER: 1, CNPJ_DV: 2,
  TRADE_NAME: 4, REG_STATUS: 5, REG_STATUS_DATE: 6,
  MAIN_CNAE: 11, SEC_CNAES: 12,
  STREET_TYPE: 13, STREET: 14, NUMBER: 15,
  COMPLEMENT: 16, NEIGHBORHOOD: 17, ZIP: 18,
  STATE: 19, CITY_CODE: 20,
};

// Colunas Empresas
const C = {
  CNPJ_BASE: 0, COMPANY_NAME: 1, LEGAL_NATURE: 2,
  RESPONSIBLE: 3, CAPITAL: 4, SIZE_CODE: 5,
};

function norm(s) { return s ? s.trim().replace(/\s+/g, " ") || null : null; }
function fmtCnpj(b, o, d) {
  b = String(b).padStart(8,"0"); o = String(o).padStart(4,"0"); d = String(d).padStart(2,"0");
  return `${b.slice(0,2)}.${b.slice(2,5)}.${b.slice(5,8)}/${o}-${d}`;
}
function parseDate(s) {
  if (!s || s === "00000000" || !s.trim()) return null;
  const t = s.trim();
  if (t.length === 8) {
    const dt = new Date(`${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}
function parseCap(s) {
  if (!s || !s.trim()) return null;
  const v = parseFloat(s.replace(",", "."));
  return isNaN(v) ? null : v;
}
function findFiles(dir, re) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => re.test(f)).map(f => path.join(dir, f)).sort();
}
function normCnae(s) {
  if (!s) return null;
  const d = s.replace(/\D/g,"");
  if (!d || d.length < 4) return null;
  return d.padEnd(7,"0").slice(0,7);
}

async function loadEmpresas(files) {
  const map = new Map();
  for (const f of files) {
    logger.info(`Lendo Empresas: ${path.basename(f)}`);
    await new Promise((res, rej) => {
      const rl = readline.createInterface({
        input: fs.createReadStream(f).pipe(iconv.decodeStream("latin1")),
        crlfDelay: Infinity,
      });
      let n = 0;
      rl.on("line", line => {
        n++;
        if (!line.trim()) return;
        const cols = line.split("|");
        if (cols.length < 5) return;
        const base = cols[C.CNPJ_BASE]?.trim().padStart(8,"0");
        if (!base || base.length !== 8) return;
        map.set(base, {
          companyName: norm(cols[C.COMPANY_NAME]),
          legalNatureCode: norm(cols[C.LEGAL_NATURE]),
          responsibleEntity: norm(cols[C.RESPONSIBLE]),
          capitalSocial: parseCap(cols[C.CAPITAL]),
          companySizeCode: norm(cols[C.SIZE_CODE]),
        });
        if (n % 500000 === 0) logger.info(`  Empresas: ${n.toLocaleString()} lidas`);
      });
      rl.on("close", () => { logger.info(`  ${path.basename(f)}: ${n.toLocaleString()} linhas`); res(); });
      rl.on("error", rej);
    });
  }
  logger.info(`Mapa Empresas: ${map.size.toLocaleString()} registros`);
  return map;
}

async function importEstabelecimentos(files, empMap, jobId) {
  let processed = 0, imported = 0, skipped = 0;
  let batch = [];

  async function flush() {
    if (!batch.length) return;
    const items = batch.splice(0);
    for (const r of items) {
      try {
        const sec = r._sec;
        delete r._sec;
        const company = await prisma.company.upsert({
          where: { cnpjFull: r.cnpjFull },
          update: {
            tradeName: r.tradeName, registrationStatus: r.registrationStatus,
            registrationStatusDate: r.registrationStatusDate, mainCnaeCode: r.mainCnaeCode,
            street: r.street, streetType: r.streetType, streetNumber: r.streetNumber,
            addressComplement: r.addressComplement, neighborhood: r.neighborhood,
            zipCode: r.zipCode, updatedAt: new Date(),
          },
          create: r,
          select: { id: true },
        });
        if (sec.length) {
          for (const cnaeCode of sec) {
            await prisma.companySecondaryCnae.upsert({
              where: { companyId_cnaeCode: { companyId: company.id, cnaeCode } },
              update: {},
              create: { companyId: company.id, cnaeCode },
            });
          }
        }
        imported++;
      } catch (err) {
        logger.error(`Erro upsert ${r.cnpjFull}: ${err.message}`);
        skipped++;
      }
    }
    logger.info(`  Importados: ${imported.toLocaleString()} | Pulados: ${skipped}`);
    await prisma.importJob.update({
      where: { id: jobId },
      data: { recordsProcessed: processed, recordsImported: imported, recordsSkipped: skipped },
    });
  }

  for (const f of files) {
    logger.info(`Processando: ${path.basename(f)}`);
    let matches = 0;
    await new Promise((res, rej) => {
      const rl = readline.createInterface({
        input: fs.createReadStream(f).pipe(iconv.decodeStream("latin1")),
        crlfDelay: Infinity,
      });
      rl.on("line", async line => {
        processed++;
        if (!line.trim()) return;
        const cols = line.split("|");
        if (cols.length < 21) return;
        const state = cols[E.STATE]?.trim().toUpperCase();
        if (state !== TARGET_STATE) return;
        const cityCode = cols[E.CITY_CODE]?.trim();
        if (TARGET_IBGE && cityCode !== TARGET_IBGE) return;
        matches++;
        const base = cols[E.CNPJ_BASE]?.trim().padStart(8,"0");
        const order = cols[E.CNPJ_ORDER]?.trim().padStart(4,"0");
        const dv = cols[E.CNPJ_DV]?.trim().padStart(2,"0");
        if (!base || base.length !== 8) return;
        const emp = empMap.get(base) || {};
        const mainCnae = normCnae(cols[E.MAIN_CNAE]);
        const sec = (cols[E.SEC_CNAES] || "").split(",")
          .map(c => normCnae(c.trim())).filter(c => c && c !== "0000000");

        batch.push({
          cnpjFull: fmtCnpj(base, order, dv),
          cnpjBase: base, cnpjOrder: order, cnpjDv: dv,
          companyName: emp.companyName || "SEM RAZÃO SOCIAL",
          tradeName: norm(cols[E.TRADE_NAME]),
          legalNatureCode: emp.legalNatureCode,
          companySizeCode: emp.companySizeCode,
          responsibleEntity: emp.responsibleEntity,
          capitalSocial: emp.capitalSocial,
          registrationStatus: norm(cols[E.REG_STATUS]),
          registrationStatusDate: parseDate(cols[E.REG_STATUS_DATE]),
          state, city: TARGET_CITY, cityIbgeCode: cityCode,
          neighborhood: norm(cols[E.NEIGHBORHOOD]),
          street: norm(cols[E.STREET]),
          streetType: norm(cols[E.STREET_TYPE]),
          streetNumber: norm(cols[E.NUMBER]),
          addressComplement: norm(cols[E.COMPLEMENT]),
          zipCode: norm(cols[E.ZIP]),
          mainCnaeCode: mainCnae,
          _sec: sec,
        });

        if (batch.length >= BATCH_SIZE) {
          rl.pause();
          await flush();
          rl.resume();
        }
        if (processed % 200000 === 0)
          logger.info(`  Linhas: ${processed.toLocaleString()} | Matches: ${matches.toLocaleString()}`);
      });
      rl.on("close", async () => { await flush(); res(); });
      rl.on("error", rej);
    });
  }
  return { processed, imported, skipped };
}

async function backfillSegments() {
  logger.info("Preenchendo segmentos CNAE ausentes...");
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT main_cnae_code FROM companies
    WHERE main_cnae_code IS NOT NULL
      AND main_cnae_code NOT IN (SELECT code FROM cnaes)
  `;
  for (const row of rows) {
    const code = row.main_cnae_code;
    const { segment, rule } = classifyCnae(code);
    await prisma.cnae.upsert({
      where: { code },
      update: { segment, segmentRule: rule },
      create: { code, description: `CNAE ${code}`, segment, segmentRule: rule, division: code.slice(0,2) },
    });
  }
  logger.info(`Segmentos preenchidos: ${rows.length}`);
}

async function main() {
  logger.info("=== Importação de Empresas (Supabase) ===");
  logger.info(`Cidade: ${TARGET_CITY} / ${TARGET_STATE} / IBGE: ${TARGET_IBGE || "não definido"}`);

  const estabFiles = findFiles(INPUT_DIR, /^Estabelecimentos.*\.(csv|txt)$/i);
  const empFiles = findFiles(INPUT_DIR, /^Empresas.*\.(csv|txt)$/i);

  if (!estabFiles.length) {
    logger.error("Nenhum arquivo Estabelecimentos*.csv encontrado em data/input/");
    logger.error("Baixe em: https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/");
    process.exit(1);
  }

  const job = await prisma.importJob.create({
    data: { source: `companies:${TARGET_CITY}`, status: "running",
            notes: estabFiles.map(f => path.basename(f)).join(", ") },
  });

  try {
    const empMap = empFiles.length ? await loadEmpresas(empFiles) : new Map();
    const { processed, imported, skipped } = await importEstabelecimentos(estabFiles, empMap, job.id);
    await backfillSegments();
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "done", finishedAt: new Date(), recordsProcessed: processed,
              recordsImported: imported, recordsSkipped: skipped },
    });
    logger.info(`=== Concluído: ${imported.toLocaleString()} importados, ${skipped} pulados ===`);
  } catch (err) {
    logger.error(`Falha: ${err.message}`);
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
