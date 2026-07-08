# API Contract

## Overview

The Node/Express backend exposes an import endpoint that receives a CSV only after the user clicks **Confirm Import** in the Next.js frontend. The endpoint parses the file, sends rows to AI in batches, validates normalized CRM leads, skips invalid records, and returns structured JSON.

The preview step is frontend-only and must not call this endpoint unless the user confirms import.

## Endpoint

```text
POST /api/import/csv
```

## Request

Use `multipart/form-data`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | CSV file | Yes | The original CSV file selected by the user. |
| `data_source` | string | No | Optional default source to apply when AI cannot infer a valid value. Must be one of the allowed `data_source` values if provided. |

## Allowed Request Values

Allowed `data_source` values:

```json
[
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots"
]
```

## Success Response

Status:

```text
200 OK
```

Response body:

```json
{
  "success": true,
  "summary": {
    "totalRows": 25,
    "totalImported": 20,
    "totalSkipped": 5,
    "totalBatches": 3,
    "failedBatches": 0
  },
  "importedRecords": [
    {
      "source_row": 2,
      "created_at": "2026-07-07T16:30:00.000Z",
      "name": "Priya Sharma",
      "email": "priya@example.com",
      "country_code": "+91",
      "mobile_without_country_code": "9876543210",
      "company": "GrowEasy",
      "city": "Bengaluru",
      "state": "Karnataka",
      "country": "India",
      "lead_owner": "Unassigned",
      "crm_status": "GOOD_LEAD_FOLLOW_UP",
      "crm_note": "Additional emails: priya.work@example.com. Additional mobiles: 9988776655.",
      "data_source": "leads_on_demand",
      "possession_time": "",
      "description": "Interested in property details."
    }
  ],
  "skippedRecords": [
    {
      "source_row": 5,
      "reason": "Missing both email and mobile number",
      "raw_record": {
        "Name": "Unknown Lead",
        "Notes": "Asked for callback but gave no contact details"
      }
    }
  ],
  ]
}
```

Canonical response keys:

- `success`: true when the import request completed, including partial batch failures that were handled gracefully.
- `importedRecords`: valid normalized CRM leads.
- `skippedRecords`: rows skipped because they are empty, missing contact details, or unrecoverable.
- `summary.totalRows`: number of parsed data rows, including skipped empty rows.
- `summary.totalImported`: number of records in `importedRecords`.
- `summary.totalSkipped`: number of records in `skippedRecords`.
- `summary.totalBatches`: number of AI batches attempted.
- `summary.failedBatches`: number of AI batches that failed after retries.

## Lead Object

Every object in `importedRecords` must contain these fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `source_row` | number | Yes | Original CSV row number, counting the header as row 1. |
| `created_at` | string | Yes | ISO 8601 timestamp. |
| `name` | string | Yes | Empty string allowed if unknown. |
| `email` | string | Yes | First valid email, or empty string if mobile exists. |
| `country_code` | string | Yes | Include leading `+` when known, otherwise empty string. |
| `mobile_without_country_code` | string | Yes | First mobile number without country code, or empty string if email exists. |
| `company` | string | Yes | Empty string allowed if unknown. |
| `city` | string | Yes | Empty string allowed if unknown. |
| `state` | string | Yes | Empty string allowed if unknown. |
| `country` | string | Yes | Empty string allowed if unknown. |
| `lead_owner` | string | Yes | Use a sensible default such as `Unassigned` if absent. |
| `crm_status` | string | Yes | Must be an allowed status. |
| `crm_note` | string | Yes | Include extra emails, extra mobiles, uncertainty, and useful context. |
| `data_source` | string | Yes | Must be an allowed source. |
| `possession_time` | string | Yes | Empty string allowed if unknown. |
| `description` | string | Yes | Human-readable lead context. |

## Allowed Lead Values

Allowed `crm_status` values:

```json
[
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE"
]
```

Allowed `data_source` values:

```json
[
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots"
]
```

## Skipped Record Object

```json
{
  "source_row": 5,
  "reason": "Missing both email and mobile number",
  "raw_record": {
    "Name": "Unknown Lead"
  }
}
```

Skip records when:

- No email and no mobile number are present.
- The row is empty.
- AI output is unusable and deterministic recovery fails.

## Messy CSV To API Output Example

Input CSV:

```csv
Buyer Name,Contact Nos,mail,Interested Project,Place,Owner,Comment
Ravi Kumar,"+91-91234-56780, 93456 78901","ravi@example.com / ravi.alt@example.com",Eden Park,"Chennai, Tamil Nadu",Sneha,"Booked, wants possession by Dec"
No Contact Lead,,,Varah Swamy,,,No phone or email shared
```

Expected response excerpt:

```json
{
  "success": true,
  "summary": {
    "totalRows": 2,
    "totalImported": 1,
    "totalSkipped": 1,
    "totalBatches": 1,
    "failedBatches": 0
  },
  "importedRecords": [
    {
      "source_row": 2,
      "created_at": "2026-07-07T16:30:00.000Z",
      "name": "Ravi Kumar",
      "email": "ravi@example.com",
      "country_code": "+91",
      "mobile_without_country_code": "9123456780",
      "company": "",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "country": "India",
      "lead_owner": "Sneha",
      "crm_status": "SALE_DONE",
      "crm_note": "Additional emails: ravi.alt@example.com. Additional mobiles: 9345678901.",
      "data_source": "eden_park",
      "possession_time": "Dec",
      "description": "Booked, wants possession by Dec."
    }
  ],
  "skippedRecords": [
    {
      "source_row": 3,
      "reason": "Missing both email and mobile number",
      "raw_record": {
        "Buyer Name": "No Contact Lead",
        "Interested Project": "Varah Swamy",
        "Comment": "No phone or email shared"
      }
    }
  ]
}
```

## Error Object

```json
{
  "source_row": 9,
  "code": "AI_OUTPUT_INVALID",
  "message": "AI output could not be validated for this row."
}
```

Recommended error codes:

- `INVALID_FILE`
- `CSV_PARSE_ERROR`
- `EMPTY_CSV`
- `UNSUPPORTED_ENCODING`
- `AI_REQUEST_FAILED`
- `AI_OUTPUT_INVALID`
- `VALIDATION_FAILED`
- `UNKNOWN_ERROR`

## Failure Responses

### Invalid or Missing File

Status:

```text
400 Bad Request
```

Body:

```json
{
  "error": {
    "code": "INVALID_FILE",
    "message": "A valid CSV file is required."
  }
}
```

### AI Provider Failure

Status:

```text
502 Bad Gateway
```

Body:

```json
{
  "error": {
    "code": "AI_REQUEST_FAILED",
    "message": "The AI extraction service failed. Please retry the import."
  }
}
```

## Statelessness Requirement

The API must not require database state. `import_id` may be generated per request for traceability, but it must not imply persistence unless the project scope changes.
