import { UsersRound } from "lucide-react";

import { EmployeeDirectory } from "@/components/employees/employee-directory";
import { getAuthenticatedUser } from "@/server/auth";
import { getEmployeePayrollOverview } from "@/server/modules/employees/employees.service";
import { getTranslations } from "@/i18n/server";

export default async function EmployeesPage() {
  const { t } = await getTranslations();
  const user = await getAuthenticatedUser();
  const employees = await getEmployeePayrollOverview(user.id, user.role === "ADMIN");
  const view = employees.map((employee) => ({
    ...employee,
    totalPaid: employee.totalPaid.toString(),
    projects: employee.projects.map((project) => ({ ...project, amount: project.amount.toString() })),
    expenses: employee.expenses.map((expense) => ({ ...expense, amount: expense.amount.toString(), date: expense.date.toISOString() })),
  }));

  return <div className="mx-auto max-w-4xl px-5 pb-28 pt-6 sm:px-8 sm:pt-8"><header className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">SHINEX CRM</p><h1 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">{t("employee.title")}</h1><p className="mt-1 text-sm text-slate-500">{t("employee.pageDescription")}</p></div><span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><UsersRound className="size-5" /></span></header><EmployeeDirectory employees={view} canCreate={user.role !== "MEMBER"} /></div>;
}
