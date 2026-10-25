export const externalFundCategories = ["MATERIAL", "FUEL", "TRANSPORT", "EQUIPMENT", "SERVICE", "OTHER"] as const;
export type ExternalFundCategory = (typeof externalFundCategories)[number];
export type ExternalFundEntryType = "INCOME" | "EXPENSE";

export const externalFundCategoryLabels = {
  MATERIAL: "expense.material", FUEL: "expense.fuel", TRANSPORT: "expense.transport",
  EQUIPMENT: "expense.equipment", SERVICE: "expense.service", OTHER: "expense.other",
} as const;

export type ExternalFundEntryView = {
  id: string;
  type: ExternalFundEntryType;
  category: ExternalFundCategory | null;
  title: string;
  amount: string;
  date: string;
  counterparty: string | null;
  notes: string | null;
  deletedAt: string | null;
};

export function summarizeExternalFunds(entries: ReadonlyArray<{
  type: ExternalFundEntryType;
  amount: bigint;
  deletedAt: Date | string | null;
}>) {
  let received = 0n;
  let spent = 0n;
  for (const entry of entries) {
    if (entry.deletedAt) continue;
    if (entry.type === "INCOME") received += entry.amount;
    else spent += entry.amount;
  }
  return { received, spent, balance: received - spent };
}
