export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;

  const adminEmails = (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.toLowerCase());
}
