#!/usr/bin/env node
// Usa conexão direta do Supabase (sem PgBouncer) para ETL
if (process.env.DIRECT_URL) { process.env.DATABASE_URL = process.env.DIRECT_URL; }
/**
 * ETL: Geocode companies
 *
 * Supports two providers:
 *   1. nominatim  — OpenStreetMap Nominatim (free, requires email, rate-limited)
 *   2. google     — Google Maps Geocoding API (requires API key, paid)
 *
 * Fallback: if address geocoding fails, uses city-center coordinates.
 *
 * City centers (fallback coords):
 *   Penha SC: -26.7717, -48.6478
 *
 * Run: node etl/geocode-companies.js
 * Options via env:
 *   GEOCODING_PROVIDER=nominatim|google
 *   NOMINATIM_EMAIL=your@email.com
 *   GOOGLE_MAPS_API_KEY=...
 *   GEOCODE_BATCH=10           (concurrent requests, default 5)
 *   GEOCODE_DELAY_MS=1200      (delay between nominatim requests, default 1200ms)
 *   GEOCODE_CITY_FALLBACK=true (use city center if address fails)
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");

const prisma = new PrismaClient();

const PROVIDER = process.env.GEOCODING_PROVIDER || "nominatim";
const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL || "user@example.com";
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const BATCH = parseInt(process.env.GEOCODE_BATCH || "5");
const DELAY_MS = parseInt(process.env.GEOCODE_DELAY_MS || "1200");
const CITY_FALLBACK = process.env.GEOCODE_CITY_FALLBACK !== "false";
const MAX_RECORDS = parseInt(process.env.GEOCODE_MAX || "0"); // 0 = all

// City center coordinates fallback
const CITY_CENTERS = {
  "PENHA": { lat: -26.7717, lng: -48.6478 },
  "FLORIANOPOLIS": { lat: -27.5954, lng: -48.5480 },
  "BLUMENAU": { lat: -26.9194, lng: -49.0661 },
  "JOINVILLE": { lat: -26.3044, lng: -48.8487 },
  "ITAJAI": { lat: -26.9073, lng: -48.6621 },
  // Add more as needed
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Nominatim geocoder ────────────────────────────────────────────────────

async function geocodeNominatim(address, city, state) {
  const query = encodeURIComponent(`${address}, ${city}, ${state}, Brasil`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=br`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent": `TerritorialIntelMVP/1.0 (${NOMINATIM_EMAIL})`,
      "Accept-Language": "pt-BR",
    },
  });

  if (!resp.ok) throw new Error(`Nominatim HTTP ${resp.status}`);
  const data = await resp.json();

  if (data && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), source: "nominatim" };
  }
  return null;
}

// ─── Google Maps geocoder ──────────────────────────────────────────────────

async function geocodeGoogle(address, city, state) {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY not set");
  const query = encodeURIComponent(`${address}, ${city} - ${state}, Brasil`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_API_KEY}&region=br`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Google Maps HTTP ${resp.status}`);
  const data = await resp.json();

  if (data.status === "OK" && data.results.length > 0) {
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng, source: "google" };
  }
  return null;
}

// ─── Main geocode function ─────────────────────────────────────────────────

async function geocodeCompany(company) {
  const fullAddress = [
    company.streetType,
    company.street,
    company.streetNumber,
    company.neighborhood,
  ]
    .filter(Boolean)
    .join(" ");

  const city = (company.city || "").toUpperCase();
  const cityKey = Object.keys(CITY_CENTERS).find((k) => city.includes(k));
  const cityCenter = cityKey ? CITY_CENTERS[cityKey] : null;

  try {
    let result = null;

    if (fullAddress.trim().length > 3) {
      if (PROVIDER === "google") {
        result = await geocodeGoogle(fullAddress, company.city, company.state);
      } else {
        result = await geocodeNominatim(fullAddress, company.city, company.state);
      }
    }

    if (!result && CITY_FALLBACK && cityCenter) {
      // Add small random jitter so markers don't all stack on same point
      result = {
        lat: cityCenter.lat + (Math.random() - 0.5) * 0.01,
        lng: cityCenter.lng + (Math.random() - 0.5) * 0.01,
        source: "city_center_fallback",
      };
    }

    return result;
  } catch (err) {
    logger.error(`Geocode error for ${company.cnpjFull}: ${err.message}`);

    if (CITY_FALLBACK && cityCenter) {
      return {
        lat: cityCenter.lat + (Math.random() - 0.5) * 0.01,
        lng: cityCenter.lng + (Math.random() - 0.5) * 0.01,
        source: "city_center_fallback_error",
      };
    }
    return null;
  }
}

async function main() {
  logger.info("=== Geocoding Started ===");
  logger.info(`Provider: ${PROVIDER}`);
  logger.info(`City fallback: ${CITY_FALLBACK}`);
  logger.info(`Batch: ${BATCH} concurrent | Delay: ${DELAY_MS}ms`);

  const whereClause = { latitude: null };

  const total = await prisma.company.count({ where: whereClause });
  logger.info(`Companies needing geocoding: ${total}`);

  if (total === 0) {
    logger.info("All companies already geocoded.");
    await prisma.$disconnect();
    return;
  }

  const limit = MAX_RECORDS > 0 ? Math.min(MAX_RECORDS, total) : total;
  logger.info(`Processing up to ${limit} records`);

  let processed = 0;
  let success = 0;
  let failed = 0;
  const PAGE = BATCH * 10;

  let cursor = 0;
  while (processed < limit) {
    const companies = await prisma.company.findMany({
      where: whereClause,
      select: {
        id: true,
        cnpjFull: true,
        street: true,
        streetType: true,
        streetNumber: true,
        neighborhood: true,
        city: true,
        state: true,
        zipCode: true,
      },
      skip: cursor,
      take: PAGE,
      orderBy: { id: "asc" },
    });

    if (companies.length === 0) break;

    // Process in small batches with delay (important for Nominatim rate limit)
    for (let i = 0; i < companies.length; i += BATCH) {
      const chunk = companies.slice(i, i + BATCH);

      await Promise.all(
        chunk.map(async (company) => {
          const result = await geocodeCompany(company);
          if (result) {
            await prisma.company.update({
              where: { id: company.id },
              data: {
                latitude: result.lat,
                longitude: result.lng,
                geocodedAt: new Date(),
                geocodingSource: result.source,
              },
            });
            success++;
          } else {
            failed++;
          }
          processed++;
        })
      );

      if (PROVIDER === "nominatim") {
        await sleep(DELAY_MS);
      }

      logger.info(`Progress: ${processed}/${limit} | Success: ${success} | Failed: ${failed}`);
    }

    cursor += companies.length;
    if (processed >= limit) break;
  }

  logger.info("=== Geocoding Complete ===");
  logger.info(`Total: ${processed} | Success: ${success} | Failed: ${failed}`);
  await prisma.$disconnect();
}

main();
