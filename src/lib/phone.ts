// Normalizes Indonesian phone numbers to +62 E.164-style format.
export function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-().]/g, "");
  if (!/^\+?\d{8,15}$/.test(cleaned)) return null;
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+62" + cleaned.slice(1);
  if (cleaned.startsWith("62")) return "+" + cleaned;
  return "+" + cleaned;
}

export function isEmail(input: string): boolean {
  return input.includes("@");
}
