const avatarGradients = [
  "from-blue-600 to-indigo-700",
  "from-violet-600 to-fuchsia-700",
  "from-cyan-600 to-blue-700",
  "from-emerald-600 to-teal-700",
  "from-rose-600 to-pink-700",
  "from-orange-500 to-red-700",
  "from-fuchsia-600 to-purple-700",
  "from-teal-600 to-cyan-700",
] as const;

export function getUserAvatarGradient(userId: string) {
  let hash = 0;

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) | 0;
  }

  return avatarGradients[(hash >>> 0) % avatarGradients.length];
}

export function getUserInitials(name?: string | null, email?: string | null) {
  const label = (name || email || "U").trim();
  const words = label.split(/\s+/).filter(Boolean);

  if (words.length > 1) {
    return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  }

  return label.slice(0, 2).toUpperCase();
}
