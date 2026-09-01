// Traducao das mensagens do Supabase Auth. Fica aqui, e nao na pagina de
// login, porque login, recuperacao e troca de senha erram pelos mesmos
// motivos -- e o usuario nao deve ver ingles em nenhum dos tres.
const errosAuth: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos",
  "Email not confirmed": "Email não confirmado. Verifique sua caixa de entrada",
  "User already registered": "Este email já está cadastrado",
  "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres",
  "Unable to validate email address: invalid format": "Formato de email inválido",
  "Signup requires a valid password": "Informe uma senha válida",
  "Email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos",
  "For security purposes, you can only request this after": "Muitas tentativas. Aguarde alguns minutos e tente novamente",
  "User not found": "Usuário não encontrado",
  "Network request failed": "Erro de conexão. Verifique sua internet",
  "Failed to fetch": "Erro de conexão. Verifique sua internet",
  "fetch failed": "Erro de conexão. Verifique sua internet",
  // Recuperacao e troca de senha
  "New password should be different from the old password":
    "A nova senha precisa ser diferente da atual",
  "same_password": "A nova senha precisa ser diferente da atual",
  "Auth session missing": "Link inválido ou expirado. Peça um novo",
  "Token has expired or is invalid": "Link inválido ou expirado. Peça um novo",
  "otp_expired": "Link expirado. Peça um novo",
  "Password is known to be weak": "Senha muito fraca. Escolha outra",
  "over_email_send_rate_limit": "Muitos emails enviados. Aguarde alguns minutos",
};

export function traduzirErro(
  err: unknown,
  padrao = "Erro ao autenticar. Tente novamente"
): string {
  const msg = err instanceof Error ? err.message : String(err);
  for (const [en, pt] of Object.entries(errosAuth)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return pt;
  }
  return padrao;
}
