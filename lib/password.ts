/** Règle de mot de passe commune à l'inscription et à la réinitialisation. Renvoie un message d'erreur, ou null si valide. */
export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (pw.length > 72) return "Le mot de passe ne doit pas dépasser 72 caractères.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  return null;
}
