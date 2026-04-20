# Inteligência Territorial — Supabase + Vercel

Dashboard de análise territorial de empresas brasileiras (dados Receita Federal),
rodando 100% na nuvem: **Supabase** (banco) + **Vercel** (app Next.js).

---

## Arquitetura

```
Seu computador (uma vez só)        Nuvem (sempre online)
────────────────────────────       ──────────────────────────────
data/input/                        Supabase (PostgreSQL)
Estabelecimentos*.csv   ──ETL───▶  tabela companies, cnaes, etc.
Empresas*.csv                               │
                                            ▼
                                   Vercel (Next.js)
                                   app acessível pelo mundo
```

---

## Passo 1 — Criar projeto no Supabase

1. Crie conta em [supabase.com](https://supabase.com) (gratuito)
2. **New project** → nome: `territorial-intel` → região: **South America (São Paulo)**
3. Aguarde ~2 minutos o banco inicializar
4. Vá em **Settings → Database** e copie as duas strings:
   - **Connection pooling** (porta 6543) → será `DATABASE_URL`
   - **Direct connection** (porta 5432) → será `DIRECT_URL`

---

## Passo 2 — Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
# Pooler Supabase (porta 6543) — usado pelo app Next.js
DATABASE_URL="postgresql://postgres.[REF]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direto Supabase (porta 5432) — usado pelo ETL e migrations
DIRECT_URL="postgresql://postgres.[REF]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

TARGET_CITY="PENHA"
TARGET_STATE="SC"
TARGET_CITY_IBGE="4212908"
GEOCODING_PROVIDER="nominatim"
NOMINATIM_EMAIL="seu@email.com"
GEOCODE_CITY_FALLBACK="true"
NEXT_PUBLIC_TARGET_CITY="PENHA"
```

> **Por que duas strings?** O app usa o pooler (escala para múltiplos usuários).
> O ETL usa conexão direta (o pooler não suporta transactions longas de importação).

---

## Passo 3 — Instalar e aplicar schema

```bash
npm install
npx prisma db push
```

Confirme que as tabelas apareceram no painel Supabase → Table Editor.

---

## Passo 4 — Baixar arquivos da Receita Federal

```
https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/
```

Baixe o mês mais recente e extraia em `data/input/`:

```
data/input/
├── Estabelecimentos0.csv   ← obrigatório
├── Empresas0.csv           ← obrigatório
├── Estabelecimentos1.csv   ← opcional (mais dados)
└── ...
```

> Dica: comece com apenas `Estabelecimentos0.zip` + `Empresas0.zip` para teste rápido.

---

## Passo 5 — Executar ETL (importação local → Supabase)

```bash
npm run etl:municipalities   # códigos IBGE de municípios
npm run etl:cnae             # tabela de CNAEs + segmentos
npm run etl:companies        # empresas da Receita Federal
npm run etl:geocode          # geocodificação de endereços

# OU tudo de uma vez:
npm run etl:all
```

Os scripts conectam direto no Supabase via `DIRECT_URL`.
Acompanhe os dados chegando no Table Editor do Supabase em tempo real.

---

## Passo 6 — Deploy no Vercel

### Via GitHub (recomendado)

```bash
git init
git add .
git commit -m "feat: territorial intel - supabase + vercel"
git remote add origin https://github.com/SEU_USUARIO/territorial-intel.git
git push -u origin main
```

1. Acesse [vercel.com](https://vercel.com) → **New Project** → importe o repositório
2. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |----------|-------|
   | `DATABASE_URL` | string do pooler Supabase (porta 6543) |
   | `DIRECT_URL` | string direta Supabase (porta 5432) |
   | `NEXT_PUBLIC_TARGET_CITY` | `PENHA` |

3. Clique **Deploy** → em ~2 minutos seu app estará online

---

## Passo 7 — Acessar o app

A URL do Vercel (ex: `https://territorial-intel.vercel.app`):

- `/dashboard` → KPIs e gráficos
- `/mapa` → mapa interativo
- `/empresas` → tabela paginada
- `/admin` → status dos jobs ETL

---

## Limites gratuitos

| Serviço | Limite free |
|---------|------------|
| Supabase | 500 MB banco, 2 GB bandwidth/mês |
| Vercel | 100 GB bandwidth, deploys ilimitados |

Para Penha/SC isso é mais que suficiente para o MVP.

---

## Troubleshooting

**`prepared statement already exists`**
→ A `DATABASE_URL` do pooler precisa ter `?pgbouncer=true&connection_limit=1` no final.

**ETL com timeout**
→ Certifique-se de que `DIRECT_URL` está no `.env.local`. O ETL usa ela automaticamente.

**Vercel: `Can't reach database`**
→ Verifique as env vars no painel Vercel → Settings → Environment Variables → Redeploy.

**Geocodificação retorna poucos resultados**
→ Normal para Nominatim em cidades pequenas. Com `GEOCODE_CITY_FALLBACK=true` todas as
empresas aparecem no mapa com coordenadas aproximadas do centro da cidade.
