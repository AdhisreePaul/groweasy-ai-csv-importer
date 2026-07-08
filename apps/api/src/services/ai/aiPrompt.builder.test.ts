import { describe, expect, it } from "vitest";
import {
  AI_SYSTEM_PROMPT,
  buildAiExtractionPrompt,
  FEW_SHOT_EXAMPLES
} from "./aiPrompt.builder.js";

describe("buildAiExtractionPrompt", () => {
  it("builds a production extraction prompt with all assignment rules", () => {
    const prompt = buildAiExtractionPrompt("batch-7", {
      batch_id: "batch-7",
      default_data_source: "leads_on_demand",
      records: [
        {
          source_row: 42,
          raw_record: {
            "Full name": "Priya Sharma",
            "Phone / WhatsApp": "+91 98765 43210",
            "Email IDs": "priya@example.com; priya.work@example.com"
          }
        }
      ]
    });

    expect(prompt.system).toBe(AI_SYSTEM_PROMPT);
    expect(prompt.system).toContain("Return JSON only");
    expect(prompt.system).toContain("Do not output Markdown");
    expect(prompt.user).toContain("batch-7");
    expect(prompt.user).toContain("rowIndex");
    expect(prompt.user).toContain("importedRecords");
    expect(prompt.user).toContain("skippedRecords");
    expect(prompt.user).toContain("created_at");
    expect(prompt.user).toContain("mobile_without_country_code");
    expect(prompt.user).toContain("GOOD_LEAD_FOLLOW_UP");
    expect(prompt.user).toContain("DID_NOT_CONNECT");
    expect(prompt.user).toContain("BAD_LEAD");
    expect(prompt.user).toContain("SALE_DONE");
    expect(prompt.user).toContain("leads_on_demand");
    expect(prompt.user).toContain("meridian_tower");
    expect(prompt.user).toContain("eden_park");
    expect(prompt.user).toContain("varah_swamy");
    expect(prompt.user).toContain("sarjapur_plots");
    expect(prompt.user).toContain("Skip rows with neither email nor mobile number");
    expect(prompt.user).toContain("For multiple emails");
    expect(prompt.user).toContain("For multiple mobile numbers");
    expect(prompt.user).toContain("Do not wrap the JSON in Markdown fences");
    expect(prompt.user).toContain("Leave unknown values as empty strings");
  });

  it("includes required few-shot examples", () => {
    const exampleNames = FEW_SHOT_EXAMPLES.map((example) => example.name);

    expect(exampleNames).toEqual([
      "Facebook leads",
      "Real estate lead sheet",
      "Manually created messy sheet",
      "Invalid row with no contact info"
    ]);
  });
});
