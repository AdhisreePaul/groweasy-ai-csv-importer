# Edge Cases

## Preview And Import Flow

| Edge case                        | Expected behavior                                                                |
| -------------------------------- | -------------------------------------------------------------------------------- |
| User selects a valid CSV         | Show raw preview in the browser. Do not call AI.                                 |
| User selects a non-CSV file      | Show a frontend validation error. Do not call backend import.                    |
| User previews but never confirms | No backend import and no AI call.                                                |
| User clicks Confirm Import       | Send CSV from the Next.js frontend to the Node/Express backend and start import. |
| User changes file after preview  | Clear previous preview and results. Require confirmation for the new file.       |

## CSV Structure

| Edge case                     | Expected behavior                                                          |
| ----------------------------- | -------------------------------------------------------------------------- |
| Empty CSV                     | Return a clear `EMPTY_CSV` or validation error.                            |
| Header-only CSV               | Return zero imported leads and zero or more skipped records.               |
| Missing headers               | Parse if possible, but report a clear error if rows cannot be represented. |
| Duplicate headers             | Preserve values safely and avoid silent data loss.                         |
| Extra columns                 | Keep them in raw records for AI context.                                   |
| Unknown column names          | Let AI infer meaning from names and values.                                |
| Quoted commas                 | Parse correctly as one field.                                              |
| Newlines inside quoted fields | Parse correctly as part of the field.                                      |
| Blank rows                    | Skip them.                                                                 |
| Very large CSV                | Enforce documented file size and row limits once implementation begins.    |
| Different encodings           | Prefer UTF-8; return `UNSUPPORTED_ENCODING` when unreadable.               |

## Contact Details

| Edge case                    | Expected behavior                                                                |
| ---------------------------- | -------------------------------------------------------------------------------- |
| No email and no mobile       | Skip record.                                                                     |
| Email only                   | Import lead with empty mobile fields.                                            |
| Mobile only                  | Import lead with empty email.                                                    |
| Multiple emails              | Use first email as `email`; add the rest to `crm_note`.                          |
| Multiple mobiles             | Use first mobile as `mobile_without_country_code`; add the rest to `crm_note`.   |
| Phone includes country code  | Split into `country_code` and `mobile_without_country_code` when possible.       |
| Phone has spaces or hyphens  | Normalize mobile digits while preserving meaning.                                |
| Invalid email format         | Do not use invalid value as primary email. Keep context in `crm_note` if useful. |
| Extension or landline number | Prefer mobile if available; otherwise include useful details in `crm_note`.      |

## CRM Field Mapping

| Edge case                       | Expected behavior                                             |
| ------------------------------- | ------------------------------------------------------------- |
| Missing name                    | Import if email or mobile exists; set `name` to empty string. |
| Missing company                 | Set `company` to empty string.                                |
| Missing city, state, or country | Set unknown location fields to empty string.                  |
| Ambiguous location              | Put uncertainty in `crm_note`.                                |
| Unknown lead owner              | Set `lead_owner` to empty string.                             |
| Unknown possession time         | Set `possession_time` to empty string.                        |
| Long notes                      | Keep useful context but avoid excessive repetition.           |

## Messy Column Examples

- Input: `Client Full Name=Priya Sharma`,
  `Phone / WhatsApp=+91 98765 43210 / 99887 76655`,
  `Email IDs=priya@example.com; priya.work@example.com`.
  Expected: import one lead, use `priya@example.com`, use `9876543210`, and put
  the second email and second mobile in `crm_note`.
- Input: `Buyer Name=Ravi Kumar`,
  `Contact Nos=+91-91234-56780, 93456 78901`,
  `mail=ravi@example.com / ravi.alt@example.com`, `Comment=Booked`.
  Expected: import one `SALE_DONE` lead and put extra contact values in
  `crm_note`.
- Input: `Customer=Ananya Rao`, `WhatsApp/Mobile=080-12345678, +91 90000 11122`,
  `Requirement=Could not connect`.
  Expected: prefer the mobile number as primary contact and map status to
  `DID_NOT_CONNECT`.
- Input: `Lead=Unknown`, `Project=Varah Swamy`,
  `Notes=Asked for callback but gave no contact details`.
  Expected: skip because both email and mobile are missing.

## Sample CSV Demo Files

All sample files use fake names, fake emails, and fake phone numbers. They are
small enough for manual demo testing while still covering the assignment's messy
import formats.

- `samples/facebook-leads.csv`: Facebook Lead Export with IDs, ad names,
  project source, ambiguous status, multiple contacts, and a skipped
  no-contact row.
- `samples/google-ads-leads.csv`: Google Ads export with click IDs, campaign
  names, property interest, ambiguous stage, multiple contacts, and a skipped
  form-extension row.
- `samples/real-estate-crm.csv`: real estate CRM export with buyer-centric
  columns, possession timeline, builder, project, status text, multiple
  contacts, and a skipped walk-in row.
- `samples/messy-manual-sheet.csv`: manual spreadsheet with extra spaces,
  informal status, mixed separators, source field, and a no-contact row.
- `samples/invalid-records.csv`: invalid contact sheet with invalid email text,
  unusable phone text, property source, ambiguous disposition, and one valid
  recovery row.
- `samples/multiple-contacts.csv`: marketing contact export with separate email
  columns, many phones, a landline-like value, property source, and a skipped
  no-contact row.

## Status Mapping

| Input clue                                     | Expected `crm_status` |
| ---------------------------------------------- | --------------------- |
| Interested, follow up, callback, visit planned | `GOOD_LEAD_FOLLOW_UP` |
| Did not answer, unreachable, not picking up    | `DID_NOT_CONNECT`     |
| Fake, spam, duplicate, invalid, not interested | `BAD_LEAD`            |
| Sold, booked, closed, converted                | `SALE_DONE`           |
| Unclear status                                 | `GOOD_LEAD_FOLLOW_UP` |

## Data Source Mapping

Only these values are allowed:

- `leads_on_demand`
- `meridian_tower`
- `eden_park`
- `varah_swamy`
- `sarjapur_plots`

Expected behavior:

- Use a matching source when the CSV clearly references one.
- Use request-level default `data_source` when provided and valid.
- Use an empty string when no source matches confidently.
- Never return a source outside the allowed list or empty string.

## AI Output Problems

| Edge case                        | Expected behavior                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| AI returns prose around JSON     | Attempt safe JSON extraction only if reliable; otherwise fail the batch.               |
| AI omits required fields         | Fill safe empty-string fields or reject the row.                                       |
| AI returns invalid enum value    | Normalize only if there is an obvious allowed match; otherwise use fallback or reject. |
| AI invents contact details       | Prefer deterministic extraction from raw row and correct or reject.                    |
| AI skips a contactable row       | Backend should detect obvious email or mobile and retry or mark an error.              |
| AI returns duplicate source rows | Deduplicate by `source_row` and report inconsistencies.                                |

## API And Runtime

| Edge case             | Expected behavior                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Missing file upload   | Return `400 INVALID_FILE`.                                                                                           |
| CSV parser error      | Return `400 CSV_PARSE_ERROR`.                                                                                        |
| AI provider timeout   | Retry when safe, then return `502 AI_REQUEST_FAILED` if unresolved.                                                  |
| Partial batch failure | Return imported leads from successful batches and errors for failed rows if implementation supports partial success. |
| Unexpected exception  | Return a sanitized `UNKNOWN_ERROR` response.                                                                         |

The response should keep `total_imported` equal to the number of `imported_records` and `total_skipped` equal to the number of `skipped_records`.

## Security And Privacy

- Do not persist uploaded files.
- Do not persist AI responses.
- Do not log full lead data in production logs.
- Sanitize error messages before returning them.
- Validate file size before processing.
- Treat CSV content and AI output as untrusted input.
