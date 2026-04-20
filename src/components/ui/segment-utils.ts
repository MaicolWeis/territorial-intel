// Client-safe segment list — mirrors etl/cnae-classifier.js
export const ALL_SEGMENTS = [
  "Restaurantes",
  "Hotéis",
  "Indústria",
  "Comércio",
  "Saúde",
  "Educação",
  "Turismo e Lazer",
  "Construção",
  "Transporte e Logística",
  "Finanças e Seguros",
  "Imóveis",
  "Tecnologia",
  "Serviços Profissionais",
  "Serviços Pessoais",
  "Agropecuária e Pesca",
  "Outros",
];

export function getAllSegments() {
  return ALL_SEGMENTS;
}
