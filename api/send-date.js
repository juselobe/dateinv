const EMAIL_TO = 'duoke.oke@gmail.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { date, time, activity } = req.body || {};
  if (!date || !time || !activity) return res.status(400).json({ error: 'Missing fields' });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'Email service is not configured' });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Date Invitation <onboarding@resend.dev>',
      to: [EMAIL_TO],
      subject: '💗 Новый ответ на приглашение',
      html: `<h2>💗 Новое свидание</h2><p><b>Дата:</b> ${escapeHtml(date)}</p><p><b>Время:</b> ${escapeHtml(time)}</p><p><b>План:</b> ${escapeHtml(activity)}</p>`
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) return res.status(502).json({ error: 'Email provider error' });
  return res.status(200).json({ ok: true, id: data.id });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
