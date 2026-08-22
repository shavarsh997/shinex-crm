export function isTelegramStartCommand(text: string) {
  return /^\/start(?:@[A-Za-z0-9_]+)?(?:\s|$)/i.test(text.trim());
}
