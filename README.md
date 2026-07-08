# GrowEasy AI CSV Importer

TypeScript monorepo for the GrowEasy AI-powered CSV importer assignment.

## Stack

- `apps/web`: Next.js, TypeScript, Tailwind CSS
- `apps/api`: Node.js, Express, TypeScript
- `packages/shared`: shared CRM constants, schemas, and types
- `samples`: CSV files for manual testing
- `docs`: assignment brief, contracts, AI extraction rules, edge cases, and task plan

## Local Setup

Install pnpm if needed:

```bash
npm install -g pnpm
```

Install dependencies:

```bash
pnpm install
```

Copy environment examples on macOS/Linux:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Or on Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Start both apps:

```bash
pnpm dev
```

Or start them separately:

```bash
pnpm dev:web
pnpm dev:api
```

Default local URLs:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`

The dev scripts build `packages/shared` first so the web and API work from a clean checkout.

## Root Scripts

- `pnpm dev`: run web and API dev servers
- `pnpm build`: build every workspace package
- `pnpm lint`: lint every workspace package
- `pnpm typecheck`: run TypeScript checks
- `pnpm test`: run tests

## Bonus Features

- Drag-and-drop CSV upload with local validation.
- Dark mode toggle in the app header.
- Virtualized raw CSV preview for large files.
- Import progress indicator with accessible progress state.
- Retry button for failed frontend import requests.
- Backend AI batch retry through `AI_BATCH_RETRY_LIMIT`.
- Full imported/skipped CRM result tables with JSON copy/export.
- Backend Dockerfile for containerized mock-mode demos.

## Backend Docker

Build the backend image from the repository root:

```bash
docker build -f apps/api/Dockerfile -t groweasy-ai-csv-api .
```

Run it in mock AI mode:

```bash
docker run --rm -p 4000:4000 \
  -e CORS_ORIGIN=http://localhost:3000 \
  -e AI_PROVIDER=mock \
  groweasy-ai-csv-api
```

PowerShell equivalent:

```powershell
docker run --rm -p 4000:4000 `
  -e CORS_ORIGIN=http://localhost:3000 `
  -e AI_PROVIDER=mock `
  groweasy-ai-csv-api
```

For a real provider, keep API keys on the backend container only. Do not expose them through `NEXT_PUBLIC_*` variables.

## Sample CSVs

Use the files in `samples/` to test preview and confirmed import in mock mode:

- `samples/facebook-leads.csv`
- `samples/google-ads-leads.csv`
- `samples/real-estate-crm.csv`
- `samples/messy-manual-sheet.csv`
- `samples/invalid-records.csv`
- `samples/multiple-contacts.csv`

Recommended local demo:

1. Set `AI_PROVIDER=mock` in `apps/api/.env`.
2. Start the app with `pnpm dev`.
3. Open `http://localhost:3000`.
4. Upload one sample CSV and inspect the raw preview.
5. Click **Confirm import** to send the original CSV to the backend.
6. Review imported records, skipped records, totals, and exported JSON.

The preview step is browser-only. The backend and mock AI provider run only after **Confirm import**.

## Important Rules

- The frontend preview must not call AI.
- AI may be called only after **Confirm Import**.
- Backend secrets belong only in `apps/api/.env`.
- Do not expose AI provider keys through `NEXT_PUBLIC_*` variables.
- The project should remain stateless unless the assignment scope changes.
