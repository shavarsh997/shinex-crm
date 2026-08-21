"use client";

import { CircleCheck, CircleX, Clock3, PauseCircle, Save, ShieldCheck, Undo2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type UserRole = "ADMIN" | "MANAGER" | "MEMBER";
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
type ButtonVariant = "default" | "outline" | "destructive";

type AccessUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  approvalNote: string | null;
  approvedAt: Date | null;
  createdAt: Date;
};

type EditableUser = Omit<AccessUser, "approvedAt" | "createdAt"> & {
  approvedAt: string | null;
  createdAt: string;
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  MEMBER: "Сотрудник",
};

const statuses = {
  PENDING: {
    label: "Ожидает решения",
    description: "Пользователь ещё не может войти в CRM.",
    icon: Clock3,
    className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  APPROVED: {
    label: "Доступ активен",
    description: "Пользователь может войти в CRM с выбранной ролью.",
    icon: CircleCheck,
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  REJECTED: {
    label: "Доступ отклонён",
    description: "Пользователь не может войти, пока статус не изменится.",
    icon: CircleX,
    className: "border-destructive/25 bg-destructive/10 text-destructive",
  },
} satisfies Record<ApprovalStatus, {
  label: string;
  description: string;
  icon: typeof Clock3;
  className: string;
}>;

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" });

function actionsForStatus(status: ApprovalStatus): Array<{
  status: ApprovalStatus;
  label: string;
  variant: ButtonVariant;
  icon: typeof ShieldCheck;
}> {
  switch (status) {
    case "PENDING":
      return [
        { status: "APPROVED", label: "Одобрить доступ", variant: "default", icon: ShieldCheck },
        { status: "REJECTED", label: "Отклонить", variant: "destructive", icon: CircleX },
      ];
    case "APPROVED":
      return [
        { status: "APPROVED", label: "Сохранить изменения", variant: "outline", icon: Save },
        { status: "PENDING", label: "Приостановить доступ", variant: "outline", icon: PauseCircle },
        { status: "REJECTED", label: "Отклонить доступ", variant: "destructive", icon: CircleX },
      ];
    case "REJECTED":
      return [
        { status: "APPROVED", label: "Одобрить доступ", variant: "default", icon: ShieldCheck },
        { status: "PENDING", label: "Вернуть на проверку", variant: "outline", icon: Undo2 },
      ];
  }
}

export function AccessManagement({ currentUserId, users }: {
  currentUserId: string;
  users: AccessUser[];
}) {
  const [rows, setRows] = useState<EditableUser[]>(
    users.map((user) => ({
      ...user,
      approvedAt: user.approvedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    })),
  );
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const statusCounts = rows.reduce<Record<ApprovalStatus, number>>(
    (counts, user) => ({ ...counts, [user.approvalStatus]: counts[user.approvalStatus] + 1 }),
    { PENDING: 0, APPROVED: 0, REJECTED: 0 },
  );

  function updateDraft(userId: string, changes: Partial<EditableUser>) {
    setRows((current) => current.map((user) => (
      user.id === userId ? { ...user, ...changes } : user
    )));
  }

  async function save(user: EditableUser, approvalStatus: ApprovalStatus) {
    setPendingUserId(user.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: user.role,
          approvalStatus,
          approvalNote: user.approvalNote ?? "",
        }),
      });
      const body = await response.json() as {
        user?: EditableUser;
        error?: { message?: string };
      };

      if (!response.ok || !body.user) {
        throw new Error(body.error?.message ?? "Не удалось обновить доступ.");
      }

      setRows((current) => current.map((item) => (
        item.id === user.id ? body.user! : item
      )));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось обновить доступ.");
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <section aria-label="Сводка статусов" className="grid grid-cols-3 overflow-hidden rounded-xl border bg-card text-center text-sm">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
          <div key={status} className="border-r p-3 last:border-r-0">
            <p className="text-lg font-semibold tabular-nums">{statusCounts[status]}</p>
            <p className="text-xs text-muted-foreground">{statuses[status].label}</p>
          </div>
        ))}
      </section>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {rows.map((user) => {
        const isCurrentUser = user.id === currentUserId;
        const isSaving = pendingUserId === user.id;
        const status = statuses[user.approvalStatus];
        const StatusIcon = status.icon;

        return (
          <article key={user.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Заявка на доступ</p>
                <h2 className="mt-1 font-medium">{user.name || "Без имени"}</h2>
                <p className="text-sm text-muted-foreground">{user.email || "Email не указан"}</p>
              </div>
              <p className="text-xs text-muted-foreground">Подана: {dateFormatter.format(new Date(user.createdAt))}</p>
            </div>

            <div role="status" className={`mt-4 flex gap-3 rounded-lg border p-3 ${status.className}`}>
              <StatusIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">{status.label}</p>
                <p className="mt-0.5 text-sm opacity-90">{status.description}</p>
                {user.approvalStatus === "APPROVED" && user.approvedAt && <p className="mt-1 text-xs opacity-80">Подтверждено: {dateFormatter.format(new Date(user.approvedAt))}</p>}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr]">
              <label className="grid gap-1 text-sm font-medium">
                Роль после одобрения
                <select
                  value={user.role}
                  disabled={isCurrentUser || isSaving}
                  onChange={(event) => updateDraft(user.id, { role: event.target.value as UserRole })}
                  className="h-9 rounded-lg border bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Сообщение пользователю
                <input
                  value={user.approvalNote ?? ""}
                  disabled={isCurrentUser || isSaving}
                  onChange={(event) => updateDraft(user.id, { approvalNote: event.target.value || null })}
                  className="h-9 rounded-lg border bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Например: доступ одобрен, добро пожаловать"
                />
              </label>
            </div>

            {isCurrentUser ? (
              <p className="mt-4 text-sm text-muted-foreground">Собственный доступ нельзя изменить через этот экран.</p>
            ) : (
              <div className="mt-4">
                <p className="mb-2 text-sm text-muted-foreground">Выберите действие — роль и сообщение сохранятся вместе с ним.</p>
                <div className="flex flex-wrap gap-2">
                  {actionsForStatus(user.approvalStatus).map((action) => {
                    const ActionIcon = action.icon;

                    return (
                      <Button
                        key={action.status}
                        size="sm"
                        variant={action.variant}
                        disabled={isSaving}
                        onClick={() => save(user, action.status)}
                      >
                        <ActionIcon aria-hidden="true" />
                        {isSaving ? "Сохраняем…" : action.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        );
      })}

      {rows.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Заявок на доступ пока нет.</p>}
    </div>
  );
}
