// Shared filter types and range labels. All cost figures come from the master dataset in src/data.
export type PlatformRange = "7d" | "mtd" | "q3" | "custom";
export type CloudId = "AWS" | "Azure" | "GCP";
export type Env = "Production" | "Staging" | "Development";

export const rangeLabels: Record<PlatformRange, string> = { "7d": "Last 7 days", mtd: "Month-to-date", q3: "Q3 forecast", custom: "Custom range" };
