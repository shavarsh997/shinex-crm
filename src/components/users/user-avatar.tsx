import { ComponentPropsWithoutRef } from "react";

import { getUserAvatarGradient, getUserInitials } from "@/lib/user-avatar";

type UserAvatarProps = ComponentPropsWithoutRef<"span"> & {
  userId: string;
  name?: string | null;
  email?: string | null;
};

export function UserAvatar({ userId, name, email, className, ...props }: UserAvatarProps) {
  const label = name || email || "Пользователь";

  return (
    <span
      className={`grid shrink-0 place-items-center bg-gradient-to-br font-bold text-white ${getUserAvatarGradient(userId)} ${className ?? ""}`}
      aria-label={label}
      {...props}
    >
      {getUserInitials(name, email)}
    </span>
  );
}
