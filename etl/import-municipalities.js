#!/usr/bin/env node
// Usa conexão direta do Supabase (sem PgBouncer) para ETL
if (process.env.DIRECT_URL) { process.env.DATABASE_URL = process.env.DIRECT_URL; }
/**
 * ETL: Import Brazilian municipalities from IBGE
 *
 * Seeds the municipalities table with the full list of Brazilian cities and their IBGE codes.
 * This enables mapping city_ibge_code → city name during company import.
 *
 * Source: IBGE - https://servicodados.ibge.gov.br/api/v1/localidades/municipios
 * (public API, no auth required)
 *
 * Alternatively, a local CSV can be placed at data/input/municipios.csv
 * with columns: ibge_code;name;state_code;state
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const INPUT_DIR = process.env.DATA_INPUT_PATH || "./data/input";

async function fetchFromIbgeApi() {
  logger.info("Fetching municipalities from IBGE API...");
  const resp = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome");
  if (!resp.ok) throw new Error(`IBGE API HTTP ${resp.status}`);
  const data = await resp.json();

  return data.map((m) => ({
    ibgeCode: String(m.id),
    name: m.nome.toUpperCase(),
    stateCode: String(m.microrregiao.mesorregiao.UF.id),
    state: m.microrregiao.mesorregiao.UF.sigla,
  }));
}

async function main() {
  logger.info("=== Municipality Import Started ===");

  let municipalities = [];

  // Try local CSV first
  const csvPath = path.join(INPUT_DIR, "municipios.csv");
  if (fs.existsSync(csvPath)) {
    logger.info(`Reading from local file: ${csvPath}`);
    const content = fs.readFileSync(csvPath, "utf-8");
    for (const line of content.split("\n").slice(1)) {
      const [ibgeCode, name, stateCode, state] = line.split(";");
      if (ibgeCode && name) {
        municipalities.push({ ibgeCode: ibgeCode.trim(), name: name.trim().toUpperCase(), stateCode: stateCode?.trim() || "", state: state?.trim() || "" });
      }
    }
  } else {
    logger.info("No local file found, trying IBGE API...");
    try {
      municipalities = await fetchFromIbgeApi();
    } catch (err) {
      logger.error(`IBGE API failed: ${err.message}`);
      logger.warn("Seeding with minimal municipality list for Penha, SC");
      municipalities = [
        { ibgeCode: "4212908", name: "PENHA", stateCode: "42", state: "SC" },
        { ibgeCode: "4205407", name: "FLORIANOPOLIS", stateCode: "42", state: "SC" },
        { ibgeCode: "4202404", name: "BLUMENAU", stateCode: "42", state: "SC" },
        { ibgeCode: "4209102", name: "JOINVILLE", stateCode: "42", state: "SC" },
        { ibgeCode: "4208203", name: "ITAJAI", stateCode: "42", state: "SC" },
      ];
    }
  }

  logger.info(`Upserting ${municipalities.length} municipalities...`);
  const BATCH = 500;
  let count = 0;
  for (let i = 0; i < municipalities.length; i += BATCH) {
    const batch = municipalities.slice(i, i + BATCH);
    await Promise.all(
      batch.map((m) =>
        prisma.municipality.upsert({
          where: { ibgeCode: m.ibgeCode },
          update: { name: m.name, stateCode: m.stateCode, state: m.state },
          create: m,
        })
      )
    );
    count += batch.length;
    logger.info(`  ${count}/${municipalities.length}`);
  }

  logger.info(`=== Municipality Import Done: ${count} records ===`);
  await prisma.$disconnect();
}

main();
