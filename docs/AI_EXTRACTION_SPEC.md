# AI Extraction Spec

## Purpose

The AI model converts messy CSV lead rows into the strict GrowEasy CRM lead
format. AI extraction happens only after the user clicks **Confirm Import** in
the Next.js frontend and the Node/Express backend receives the CSV.

The AI must not be called during frontend CSV preview.

## Inputs To AI

The backend should send AI batches containing:

- Source row number.
- Raw row object, preserving original CSV headers.
- Optional default `data_source` from the request.
- The required CRM schema.
- Allowed enum values.
- Business rules for emails, mobiles, skipped records, and notes.

The frontend preview must never create this payload and must never call the AI model.

Example batch payload shape:

```json
{
  "records": [
    {
      "source_row": 2,
      "raw_record": {
        "Client Name": "Priya Sharma",
        "Contact": "+91 9876543210, 9988776655",
        "Email IDs": "priya@example.com; priya.work@example.com",
        "Project": "Sarjapur plots",
        "Remarks": "Interested in site visit next week"
      }
    }
  ],
  "default_data_source": "leads_on_demand"
}
```

## Required AI Output

The AI must return JSON only. No Markdown, explanations, comments, or prose.

Expected batch response shape:

```json
{
  "importedRecords": [
    {
      "rowIndex": 2,
      "created_at": "",
      "name": "Priya Sharma",
      "email": "priya@example.com",
      "country_code": "+91",
      "mobile_without_country_code": "9876543210",
      "company": "",
      "city": "",
      "state": "",
      "country": "India",
      "lead_owner": "",
      "crm_status": "GOOD_LEAD_FOLLOW_UP",
      "crm_note": "Additional emails: priya.work@example.com. Additional mobiles: 9988776655.",
      "data_source": "sarjapur_plots",
      "possession_time": "",
      "description": "Interested in site visit next week."
    }
  ],
  "skippedRecords": [
    {
      "rowIndex": 4,
      "reason": "Missing both email and mobile number"
    }
  ]
}
```

The backend converts AI `rowIndex` values into final API `source_row` values. The HTTP response uses `importedRecords` and `skippedRecords`.

## Required CRM Fields

The AI must produce every required field for each valid lead:

- `created_at`
- `name`
- `email`
- `country_code`
- `mobile_without_country_code`
- `company`
- `city`
- `state`
- `country`
- `lead_owner`
- `crm_status`
- `crm_note`
- `data_source`
- `possession_time`
- `description`

The backend should add or repair missing empty string fields where safe, but must reject or skip records that cannot satisfy core validity rules.

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

`data_source` may also be an empty string when no allowed source is confidently present and no valid default source is provided.

## Extraction Rules

### Contact Rules

- Extract all emails found in the row.
- Use the first valid email as `email`.
- Put additional emails in `crm_note`.
- Extract all mobile numbers found in the row.
- Use the first valid mobile as `mobile_without_country_code`.
- Put additional mobile numbers in `crm_note`.
- Split country code into `country_code` when possible.
- Store the mobile number without country code in `mobile_without_country_code`.
- Skip the record if no email and no mobile number can be found.

### Field Mapping Rules

- Map messy names such as `client`, `customer`, `lead name`, or `full_name` to `name`.
- Map company-like fields such as `organization`, `builder`, `firm`, or `business` to `company`.
- Map location fields into `city`, `state`, and `country` when possible.
- Map project/source clues to `data_source` only if they match one of the allowed values.
- Use request-level `default_data_source` when AI cannot infer a valid source.
- Use an empty string when no allowed source is confidently inferred and no valid default is provided.
- Do not default to `leads_on_demand` unless that source is explicitly present in the raw row or provided as a valid default.
- Extract `created_at` from raw date/time columns only when it is JavaScript Date-compatible; otherwise use an empty string.
- Use an empty string for `lead_owner` when no owner is present in the raw row.
- Use `GOOD_LEAD_FOLLOW_UP` as the default status for contactable, not-yet-converted leads.
- Use `SALE_DONE` only when the row clearly says the deal is sold, booked, closed, or converted.
- Use `BAD_LEAD` only when the row clearly says the lead is invalid, fake, duplicate, spam, or not interested.
- Use `DID_NOT_CONNECT` only when the row clearly says the team could not reach the lead.

### Messy Column Examples

| Messy CSV column                                               | Likely CRM target                                         |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| `Client Full Name`, `Buyer Name`, `Customer`, `Lead`           | `name`                                                    |
| `Phone / WhatsApp`, `Contact Nos`, `Mobile 1`, `Alt Number`    | `country_code`, `mobile_without_country_code`, `crm_note` |
| `Email IDs`, `mail`, `E-mail`, `Secondary Email`               | `email`, `crm_note`                                       |
| `Project Interested`, `Property`, `Campaign`, `Source Project` | `data_source`, `description`                              |
| `Current Location`, `Place`, `Address`, `City State`           | `city`, `state`, `country`                                |
| `Sales Person`, `Assigned To`, `Owner`                         | `lead_owner`                                              |
| `Remarks`, `Comment`, `Notes`, `Requirement`                   | `description`, `crm_note`, `crm_status`                   |
| `Possession`, `Move-in`, `Timeline`                            | `possession_time`                                         |

### Notes And Description Rules

- Preserve useful context from remarks, notes, requirements, budget, project interest, timeline, and source columns.
- Put extraction uncertainty in `crm_note`.
- Put additional emails and mobile numbers in `crm_note`.
- Keep `description` readable and concise.
- Do not invent facts that are not present in the row.

## Backend Validation After AI

The backend must validate AI output before returning it.

Validation must ensure:

- Output is parseable JSON.
- Each returned lead has a matching `rowIndex` that maps to a source CSV row.
- Every required CRM field exists.
- `crm_status` is one of the allowed values.
- `data_source` is an allowed value or an empty string.
- At least one of `email` or `mobile_without_country_code` is present.
- Extra emails and mobiles are represented in `crm_note` when detected.
- Invalid or unrepairable records are moved to `skippedRecords` or counted through failed batch handling.

## Batching Guidance

- Send rows to AI in batches rather than one large request.
- Preserve row order inside each batch.
- Choose a conservative batch size that avoids provider token limits.
- Retry transient provider failures when safe.
- If a batch fails after retries, mark affected rows in `skippedRecords` and increment `failedBatches` in the final summary.

## Prompt Requirements

The production prompt should instruct the model to:

- Return JSON only.
- Follow the exact response schema.
- Use only allowed enum values.
- Skip records with neither email nor mobile.
- Use the first email and first mobile as primary contact values.
- Put additional contact values into `crm_note`.
- Avoid hallucinating missing details.
- Preserve source row numbers exactly.

## Deterministic Safeguards

AI should help with messy mapping, but deterministic code should enforce final
correctness. The backend should independently detect obvious emails and phone
numbers where possible, compare them with AI output, and fix or reject
mismatches according to the business rules.

## End-To-End Extraction Example

Input record sent to AI:

```json
{
  "rowIndex": 8,
  "raw_record": {
    "Customer": "Ananya Rao",
    "WhatsApp/Mobile": "080-12345678, +91 90000 11122",
    "mail": "ananya@example.com, ananya.office@example.com",
    "Campaign": "Meridian Tower",
    "City State": "Hyderabad Telangana",
    "Owner": "",
    "Requirement": "Could not connect on first attempt, asked to retry tomorrow"
  }
}
```

Expected normalized AI record:

```json
{
  "rowIndex": 8,
  "created_at": "",
  "name": "Ananya Rao",
  "email": "ananya@example.com",
  "country_code": "+91",
  "mobile_without_country_code": "9000011122",
  "company": "",
  "city": "Hyderabad",
  "state": "Telangana",
  "country": "India",
  "lead_owner": "",
  "crm_status": "DID_NOT_CONNECT",
  "crm_note": "Additional emails: ananya.office@example.com. Additional phone value not used as primary mobile: 080-12345678.",
  "data_source": "meridian_tower",
  "possession_time": "",
  "description": "Could not connect on first attempt; retry tomorrow."
}
```
