import { describe, expect, it } from "vitest";
import { inferDataSource, inferStatus } from "./inference.js";

describe("import inference helpers", () => {
  it("infers allowed data sources only when confident", () => {
    expect(inferDataSource("Lead asked about Meridian Tower")).toBe(
      "meridian_tower"
    );
    expect(inferDataSource("Generic campaign", "eden_park")).toBe("eden_park");
    expect(inferDataSource("Generic campaign")).toBe("");
  });

  it("maps status text to GrowEasy CRM statuses", () => {
    expect(inferStatus("Booked and converted")).toBe("SALE_DONE");
    expect(inferStatus("Could not connect after two calls")).toBe(
      "DID_NOT_CONNECT"
    );
    expect(inferStatus("Fake duplicate lead")).toBe("BAD_LEAD");
    expect(inferStatus("Interested in callback")).toBe("GOOD_LEAD_FOLLOW_UP");
  });
});
