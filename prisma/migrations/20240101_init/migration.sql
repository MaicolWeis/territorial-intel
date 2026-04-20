-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "cnpj_full" VARCHAR(18) NOT NULL,
    "cnpj_base" VARCHAR(8) NOT NULL,
    "cnpj_order" VARCHAR(4) NOT NULL,
    "cnpj_dv" VARCHAR(2) NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "trade_name" VARCHAR(55),
    "legal_nature_code" VARCHAR(4),
    "company_size_code" VARCHAR(2),
    "responsible_entity" VARCHAR(20),
    "capital_social" DECIMAL(15,2),
    "registration_status" VARCHAR(2),
    "registration_status_date" DATE,
    "state" VARCHAR(2),
    "city" VARCHAR(50),
    "city_ibge_code" VARCHAR(7),
    "neighborhood" VARCHAR(50),
    "street" VARCHAR(60),
    "street_type" VARCHAR(20),
    "street_number" VARCHAR(6),
    "address_complement" VARCHAR(156),
    "zip_code" VARCHAR(8),
    "main_cnae_code" VARCHAR(7),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geocoded_at" TIMESTAMP(3),
    "geocoding_source" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_secondary_cnaes" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "cnae_code" VARCHAR(7) NOT NULL,
    CONSTRAINT "company_secondary_cnaes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cnaes" (
    "code" VARCHAR(7) NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "section" VARCHAR(5),
    "division" VARCHAR(5),
    "group_name" VARCHAR(200),
    "class_name" VARCHAR(200),
    "subclass_name" VARCHAR(200),
    "segment" VARCHAR(30),
    "segment_rule" VARCHAR(50),
    CONSTRAINT "cnaes_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "legal_natures" (
    "code" VARCHAR(4) NOT NULL,
    "description" VARCHAR(150) NOT NULL,
    CONSTRAINT "legal_natures_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "municipalities" (
    "ibge_code" VARCHAR(7) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "state_code" VARCHAR(2) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("ibge_code")
);

CREATE TABLE "import_jobs" (
    "id" SERIAL NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'running',
    "records_processed" INTEGER,
    "records_imported" INTEGER,
    "records_skipped" INTEGER,
    "notes" TEXT,
    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "companies" ADD CONSTRAINT "companies_cnpj_full_key" UNIQUE ("cnpj_full");
ALTER TABLE "company_secondary_cnaes" ADD CONSTRAINT "company_secondary_cnaes_company_id_cnae_code_key" UNIQUE ("company_id", "cnae_code");

-- Foreign keys
ALTER TABLE "company_secondary_cnaes" ADD CONSTRAINT "company_secondary_cnaes_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "companies" ADD CONSTRAINT "companies_main_cnae_code_fkey"
    FOREIGN KEY ("main_cnae_code") REFERENCES "cnaes"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "companies_cnpj_base_idx" ON "companies"("cnpj_base");
CREATE INDEX "companies_city_state_idx" ON "companies"("city", "state");
CREATE INDEX "companies_main_cnae_code_idx" ON "companies"("main_cnae_code");
CREATE INDEX "companies_registration_status_idx" ON "companies"("registration_status");
CREATE INDEX "companies_neighborhood_idx" ON "companies"("neighborhood");
CREATE INDEX "companies_company_size_code_idx" ON "companies"("company_size_code");

-- Full text search index on company name
CREATE INDEX "companies_company_name_trgm_idx" ON "companies" USING gin (company_name gin_trgm_ops);
-- Note: requires pg_trgm extension. Run: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- If not available, remove this index — the ILIKE queries will still work, just slower.
