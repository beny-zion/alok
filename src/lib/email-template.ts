/**
 * Wraps email content in a branded AL HTML email template.
 * Table-based layout for maximum email-client compatibility, with
 * gradient backgrounds (modern clients) and solid-color fallbacks
 * (Outlook desktop) declared via the `bgcolor` attribute.
 */
export function wrapInBrandedTemplate(
  content: string,
  options?: { logoUrl?: string; siteUrl?: string }
): string {
  const logoUrl = options?.logoUrl || "/logo_al_alok.png";
  const siteUrl = (options?.siteUrl || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const devLogoUrl = siteUrl ? `${siteUrl}/beny-zion-dev.svg` : "/beny-zion-dev.svg";

  return `<!DOCTYPE html>
<html dir="rtl" lang="he" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>AL גיוס עובדים והשמה</title>
<style type="text/css">
  body, table, td, p { font-family: 'Segoe UI', Arial, 'Helvetica Neue', Helvetica, sans-serif; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { color: #F7941D; }
  h1, h2, h3 { color: #1B1464; margin: 0 0 14px; font-weight: 700; letter-spacing: -0.2px; }
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  h3 { font-size: 17px; }
  p { margin: 0 0 14px; line-height: 1.75; }
  ul, ol { margin: 0 0 14px; padding-right: 28px; padding-left: 0; }
  li { margin-bottom: 6px; line-height: 1.65; }
  li::marker { color: #1B1464; font-weight: 600; }
  blockquote {
    margin: 18px 0;
    padding: 12px 18px;
    border-right: 3px solid #F7941D;
    background: #FFF8EE;
    color: #4B5563;
    font-style: italic;
    border-radius: 6px;
  }
  table { border-collapse: collapse; }
  @media only screen and (max-width: 620px) {
    .container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
    .px-lg { padding-left: 22px !important; padding-right: 22px !important; }
    .py-lg { padding-top: 26px !important; padding-bottom: 26px !important; }
    .logo-pad { padding: 30px 22px 22px !important; }
    .footer-pad { padding: 26px 22px !important; }
  }
</style>
<!--[if mso]>
<style type="text/css">
  body, table, td, p { font-family: Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:#EEF0F7;font-family:'Segoe UI',Arial,'Helvetica Neue',Helvetica,sans-serif;direction:rtl;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#EEF0F7" style="background:linear-gradient(180deg,#F1F2F8 0%,#E6E8F2 100%);background-color:#EEF0F7;">
<tr>
<td align="center" style="padding:36px 16px;">

<!-- Main Container -->
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="container" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(27,20,100,0.10);">

  <!-- Top navy gradient bar -->
  <tr>
    <td bgcolor="#1B1464" style="background-color:#1B1464;background-image:linear-gradient(90deg,#0D0B3E 0%,#1B1464 50%,#2A1F8C 100%);height:14px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>

  <!-- Logo Section (white background — keeps the original logo visible) -->
  <tr>
    <td bgcolor="#FFFFFF" class="logo-pad" style="background-color:#ffffff;padding:36px 40px 22px;text-align:center;">
      <a href="https://alok.co.il/" target="_blank" rel="noopener" style="text-decoration:none;border:0;outline:none;display:inline-block;">
        <img src="${logoUrl}" alt="AL גיוס עובדים והשמה" width="120" style="display:inline-block;max-width:120px;height:auto;border:0;outline:none;text-decoration:none;" />
      </a>
      <p style="margin:14px 0 0;color:#1B1464;font-size:11px;letter-spacing:2.5px;font-weight:600;text-transform:uppercase;opacity:0.55;">
        גיוס עובדים &nbsp;&middot;&nbsp; השמה &nbsp;&middot;&nbsp; ייעוץ
      </p>
    </td>
  </tr>

  <!-- Orange→Amber gradient strip -->
  <tr>
    <td bgcolor="#F7941D" style="background-color:#F7941D;background-image:linear-gradient(90deg,#F7941D 0%,#FCB04A 50%,#F7941D 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>

  <!-- Email Content -->
  <tr>
    <td bgcolor="#FFFFFF" class="px-lg py-lg" style="background-color:#ffffff;padding:40px 44px;font-size:15px;line-height:1.75;color:#1F2937;text-align:right;">
      ${content}
    </td>
  </tr>

  <!-- Decorative divider before footer -->
  <tr>
    <td bgcolor="#FFFFFF" style="background-color:#ffffff;padding:0 44px 28px;text-align:center;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
        <tr>
          <td style="font-size:0;line-height:0;padding:0 6px;">
            <div style="width:8px;height:8px;background:#F7941D;border-radius:50%;display:inline-block;"></div>
          </td>
          <td style="font-size:0;line-height:0;padding:0 6px;">
            <div style="width:8px;height:8px;background:#1B1464;border-radius:50%;display:inline-block;opacity:0.55;"></div>
          </td>
          <td style="font-size:0;line-height:0;padding:0 6px;">
            <div style="width:8px;height:8px;background:#2563EB;border-radius:50%;display:inline-block;opacity:0.4;"></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer (navy gradient) -->
  <tr>
    <td bgcolor="#1B1464" class="footer-pad" style="background-color:#1B1464;background-image:linear-gradient(135deg,#0D0B3E 0%,#1B1464 50%,#241B7A 100%);padding:34px 40px;text-align:center;">
      <p style="margin:0 0 6px;color:#F7941D;font-size:18px;font-weight:bold;line-height:1.3;letter-spacing:0.3px;">
        AL <span style="color:#FFFFFF;font-weight:500;">גיוס עובדים והשמה</span>
      </p>
      <p style="margin:0 0 16px;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.6;letter-spacing:0.4px;">
        מחברים בין מועמדים איכותיים למעסיקים מובילים
      </p>

      <!-- Contact pill -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 14px;">
        <tr>
          <td style="padding:0 4px;">
            <a href="mailto:al086102600@gmail.com" style="display:inline-block;color:#FFFFFF;text-decoration:none;font-size:12px;background:rgba(255,255,255,0.08);padding:8px 18px;border-radius:999px;border:1px solid rgba(247,148,29,0.3);">
              al086102600@gmail.com
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:8px 0 0;font-size:13px;line-height:1.6;">
        <a href="https://alok.co.il/" target="_blank" rel="noopener" style="color:#F7941D;text-decoration:none;font-weight:700;letter-spacing:0.5px;border-bottom:1px solid rgba(247,148,29,0.4);padding-bottom:1px;">
          alok.co.il
        </a>
      </p>

      <!-- Subtle separator -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:22px auto 14px;">
        <tr>
          <td style="width:60px;height:1px;background:rgba(255,255,255,0.12);font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>

      <!-- Developed by credit -->
      <a href="https://beny-zion-dev.vercel.app" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block;color:rgba(255,255,255,0.45);">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
          <tr>
            <td style="vertical-align:middle;padding:0 6px 0 0;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;color:rgba(255,255,255,0.45);">
              Developed by
            </td>
            <td style="vertical-align:middle;padding:0;">
              <img src="${devLogoUrl}" alt="Beny Zion Dev" width="22" height="22" style="display:block;width:22px;height:22px;border:0;outline:none;filter:drop-shadow(0 0 4px rgba(255,255,255,0.4));" />
            </td>
          </tr>
        </table>
      </a>
    </td>
  </tr>

  <!-- Bottom orange gradient line -->
  <tr>
    <td bgcolor="#F7941D" style="background-color:#F7941D;background-image:linear-gradient(90deg,#FCB04A 0%,#F7941D 50%,#E0850F 100%);height:5px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>

</table>
<!-- /Main Container -->

<p style="margin:20px 0 0;color:rgba(27,20,100,0.45);font-size:11px;line-height:1.5;letter-spacing:0.4px;">
  &copy; AL גיוס עובדים והשמה
</p>

</td>
</tr>
</table>

</body>
</html>`;
}
