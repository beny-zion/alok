export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 9 && !digits.startsWith("0")) return "0" + digits;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  if (digits.length === 12 && digits.startsWith("972")) return "0" + digits.slice(3);
  if (digits.length === 13 && digits.startsWith("9720")) return digits.slice(3);
  return digits;
}
