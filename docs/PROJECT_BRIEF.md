# Project Brief

## Summary

GrowEasy AI CSV Importer is a stateless monorepo app for importing messy lead CSV files into a clean GrowEasy CRM JSON format.

The assignment target stack is:

- `apps/web`: responsive Next.js frontend written in TypeScript.
- `apps/api`: Node.js and Express backend written in TypeScript.
- `packages/shared`: shared TypeScript types, enums, and schemas.

The required user flow is:

1. User selects or uploads any valid CSV file in the web app.
2. The web app parses enough on the client to show a raw CSV preview.
3. No AI call happens during preview.
4. User clicks **Confirm Import**.
5. The web app sends the CSV file to the backend.
6. The backend parses rows, batches records, calls the AI model, validates and normalizes output, skips invalid records, and returns structured JSON.

## Assignment Goals

- Support arbitrary valid CSV files, including files with messy or unexpected column names.
- Preserve a raw preview step before backend import.
- Use AI only for confirmed imports.
- Convert unstructured lead data into a strict GrowEasy CRM schema.
- Skip records that cannot be contacted because they have neither email nor mobile.
- Keep the application stateless and easy to run locally.
- Use TypeScript across the monorepo.

## Out Of Scope

- Database persistence.
- Authentication.
- Background jobs or queues.
- CRM writeback.
- Editing imported leads after AI processing.
- Calling AI while the user is previewing the CSV.

## Monorepo Structure

```text
apps/
  web/
    # Next.js CSV upload, raw preview, confirm import, results UI
  api/
    # Node/Express import endpoint, CSV parsing, AI batching, validation
packages/
  shared/
    # Shared TypeScript types, enums, schemas, constants
docs/
  # Planning, contracts, AI spec, edge cases
samples/
  # Example CSV files for manual testing
```

## Frontend Responsibilities

- Accept CSV file selection.
- Use a responsive Next.js interface that works on desktop and mobile.
- Validate that the selected file is a CSV-like file before preview.
- Read and display raw CSV rows client-side.
- Make it visually clear that preview is not an import.
- Enable **Confirm Import** after a valid preview is available.
- Send the original CSV file to the backend only after confirmation.
- Render the backend's structured response, including imported leads, skipped records, and errors.

## Backend Responsibilities

- Accept a confirmed CSV upload.
- Use Node.js and Express for the API server.
- Parse the CSV server-side.
- Preserve source row numbers for traceability.
- Normalize incoming rows into batch payloads for AI.
- Call the AI model in batches.
- Validate AI output against the required CRM schema.
- Apply deterministic business rules after AI extraction.
- Skip records with neither email nor mobile.
- Return structured JSON with counts, valid leads, skipped records, and import errors.

## Shared Package Responsibilities

- Export CRM field types.
- Export allowed enum values for `crm_status` and `data_source`.
- Export API request and response types.
- Export validation schemas once implementation begins.

## Required CRM Lead Shape

Each valid lead returned by the API must include:

```text
created_at
name
email
country_code
mobile_without_country_code
company
city
state
country
lead_owner
crm_status
crm_note
data_source
possession_time
description
```

## Allowed Values

Allowed `crm_status` values:

- `GOOD_LEAD_FOLLOW_UP`
- `DID_NOT_CONNECT`
- `BAD_LEAD`
- `SALE_DONE`

Allowed `data_source` values:

- `leads_on_demand`
- `meridian_tower`
- `eden_park`
- `varah_swamy`
- `sarjapur_plots`

## Key Business Rules

- Do not call AI during CSV preview.
- Call AI only after **Confirm Import**.
- Skip records with neither email nor mobile number.
- If multiple emails exist, use the first email and put the rest in `crm_note`.
- If multiple mobile numbers exist, use the first mobile and put the rest in `crm_note`.
- Treat AI output as a draft that must be validated and normalized before returning.
- Keep the project stateless.

## Example Messy Input And Normalized Output

Example messy CSV columns:

```csv
Client Full Name,Phone / WhatsApp,Email IDs,Project Interested,Current Location,Sales Person,Lead Notes
Priya Sharma,"+91 98765 43210 / 99887 76655","priya@example.com; priya.work@example.com",Sarjapur Plots,"Bengaluru, Karnataka",Amit,"Interested in site visit next week"
Unknown Lead,,,Meridian Tower,,,"Asked for callback but gave no contact details"
```

Expected normalized valid lead from the first row:

```json
{
  "source_row": 2,
  "created_at": "2026-07-07T16:30:00.000Z",
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "country_code": "+91",
  "mobile_without_country_code": "9876543210",
  "company": "",
  "city": "Bengaluru",
  "state": "Karnataka",
  "country": "India",
  "lead_owner": "Amit",
  "crm_status": "GOOD_LEAD_FOLLOW_UP",
  "crm_note": "Additional emails: priya.work@example.com. Additional mobiles: 9988776655.",
  "data_source": "sarjapur_plots",
  "possession_time": "",
  "description": "Interested in site visit next week."
}
```

Expected skipped record from the second row:

```json
{
  "source_row": 3,
  "reason": "Missing both email and mobile number"
}
```

## Recommended Architecture

```text
Browser
  -> local raw CSV preview
  -> Confirm Import
API
  -> upload validation
  -> CSV parsing
  -> row preparation
  -> AI batch extraction
  -> deterministic validation and normalization
  -> structured JSON response
```

This keeps preview fast and safe while ensuring the backend owns the trusted import path.
