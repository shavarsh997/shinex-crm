import { BanknoteArrowDown, BanknoteArrowUp, CircleDollarSign, WalletCards } from "lucide-react";
import { formatMoney } from "@/lib/money";

export function ProjectFinanceSummary({ estimatedAmount, receivedAmount, spentAmount }: { estimatedAmount: bigint; receivedAmount: bigint; spentAmount: bigint }) {
  const items = [{ label: "Смета", value: estimatedAmount, icon: CircleDollarSign }, { label: "Получено", value: receivedAmount, icon: BanknoteArrowDown }, { label: "Потрачено", value: spentAmount, icon: BanknoteArrowUp }, { label: "Остаток полученных", value: receivedAmount - spentAmount, icon: WalletCards }, { label: "Остаток бюджета", value: estimatedAmount - spentAmount, icon: WalletCards }];
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{items.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"><Icon className="size-4 text-muted-foreground" /><p className="mt-5 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-base font-semibold">{formatMoney(value)}</p></div>)}</section>;
}
