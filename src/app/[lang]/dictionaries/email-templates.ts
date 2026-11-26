export type EmailLocale = "az" | "en";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapHtml(title: string, bodyLines: string[], ctaLabel: string, ctaUrl: string, footer: string): string {
  const safeUrl = escapeHtml(ctaUrl);
  const paragraphs = bodyLines.map((line) => `<p style="margin:0 0 12px;line-height:1.6;color:#27294a;">${escapeHtml(line)}</p>`).join("");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f7ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e6f5;border-radius:16px;padding:28px;">
      <p style="margin:0 0 16px;font-weight:800;font-size:18px;color:#12133a;">panelim.az</p>
      <h1 style="margin:0 0 14px;font-size:20px;color:#12133a;">${escapeHtml(title)}</h1>
      ${paragraphs}
      <p style="margin:22px 0;">
        <a href="${safeUrl}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#3373ff;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(ctaLabel)}</a>
      </p>
      <p style="margin:16px 0 0;font-size:12px;color:#686c8a;word-break:break-all;">${safeUrl}</p>
      <hr style="border:0;border-top:1px solid #e9ecf7;margin:22px 0 14px;" />
      <p style="margin:0;font-size:12px;color:#686c8a;">${escapeHtml(footer)}</p>
    </div>
  </body>
</html>`;
}

export function buildVerifyEmailMessage(locale: EmailLocale, verifyUrl: string) {
  if (locale === "en") {
    const subject = "Verify your panelim.az email address";
    const lines = [
      "Welcome to panelim.az! Please confirm your email address to complete your account setup.",
      "This verification link expires in 24 hours.",
    ];
    const footer = "If you did not create a panelim.az account, you can safely ignore this email.";
    return {
      subject,
      text: `${lines.join("\n\n")}\n\n${verifyUrl}\n\n${footer}`,
      html: wrapHtml(subject, lines, "Verify email", verifyUrl, footer),
    };
  }
  const subject = "panelim.az e-poçt ünvanınızı təsdiqləyin";
  const lines = [
    "panelim.az-a xoş gəlmisiniz! Hesab qeydiyyatını tamamlamaq üçün e-poçt ünvanınızı təsdiqləyin.",
    "Bu təsdiq linki 24 saat ərzində etibarlıdır.",
  ];
  const footer = "Əgər panelim.az-da qeydiyyatdan keçməmisinizsə, bu məktuba məhəl qoymayın.";
  return {
    subject,
    text: `${lines.join("\n\n")}\n\n${verifyUrl}\n\n${footer}`,
    html: wrapHtml(subject, lines, "E-poçtu təsdiqlə", verifyUrl, footer),
  };
}

export function buildPasswordResetMessage(locale: EmailLocale, resetUrl: string) {
  if (locale === "en") {
    const subject = "Reset your panelim.az password";
    const lines = [
      "We received a request to reset the password for your panelim.az account.",
      "Click the button below to choose a new password. This link expires in 1 hour.",
    ];
    const footer = "If you did not request a password reset, no changes have been made to your account.";
    return {
      subject,
      text: `${lines.join("\n\n")}\n\n${resetUrl}\n\n${footer}`,
      html: wrapHtml(subject, lines, "Reset password", resetUrl, footer),
    };
  }
  const subject = "panelim.az şifrənizi sıfırlayın";
  const lines = [
    "panelim.az hesabınız üçün şifrə sıfırlama sorğusu aldıq.",
    "Yeni şifrə təyin etmək üçün aşağıdakı düyməyə klikləyin. Link 1 saat ərzində etibarlıdır.",
  ];
  const footer = "Əgər bu sorğunu siz göndərməmisinizsə, hesabınızda heç bir dəyişiklik edilməyib.";
  return {
    subject,
    text: `${lines.join("\n\n")}\n\n${resetUrl}\n\n${footer}`,
    html: wrapHtml(subject, lines, "Yeni şifrə təyin et", resetUrl, footer),
  };
}

export function buildExistingAccountNoticeMessage(locale: EmailLocale, loginUrl: string, resetUrl: string) {
  if (locale === "en") {
    const subject = "Sign-up attempt for your panelim.az email";
    const lines = [
      "Someone tried to register a new panelim.az workspace using this email address, which is already registered.",
      `If this was you, sign in directly or reset your password here: ${resetUrl}`,
    ];
    const footer = "If you did not attempt to sign up, you can ignore this message — your account remains secure.";
    return {
      subject,
      text: `${lines.join("\n\n")}\n\nSign in: ${loginUrl}\nReset password: ${resetUrl}\n\n${footer}`,
      html: wrapHtml(subject, lines, "Sign in to panelim.az", loginUrl, footer),
    };
  }
  const subject = "panelim.az hesabınızla qeydiyyat cəhdi";
  const lines = [
    "Bu e-poçt ünvanı ilə panelim.az-da yeni qeydiyyat cəhdi edildi, lakin bu ünvan artıq qeydiyyatdadır.",
    `Əgər bu siz idinizsə, birbaşa daxil olun və ya şifrənizi sıfırlayın: ${resetUrl}`,
  ];
  const footer = "Əgər bu cəhdi siz etməmisinizsə, narahat olmayın — hesabınız təhlükəsizdir.";
  return {
    subject,
    text: `${lines.join("\n\n")}\n\nDaxil ol: ${loginUrl}\nŞifrəni sıfırla: ${resetUrl}\n\n${footer}`,
    html: wrapHtml(subject, lines, "panelim.az-a daxil ol", loginUrl, footer),
  };
}
