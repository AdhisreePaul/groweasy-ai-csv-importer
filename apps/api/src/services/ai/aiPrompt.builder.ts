import { CRM_FIELDS, CRM_STATUSES, DATA_SOURCES } from "@groweasy/shared";
import type { AiBatchRequest, AiPromptMessages } from "./aiProvider.interface.js";

export const AI_SYSTEM_PROMPT = [
  "You are a deterministic CRM data extraction engine for GrowEasy.",
  "Convert messy CSV lead rows into the exact GrowEasy CRM JSON contract.",
  "Return JSON only.",
  "Do not output Markdown.",
  "Do not output explanations.",
  "Do not invent facts.",
  "Use only the allowed enum values supplied by the user prompt.",
  "Leave unknown CRM fields as empty strings.",
  "Leave data_source as an empty string when no source matches confidently.",
  "Skip records that have neither email nor mobile number.",
  "Preserve rowIndex exactly for every imported or skipped record."
].join(" ");

export function buildAiExtractionPrompt(
  batchId: string,
  request: AiBatchRequest
): AiPromptMessages {
  const promptPayload = {
    batchId,
    rawRecords: request.records.map((record) => ({
      rowIndex: record.source_row,
      rawRecord: record.raw_record
    })),
    defaultDataSource: request.default_data_source ?? "",
    requiredFields: CRM_FIELDS,
    allowedCrmStatusValues: CRM_STATUSES,
    allowedDataSourceValues: DATA_SOURCES,
    outputContract: {
      importedRecords: [
        {
          rowIndex: "number",
          created_at: "string",
          name: "string",
          email: "string",
          country_code: "string",
          mobile_without_country_code: "string",
          company: "string",
          city: "string",
          state: "string",
          country: "string",
          lead_owner: "string",
          crm_status: "GOOD_LEAD_FOLLOW_UP | DID_NOT_CONNECT | BAD_LEAD | SALE_DONE",
          crm_note: "string",
          data_source:
            "leads_on_demand | meridian_tower | eden_park | varah_swamy | sarjapur_plots | empty string",
          possession_time: "string",
          description: "string"
        }
      ],
      skippedRecords: [
        {
          rowIndex: "number",
          reason: "string"
        }
      ]
    }
  };

  return {
    system: AI_SYSTEM_PROMPT,
    user: [
      "Extract GrowEasy CRM leads from this CSV batch.",
      "",
      "Rules:",
      "- Return one strict JSON object only with top-level keys importedRecords and skippedRecords.",
      "- Do not wrap the JSON in Markdown fences.",
      "- Do not include explanations, comments, prose, or extra top-level keys.",
      "- Every imported record must include rowIndex plus every required CRM field.",
      "- Use the exact required CRM field names and no unsupported CRM fields.",
      "- Leave unknown values as empty strings.",
      "- Do not invent unsupported crm_status or data_source values.",
      "- crm_status must be one of the allowedCrmStatusValues.",
      "- data_source must be one of the allowedDataSourceValues or an empty string.",
      "- If data_source cannot be inferred confidently, use defaultDataSource only when it is provided and valid; otherwise use an empty string.",
      "- Do not default data_source to leads_on_demand unless it is explicitly present in the raw record or provided as defaultDataSource.",
      "- If created_at is absent or cannot be parsed into a JavaScript Date-compatible value, use an empty string.",
      "- If lead_owner is absent, use an empty string.",
      "- Skip rows with neither email nor mobile number.",
      "- For multiple emails, use the first valid email as email and place the remaining emails in crm_note.",
      "- For multiple mobile numbers, use the first valid mobile as mobile_without_country_code and place remaining mobiles in crm_note.",
      "- Split country code into country_code when possible; store the mobile without country code.",
      "- Preserve rowIndex exactly for importedRecords and skippedRecords.",
      "- Put extraction uncertainty, extra contact values, and useful raw context in crm_note.",
      "- Keep description concise and based only on the raw record.",
      "",
      "Status mapping hints:",
      "- Interested, follow up, callback, visit planned -> GOOD_LEAD_FOLLOW_UP",
      "- Did not answer, unreachable, not picking up, could not connect -> DID_NOT_CONNECT",
      "- Fake, spam, duplicate, invalid, not interested -> BAD_LEAD",
      "- Sold, booked, closed, converted -> SALE_DONE",
      "",
      "Few-shot examples:",
      JSON.stringify(FEW_SHOT_EXAMPLES, null, 2),
      "",
      "Batch payload:",
      JSON.stringify(promptPayload, null, 2)
    ].join("\n")
  };
}

export const FEW_SHOT_EXAMPLES = [
  {
    name: "Facebook leads",
    input: {
      rowIndex: 12,
      rawRecord: {
        "Full name": "Neha Iyer",
        "Email": "neha@example.com",
        "Phone number": "+91 98765 11122",
        "City": "Bengaluru",
        "Ad name": "Eden Park FB Lead Form",
        "Message": "Please call tomorrow"
      }
    },
    output: {
      importedRecords: [
        {
          rowIndex: 12,
          created_at: "",
          name: "Neha Iyer",
          email: "neha@example.com",
          country_code: "+91",
          mobile_without_country_code: "9876511122",
          company: "",
          city: "Bengaluru",
          state: "",
          country: "India",
          lead_owner: "",
          crm_status: "GOOD_LEAD_FOLLOW_UP",
          crm_note: "",
          data_source: "eden_park",
          possession_time: "",
          description: "Please call tomorrow."
        }
      ],
      skippedRecords: []
    }
  },
  {
    name: "Real estate lead sheet",
    input: {
      rowIndex: 21,
      rawRecord: {
        "Buyer Name": "Ravi Kumar",
        "Contact Nos": "+91-91234-56780, 93456 78901",
        "mail": "ravi@example.com / ravi.alt@example.com",
        "Interested Project": "Eden Park",
        "Place": "Chennai, Tamil Nadu",
        "Owner": "Sneha",
        "Comment": "Booked, wants possession by Dec"
      }
    },
    output: {
      importedRecords: [
        {
          rowIndex: 21,
          created_at: "",
          name: "Ravi Kumar",
          email: "ravi@example.com",
          country_code: "+91",
          mobile_without_country_code: "9123456780",
          company: "",
          city: "Chennai",
          state: "Tamil Nadu",
          country: "India",
          lead_owner: "Sneha",
          crm_status: "SALE_DONE",
          crm_note:
            "Additional emails: ravi.alt@example.com. Additional mobiles: 9345678901.",
          data_source: "eden_park",
          possession_time: "Dec",
          description: "Booked, wants possession by Dec."
        }
      ],
      skippedRecords: []
    }
  },
  {
    name: "Manually created messy sheet",
    input: {
      rowIndex: 8,
      rawRecord: {
        "Customer": "Ananya Rao",
        "WhatsApp/Mobile": "080-12345678, +91 90000 11122",
        "mail": "ananya@example.com, ananya.office@example.com",
        "Campaign": "Meridian Tower",
        "City State": "Hyderabad Telangana",
        "Owner": "",
        "Requirement": "Could not connect on first attempt, retry tomorrow"
      }
    },
    output: {
      importedRecords: [
        {
          rowIndex: 8,
          created_at: "",
          name: "Ananya Rao",
          email: "ananya@example.com",
          country_code: "+91",
          mobile_without_country_code: "9000011122",
          company: "",
          city: "Hyderabad",
          state: "Telangana",
          country: "India",
          lead_owner: "",
          crm_status: "DID_NOT_CONNECT",
          crm_note:
            "Additional emails: ananya.office@example.com. Additional phone value not used as primary mobile: 080-12345678.",
          data_source: "meridian_tower",
          possession_time: "",
          description: "Could not connect on first attempt; retry tomorrow."
        }
      ],
      skippedRecords: []
    }
  },
  {
    name: "Invalid row with no contact info",
    input: {
      rowIndex: 31,
      rawRecord: {
        "Lead": "Unknown Lead",
        "Project": "Varah Swamy",
        "Notes": "Asked for callback but gave no contact details"
      }
    },
    output: {
      importedRecords: [],
      skippedRecords: [
        {
          rowIndex: 31,
          reason: "Missing both email and mobile number"
        }
      ]
    }
  }
] as const;
