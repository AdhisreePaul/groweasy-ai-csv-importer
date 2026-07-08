# Edge Cases

## Preview And Import Flow

| Edge case | Expected behavior |
| --- | --- |
| User selects a valid CSV | Show raw preview in the browser. Do not call AI. |
| User selects a non-CSV file | Show a frontend validation error. Do not call backend import. |
| User previews but never confirms | No backend import and no AI call. |
| User clicks Confirm Import | Send CSV from the Next.js frontend to the Node/Express backend and start import. |
| User changes file after preview | Clear previous preview and results. Require confirmation for the new file. |

## CSV Structure

| Edge case | Expected behavior |
| --- | --- |
| Empty CSV | Return a clear `EMPTY_CSV` or validation error. |
| Header-only CSV | Return zero imported leads and zero or more skipped records. |
| Missing headers | Parse if possible, but report a clear error if rows cannot be represented. |
| Duplicate headers | Preserve values safely and avoid silent data loss. |
| Extra columns | Keep them in raw records for AI context. |
| Unknown column names | Let AI infer meaning from names and values. |
| Quoted commas | Parse correctly as one field. |
| Newlines inside quoted fields | Parse correctly as part of the field. |
| Blank rows | Skip them. |
| Very large CSV | Enforce documented file size and row limits once implementation begins. |
| Different encodings | Prefer UTF-8; return `UNSUPPORTED_ENCODING` when unreadable. |

## Contact Details

| Edge case | Expected behavior |
| --- | --- |
| No email and no mobile | Skip record. |
| Email only | Import lead with empty mobile fields. |
| Mobile only | Import lead with empty email. |
| Multiple emails | Use first email as `email`; add the rest to `crm_note`. |
| Multiple mobiles | Use first mobile as `mobile_without_country_code`; add the rest to `crm_note`. |
| Phone includes country code | Split into `country_code` and `mobile_without_country_code` when possible. |
| Phone has spaces or hyphens | Normalize mobile digits while preserving meaning. |
| Invalid email format | Do not use invalid value as primary email. Keep context in `crm_note` if useful. |
| Extension or landline number | Prefer mobile if available; otherwise include useful details in `crm_note`. |

## CRM Field Mapping

| Edge case | Expected behavior |
| --- | --- |
| Missing name | Import if email or mobile exists; set `name` to empty string. |
| Missing company | Set `company` to empty string. |
| Missing city, state, or country | Set unknown location fields to empty string. |
| Ambiguous location | Put uncertainty in `crm_note`. |
| Unknown lead owner | Set `lead_owner` to empty string. |
| Unknown possession time | Set `possession_time` to empty string. |
| Long notes | Keep useful context but avoid excessive repetition. |

## Messy Column Examples

| Messy input row | Expected behavior |
| --- | --- |
| `Client Full Name=Priya Sharma`, `Phone / WhatsApp=+91 98765 43210 / 99887 76655`, `Email IDs=priya@example.com; priya.work@example.com` | Import one lead, use `priya@example.com`, use `9876543210`, put the second email and second mobile in `crm_note`. |
| `Buyer Name=Ravi Kumar`, `Contact Nos=+91-91234-56780, 93456 78901`, `mail=ravi@example.com / ravi.alt@example.com`, `Comment=Booked` | Import one `SALE_DONE` lead and put extra contact values in `crm_note`. |
| `Customer=Ananya Rao`, `WhatsApp/Mobile=080-12345678, +91 90000 11122`, `Requirement=Could not connect` | Prefer the mobile number as primary contact and map status to `DID_NOT_CONNECT`. |
| `Lead=Unknown`, `Project=Varah Swamy`, `Notes=Asked for callback but gave no contact details` | Skip because both email and mobile are missing. |

## Sample CSV Demo Files

All sample files use fake names, fake emails, and fake phone numbers. They are intentionally small enough for manual demo testing while still covering the assignment's messy import formats.

| File | Format simulated | Edge cases included | Expected behavior |
| --- | --- | --- | --- |
| `samples/facebook-leads.csv` | Facebook Lead Export | Facebook-style IDs, ad names, project source, ambiguous status, multiple emails and phones, skipped no-contact row | Import the contactable Facebook rows, infer `meridian_tower` or `eden_park`, preserve extra contacts in `crm_note`, skip the no-contact row. |
| `samples/google-ads-leads.csv` | Google Ads lead export | Click ID, campaign names, property interest, ambiguous stage, multiple contact values, skipped form-extension row | Import rows with email or mobile, map converted row to `SALE_DONE`, map no-answer text to `DID_NOT_CONNECT` where present, skip the row without contact details. |
| `samples/real-estate-crm.csv` | Real estate CRM export | Buyer-centric columns, possession timeline, builder, project, status text, multiple contacts, skipped walk-in row | Normalize project/source, city/state, possession time, owner, and notes; keep secondary email/mobile in `crm_note`; skip missing-contact buyer. |
| `samples/messy-manual-sheet.csv` | Manually created spreadsheet | Extra spaces in headers and cells, informal status, mixed separators, source field, no-contact row | Trim messy values, infer contacts from flexible columns, fall back ambiguous status to `GOOD_LEAD_FOLLOW_UP`, skip the row with no contact. |
| `samples/invalid-records.csv` | Bad lead and invalid contact sheet | Invalid email text, unusable phone text, property source, ambiguous disposition, one valid recovery row | Skip rows with neither usable email nor mobile, import the recovery row, keep useful context in notes/description. |
| `samples/multiple-contacts.csv` | Marketing or agency contact export | Separate email columns, many phones, landline-like value, property source, skipped no-contact row | Use the first email and first mobile as primary values, move additional contacts to `crm_note`, skip the row with no email or mobile. |

## Status Mapping

| Input clue | Expected `crm_status` |
| --- | --- |
| Interested, follow up, callback, visit planned | `GOOD_LEAD_FOLLOW_UP` |
| Did not answer, unreachable, not picking up | `DID_NOT_CONNECT` |
| Fake, spam, duplicate, invalid, not interested | `BAD_LEAD` |
| Sold, booked, closed, converted | `SALE_DONE` |
| Unclear status | `GOOD_LEAD_FOLLOW_UP` |

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

| Edge case | Expected behavior |
| --- | --- |
| AI returns prose around JSON | Attempt safe JSON extraction only if reliable; otherwise fail the batch. |
| AI omits required fields | Fill safe empty-string fields or reject the row. |
| AI returns invalid enum value | Normalize only if there is an obvious allowed match; otherwise use fallback or reject. |
| AI invents contact details | Prefer deterministic extraction from raw row and correct or reject. |
| AI skips a contactable row | Backend should detect obvious email or mobile and retry or mark an error. |
| AI returns duplicate source rows | Deduplicate by `source_row` and report inconsistencies. |

## API And Runtime

| Edge case | Expected behavior |
| --- | --- |
| Missing file upload | Return `400 INVALID_FILE`. |
| CSV parser error | Return `400 CSV_PARSE_ERROR`. |
| AI provider timeout | Retry when safe, then return `502 AI_REQUEST_FAILED` if unresolved. |
| Partial batch failure | Return imported leads from successful batches and errors for failed rows if implementation supports partial success. |
| Unexpected exception | Return a sanitized `UNKNOWN_ERROR` response. |

The response should keep `total_imported` equal to the number of `imported_records` and `total_skipped` equal to the number of `skipped_records`.

## Security And Privacy

- Do not persist uploaded files.
- Do not persist AI responses.
- Do not log full lead data in production logs.
- Sanitize error messages before returning them.
- Validate file size before processing.
- Treat CSV content and AI output as untrusted input.
