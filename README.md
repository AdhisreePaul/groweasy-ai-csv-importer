# GrowEasy AI CSV Importer

AI-powered CSV importer built for the GrowEasy Software Developer Intern
assignment. Users can upload any valid CSV, preview the raw rows first, and only
after **Confirm Import** send the file to the backend for OpenAI-powered lead
extraction into GrowEasy CRM records.

## Features

- Raw CSV preview in the browser before backend processing.
- AI processing starts only after **Confirm Import**.
- Express backend parses CSV files and sends rows to OpenAI in batches.
- Uses `gpt-4.1-nano` with strict JSON validation before returning data.
- Shows imported records, skipped records, total imported, and total skipped.
- Skips rows only when both email and mobile number are missing.
- Stateless TypeScript monorepo with no database.

## Tech Stack

- `pnpm` workspaces
- Next.js, React, TypeScript, Tailwind CSS
- Node.js, Express, TypeScript
- Zod schemas and shared TypeScript types
- OpenAI Node SDK

## Environment

Backend: `apps/api/.env`

```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
AI_PROVIDER=openai
OPENAI_MODEL=gpt-4.1-nano
OPENAI_API_KEY=your_openai_api_key_here
BATCH_SIZE=25
AI_MAX_RETRIES=2
MAX_FILE_SIZE_MB=5
```

Frontend: `apps/web/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

`OPENAI_API_KEY` is backend-only. Do not expose it through frontend or `NEXT_PUBLIC_*` variables.

## Run Locally

```bash
npx pnpm@latest install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npx pnpm@latest dev
```

PowerShell users can copy env files with:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Open `http://localhost:3000`. Backend health is available at `http://localhost:4000/health`.

## Import Flow

1. Upload or drag in a CSV file.
2. Review the raw CSV preview locally.
3. Click **Confirm Import**.
4. Backend parses the CSV, batches rows, and calls OpenAI.
5. Valid CRM records are returned as imported records.
6. Rows without email and mobile are returned as skipped records with reasons.

## Sample CSVs

Demo files are available in `samples/`, including Facebook leads, Google Ads
leads, real estate CRM exports, messy manual sheets, invalid records, and
multiple-contact examples.

## Submission

Position applied for: Software Developer Intern
