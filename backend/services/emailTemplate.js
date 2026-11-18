// One plain, accessible email layout: a heading, a few lines, up to two big
// buttons and a footer with the settings / mute link. Inline styles only.

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * @param {object} o
 * @param {string} o.title
 * @param {string[]} [o.lines]
 * @param {{ label: string, href: string, primary?: boolean }[]} [o.buttons]
 * @param {{ label: string, href: string }[]} [o.footerLinks]
 */
export function renderEmail({ title, lines = [], buttons = [], footerLinks = [] }) {
  const btn = (b) =>
    `<a href="${esc(b.href)}" style="display:inline-block;margin:0 8px 8px 0;padding:14px 22px;border-radius:999px;font-weight:600;font-size:16px;text-decoration:none;${
      b.primary ? 'background:#2f4bff;color:#ffffff;' : 'background:#f2efe9;color:#14161c;border:1px solid #8a8578;'
    }">${esc(b.label)}</a>`;

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#faf8f4;font-family:Inter,Segoe UI,Arial,sans-serif;color:#14161c">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
<p style="margin:0 0 20px;font-weight:700;font-size:18px">Hobbook</p>
<div style="background:#ffffff;border:1px solid #e6e1d8;border-radius:16px;padding:24px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.25">${esc(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 10px;font-size:16px;line-height:1.5;color:#4b5160">${esc(l)}</p>`).join('\n')}
${buttons.length ? `<div style="margin-top:18px">${buttons.map(btn).join('')}</div>` : ''}
</div>
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#5c6373">Du bekommst diese E-Mail, weil du bei Hobbook mitspielst.
${footerLinks.map((f) => `<a href="${esc(f.href)}" style="color:#1f36d6">${esc(f.label)}</a>`).join(' · ')}</p>
</div></body></html>`;

  const text = [
    title,
    '',
    ...lines,
    '',
    ...buttons.map((b) => `${b.label}: ${b.href}`),
    '',
    ...footerLinks.map((f) => `${f.label}: ${f.href}`),
  ].join('\n');

  return { html, text };
}
