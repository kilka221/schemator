import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = (process.env.SMTP_HOST || 'smtp.yandex.ru').trim();
  const port = parseInt(process.env.SMTP_PORT || '465', 10) || 465;
  const secure = port === 465;
  const user = (process.env.SMTP_USER || process.env.YANDEX_SMTP_USER || 'kuznetsov44aximka@yandex.ru').trim();
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.SMPT_PASSWORD || process.env.YANDEX_SMTP_PASSWORD || 'nyrpplzeguisnifp').trim();

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
    });
    console.log(`[Mailer] Configured SMTP transporter with host: ${host}:${port}, user: ${user}`);
    return transporter;
  }

  // If no specific credentials, create a fallback transporter if local sendmail exists
  return null;
}

export async function sendVerificationEmail(toEmail: string, verificationCode: string, displayName?: string): Promise<{ success: boolean; sentViaSmtp: boolean; error?: string }> {
  const cleanEmail = toEmail.trim().toLowerCase();
  const mailTransporter = getTransporter();
  const sender = (process.env.SMTP_USER || process.env.YANDEX_SMTP_USER || 'kuznetsov44aximka@yandex.ru').trim(); // Force sender to match the authenticated user to prevent Yandex 553 errors

  const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; padding: 32px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .title { font-size: 20px; font-weight: 700; color: #09090b; margin: 12px 0 4px; }
    .subtitle { font-size: 13px; color: #71717a; margin: 0; }
    .code-box { background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .code-text { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #15803d; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .notice { font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="display:inline-block; padding: 8px; background:#eff6ff; border-radius:12px;">
        <span style="font-size:24px;">🔷</span>
      </div>
      <h1 class="title">Схематор</h1>
      <p class="subtitle">Подтверждение адреса электронной почты</p>
    </div>

    <p style="font-size: 14px; color: #3f3f46; line-height: 1.6;">
      Здравствуйте${displayName ? ', ' + displayName : ''}!
    </p>
    <p style="font-size: 14px; color: #3f3f46; line-height: 1.6;">
      Для завершения регистрации и получения <strong>1 бесплатного Coin</strong> для создания блок-схем введите 6-значный код:
    </p>

    <div class="code-box">
      <div class="code-text">${verificationCode}</div>
    </div>

    <p style="font-size: 13px; color: #71717a; text-align: center;">
      Код действителен в течение 24 часов. Если вы не регистрировались на сайте Схематор, просто проигнорируйте это письмо.
    </p>

    <div class="notice">
      Служба безопасности Схематор &bull; schemator.ru
    </div>
  </div>
</body>
</html>
  `;

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: `"Схематор" <${sender}>`,
        to: cleanEmail,
        subject: `${verificationCode} — Ваш код подтверждения в Схематор`,
        text: `Здравствуйте! Ваш код подтверждения для входа в Схематор: ${verificationCode}. Введите его для активации 1 Coin.`,
        html: htmlContent,
      });
      console.log(`[Mailer] Verification email sent to ${cleanEmail}, messageId: ${info.messageId}`);
      return { success: true, sentViaSmtp: true };
    } catch (err: any) {
      console.error(`[Mailer] Error sending email via SMTP to ${cleanEmail}:`, err.message);
      return { success: false, sentViaSmtp: false, error: err.message };
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`[MAILER SIMULATION] SMTP not configured in environment.`);
    console.log(`[MAILER] To: ${cleanEmail}`);
    console.log(`[MAILER] Code: ${verificationCode}`);
    console.log(`[MAILER] Configure SMTP_USER and SMTP_PASS in .env to send via live SMTP`);
    console.log(`======================================================\n`);
    return { success: true, sentViaSmtp: false };
  }
}
