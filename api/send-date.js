const EMAIL_TO = 'duoke.oke@gmail.com';
const EMAIL_FROM = 'Date Invitation <onboarding@resend.dev>';
const MAX_LENGTH = 200;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseBody(req.body);
  const date = clean(body.date);
  const time = clean(body.time);
  const activity = clean(body.activity);

  const missing = [['date', date], ['time', time], ['activity', activity]]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) {
    console.warn('[send-date] Validation failed, missing fields:', missing.join(', '));
    return res.status(400).json({ error: 'Missing fields', missing });
  }

  const apiKey = process.env.RESEND_API;
  if (!apiKey) {
    console.error('[send-date] RESEND_API environment variable is not set');
    return res.status(500).json({ error: 'Email service is not configured' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [EMAIL_TO],
        subject: '💗 Новый ответ на приглашение',
        html: `<h2>💗 Новое свидание</h2>
<p><b>Дата:</b> ${escapeHtml(formatDate(date))}</p>
<p><b>Время:</b> ${escapeHtml(time)}</p>
<p><b>План:</b> ${escapeHtml(activity)}</p>`,
        text: `Новое свидание\nДата: ${formatDate(date)}\nВремя: ${time}\nПлан: ${activity}`,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[send-date] Resend API error', response.status, JSON.stringify(data));
      return res.status(502).json({ error: 'Email provider error' });
    }

    console.log('[send-date] Email sent, id:', data.id);
    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('[send-date] Failed to reach Resend:', err?.message || err);
    return res.status(502).json({ error: 'Email provider unreachable' });
  }
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  return typeof body === 'object' ? body : {};
}

function clean(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_LENGTH);
}

function formatDate(value) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
