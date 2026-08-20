"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type UserRole = "ADMIN" | "MANAGER" | "MEMBER";
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

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

const statusLabels: Record<ApprovalStatus, string> = {
  PENDING: "Ожидает решения",
  APPROVED: "Доступ разрешён",
  REJECTED: "Доступ отклонён",
};

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
      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {rows.map((user) => {
        const isCurrentUser = user.id === currentUserId;
        const isSaving = pendingUserId === user.id;

        return (
          <article key={user.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <h2 className="font-medium">{user.name || "Без имени"}</h2>
                <p className="text-sm text-muted-foreground">{user.email || "Email не указан"}</p>
                <p className="mt-2 text-sm">{statusLabels[user.approvalStatus]}</p>
              </div>
              <p className="text-xs text-muted-foreground">Заявка: {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(user.createdAt))}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr]">
              <label className="grid gap-1 text-sm font-medium">
                Роль
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
                Комментарий для пользователя
                <input
                  value={user.approvalNote ?? ""}
                  disabled={isCurrentUser || isSaving}
                  onChange={(event) => updateDraft(user.id, { approvalNote: event.target.value || null })}
                  className="h-9 rounded-lg border bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Необязательно"
                />
              </label>
            </div>

            {isCurrentUser ? (
              <p className="mt-4 text-sm text-muted-foreground">Собственный доступ нельзя изменить через этот экран.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" disabled={isSaving} onClick={() => save(user, "APPROVED")}>{isSaving ? "Сохраняем…" : "Одобрить"}</Button>
                <Button size="sm" variant="outline" disabled={isSaving} onClick={() => save(user, "PENDING")}>Вернуть в ожидание</Button>
                <Button size="sm" variant="destructive" disabled={isSaving} onClick={() => save(user, "REJECTED")}>Отклонить</Button>
              </div>
            )}
          </article>
        );
      })}
      {rows.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Заявок на доступ пока нет.</p>}
    </div>
  );
}
