const EMAIL_TO = 'duoke.oke@gmail.com';
const EMAIL_FROM = 'Date Invitation <onboarding@resend.dev>';
const SUBJECT = '💗 New Date Invitation Response';
const MAX_FIELD_LENGTH = 200;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      console.error('[send-date] Invalid JSON body');
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const date = clean(body?.date);
  const time = clean(body?.time);
  const activity = clean(body?.activity);

  const missing = [!date && 'date', !time && 'time', !activity && 'activity'].filter(Boolean);
  if (missing.length) {
    console.error('[send-date] Missing fields:', missing.join(', '));
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  // RESEND_API is accepted as a fallback for the variable name already set in this project.
  const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_API;
  if (!apiKey) {
    console.error('[send-date] RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service is not configured' });
  }

  const text = `She accepted the date invitation! 💗

Date: ${date}
Time: ${time}
Activity: ${activity}`;

  const html = `<p>She accepted the date invitation! 💗</p>
<p><b>Date:</b> ${escapeHtml(date)}<br><b>Time:</b> ${escapeHtml(time)}<br><b>Activity:</b> ${escapeHtml(activity)}</p>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to: [EMAIL_TO], subject: SUBJECT, text, html }),
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[send-date] Resend error', response.status, JSON.stringify(data));
      return res.status(502).json({ error: 'Email provider error' });
    }

    console.log('[send-date] Email sent', data.id);
    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('[send-date] Request to Resend failed:', err?.message || err);
    return res.status(502).json({ error: 'Email request failed' });
  }
}

function clean(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
