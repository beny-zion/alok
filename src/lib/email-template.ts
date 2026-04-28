/**
 * Wraps email content in a branded AL HTML email template.
 * Uses table-based layout for maximum email client compatibility.
 */
export function wrapInBrandedTemplate(
  content: string,
  options?: { logoUrl?: string }
): string {
  const logoUrl = options?.logoUrl || "/logo_al_alok.png";

  return `<!DOCTYPE html>
<html dir="rtl" lang="he" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>AL גיוס עובדים והשמה</title>
<style type="text/css">
  body, table, td, p { font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; }
  img { border: 0; outline: none; text-decoration: none; }
  a { color: #F7941D; }
  h1, h2, h3 { color: #1B1464; margin: 0 0 16px; font-weight: 700; }
  h2 { font-size: 20px; }
  h3 { font-size: 17px; }
  p { margin: 0 0 14px; line-height: 1.7; }
  ul, ol { margin: 0 0 14px; padding-right: 24px; padding-left: 0; }
  li { margin-bottom: 6px; line-height: 1.6; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#EDEEF3;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;direction:rtl;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#EDEEF3;">
<tr>
<td align="center" style="padding:40px 16px;">

<!-- Main Container -->
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">

  <!-- Navy Top Bar -->
  <tr>
    <td style="background-color:#1B1464;height:8px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>

  <!-- Logo Section -->
  <tr>
    <td style="background-color:#ffffff;padding:28px 40px 20px;text-align:center;">
      <a href="https://alok.co.il/" target="_blank" rel="noopener" style="text-decoration:none;border:0;outline:none;display:inline-block;">
        <img src="${logoUrl}" alt="AL גיוס עובדים והשמה" width="110" style="display:inline-block;max-width:110px;height:auto;border:0;outline:none;text-decoration:none;" />
      </a>
    </td>
  </tr>

  <!-- Orange Accent Line -->
  <tr>
    <td style="background-color:#F7941D;height:4px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>

  <!-- Email Content -->
  <tr>
    <td style="background-color:#ffffff;padding:36px 40px;font-size:15px;line-height:1.7;color:#1F2937;text-align:right;">
      ${content}
    </td>
  </tr>

  <!-- Bottom Orange Accent -->
  <tr>
    <td style="background-color:#F7941D;height:3px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background-color:#1B1464;padding:28px 40px;text-align:center;">
      <p style="margin:0 0 8px;color:#F7941D;font-size:16px;font-weight:bold;line-height:1.4;">AL גיוס עובדים והשמה</p>
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.6;">
        al086102600@gmail.com&nbsp;&nbsp;|&nbsp;&nbsp;053-3101050
      </p>
      <p style="margin:0;font-size:12px;line-height:1.6;">
        <a href="https://alok.co.il/" target="_blank" rel="noopener" style="color:#F7941D;text-decoration:none;font-weight:600;">alok.co.il</a>
      </p>
    </td>
  </tr>

</table>
<!-- /Main Container -->

</td>
</tr>
</table>

</body>
</html>`;
}
