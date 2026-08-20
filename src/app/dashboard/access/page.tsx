import { AccessManagement } from "@/components/dashboard/access-management";
import { requireAdmin } from "@/server/auth";
import { getUsersForAccessManagement } from "@/server/modules/users/users.service";

export default async function AccessPage() {
  const administrator = await requireAdmin();
  const users = await getUsersForAccessManagement();

  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <header className="mb-7">
        <p className="text-sm text-muted-foreground">Администрирование</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Доступы пользователей</h1>
        <p className="mt-2 text-sm text-muted-foreground">Новые Google-аккаунты появляются здесь со статусом «Ожидает решения». Только администратор может выдать доступ и роль.</p>
      </header>
      <AccessManagement currentUserId={administrator.id} users={users} />
    </div>
  );
}
