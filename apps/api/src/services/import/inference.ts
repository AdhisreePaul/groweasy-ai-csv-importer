import {
  DATA_SOURCES,
  type AllowedDataSource,
  type CrmStatus,
  type DataSource
} from "@groweasy/shared";

export function inferStatus(text: string): CrmStatus {
  const lowerText = text.toLowerCase();

  if (/\b(sold|booked|closed|converted|sale done)\b/.test(lowerText)) {
    return "SALE_DONE";
  }

  if (/\b(did not connect|could not connect|unreachable|not picking|no answer)\b/.test(lowerText)) {
    return "DID_NOT_CONNECT";
  }

  if (/\b(fake|spam|duplicate|invalid|not interested|bad lead)\b/.test(lowerText)) {
    return "BAD_LEAD";
  }

  return "GOOD_LEAD_FOLLOW_UP";
}

export function inferDataSource(text: string, defaultDataSource?: DataSource): DataSource {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("meridian tower")) {
    return "meridian_tower";
  }

  if (lowerText.includes("eden park")) {
    return "eden_park";
  }

  if (lowerText.includes("varah swamy") || lowerText.includes("varahswamy")) {
    return "varah_swamy";
  }

  if (lowerText.includes("sarjapur plot")) {
    return "sarjapur_plots";
  }

  if (lowerText.includes("leads on demand")) {
    return "leads_on_demand";
  }

  if (isAllowedDataSource(defaultDataSource)) {
    return defaultDataSource;
  }

  return "";
}

function isAllowedDataSource(value: DataSource | undefined): value is AllowedDataSource {
  return DATA_SOURCES.includes(value as AllowedDataSource);
}
