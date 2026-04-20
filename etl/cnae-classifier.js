/**
 * CNAE Classification Rules
 * Maps CNAE codes/ranges to simplified business segments.
 * Based on IBGE CNAE 2.3 structure.
 */

const SEGMENT_RULES = [
  // ── Restaurants / Food Service ────────────────────────────────
  {
    segment: "Restaurantes",
    rule: "cnae_prefix",
    description: "Alimentação e Serviços de Comida",
    prefixes: ["561", "562"],
  },

  // ── Hotels / Lodging ─────────────────────────────────────────
  {
    segment: "Hotéis",
    rule: "cnae_prefix",
    description: "Hospedagem",
    prefixes: ["551", "559"],
  },

  // ── Industry / Manufacturing ──────────────────────────────────
  {
    segment: "Indústria",
    rule: "section",
    description: "Indústria de Transformação e Extrativa",
    sections: ["A", "B", "C", "D", "E"],
    // Sections A=Agro, B=Extrativa, C=Transformação, D=Eletricidade, E=Saneamento
    // We refine with CNAE division ranges 01–39
    divisionRange: [1, 39],
  },

  // ── Commerce / Retail & Wholesale ─────────────────────────────
  {
    segment: "Comércio",
    rule: "cnae_prefix",
    description: "Comércio Varejista e Atacadista",
    prefixes: [
      "451", "452", "453", "454", "455",
      "461", "462", "463", "464", "465", "466", "467", "468", "469",
      "471", "472", "473", "474", "475", "476", "477", "478", "479",
    ],
  },

  // ── Health ────────────────────────────────────────────────────
  {
    segment: "Saúde",
    rule: "cnae_prefix",
    description: "Saúde e Serviços Sociais",
    prefixes: ["861", "862", "863", "864", "865", "866", "869", "871", "872", "873", "874", "879", "880"],
  },

  // ── Education ─────────────────────────────────────────────────
  {
    segment: "Educação",
    rule: "cnae_prefix",
    description: "Educação",
    prefixes: ["851", "852", "853", "854", "855", "856", "859"],
  },

  // ── Tourism & Leisure ─────────────────────────────────────────
  {
    segment: "Turismo e Lazer",
    rule: "cnae_prefix",
    description: "Turismo, Lazer e Cultura",
    prefixes: ["791", "900", "910", "920", "931", "932"],
  },

  // ── Construction ──────────────────────────────────────────────
  {
    segment: "Construção",
    rule: "cnae_prefix",
    description: "Construção Civil",
    prefixes: ["411", "412", "421", "422", "423", "431", "432", "433", "439"],
  },

  // ── Transport & Logistics ─────────────────────────────────────
  {
    segment: "Transporte e Logística",
    rule: "cnae_prefix",
    description: "Transporte, Armazenagem e Correio",
    prefixes: ["491", "492", "493", "494", "495", "501", "502", "503", "504", "505", "511", "521", "522", "523", "524", "531", "532"],
  },

  // ── Financial Services ────────────────────────────────────────
  {
    segment: "Finanças e Seguros",
    rule: "cnae_prefix",
    description: "Atividades Financeiras e de Seguros",
    prefixes: ["641", "642", "643", "649", "651", "652", "661", "662", "663"],
  },

  // ── Real Estate ───────────────────────────────────────────────
  {
    segment: "Imóveis",
    rule: "cnae_prefix",
    description: "Atividades Imobiliárias",
    prefixes: ["681", "682"],
  },

  // ── Technology ────────────────────────────────────────────────
  {
    segment: "Tecnologia",
    rule: "cnae_prefix",
    description: "TI e Telecomunicações",
    prefixes: ["582", "611", "612", "613", "619", "620", "631", "639"],
  },

  // ── Professional Services ────────────────────────────────────
  {
    segment: "Serviços Profissionais",
    rule: "cnae_prefix",
    description: "Serviços Jurídicos, Contábeis e Consultoria",
    prefixes: ["691", "692", "702", "711", "712", "721", "722", "731", "732", "733", "741", "742", "749"],
  },

  // ── Personal Services ─────────────────────────────────────────
  {
    segment: "Serviços Pessoais",
    rule: "cnae_prefix",
    description: "Outros Serviços Pessoais",
    prefixes: ["960", "961", "962", "963", "969"],
  },

  // ── Agriculture / Fishing ─────────────────────────────────────
  {
    segment: "Agropecuária e Pesca",
    rule: "cnae_prefix",
    description: "Agricultura, Pecuária e Pesca",
    prefixes: ["011", "012", "013", "014", "015", "016", "021", "022", "023", "024", "031", "032"],
  },
];

/**
 * Classify a CNAE code string into a segment.
 * @param {string} cnaeCode - raw CNAE code, e.g. "5611-2/01" or "56112" or "5611"
 * @returns {{ segment: string, rule: string }}
 */
function classifyCnae(cnaeCode) {
  if (!cnaeCode) return { segment: "Outros", rule: "fallback" };

  // Normalize: keep only digits
  const digits = String(cnaeCode).replace(/\D/g, "");
  if (!digits || digits.length < 4) return { segment: "Outros", rule: "fallback" };

  // Division = first 2 digits
  const division = parseInt(digits.substring(0, 2), 10);
  // Group = first 3 digits (as string prefix)
  const prefix3 = digits.substring(0, 3);

  for (const rule of SEGMENT_RULES) {
    if (rule.rule === "cnae_prefix") {
      if (rule.prefixes.some((p) => digits.startsWith(p))) {
        return { segment: rule.segment, rule: `prefix:${prefix3}` };
      }
    }
    if (rule.rule === "section" && rule.divisionRange) {
      if (division >= rule.divisionRange[0] && division <= rule.divisionRange[1]) {
        return { segment: rule.segment, rule: `division:${division}` };
      }
    }
  }

  return { segment: "Outros", rule: "fallback" };
}

/**
 * Return all segment names used in the system.
 */
function getAllSegments() {
  const segments = new Set(SEGMENT_RULES.map((r) => r.segment));
  segments.add("Outros");
  return Array.from(segments);
}

module.exports = { classifyCnae, getAllSegments, SEGMENT_RULES };
