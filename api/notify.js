const { randomUUID } = require('crypto');

const SQUARE_BASE = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2024-10-17';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTIFY_TO_EMAIL = process.env.NOTIFY_TO_EMAIL || 'craig@ricelyfe.com';
const NOTIFY_FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || 'Rice Lyfe <onboarding@resend.dev>';

async function sendSignupNotification(email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('notify: RESEND_API_KEY not set, skipping signup notification email');
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: NOTIFY_FROM_EMAIL,
        to: NOTIFY_TO_EMAIL,
        subject: 'New Rice Lyfe signup',
        text: `${email} just signed up to be notified when Rice Lyfe opens.`,
      }),
    });

    if (!res.ok) {
      console.error('notify: Resend notification failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('notify: unexpected error sending signup notification', err);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    console.error('notify: missing SQUARE_ACCESS_TOKEN');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const email = req.body && req.body.email;
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Square-Version': SQUARE_VERSION,
    'Authorization': `Bearer ${token}`,
  };

  try {
    const searchRes = await fetch(`${SQUARE_BASE}/customers/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: {
          filter: {
            email_address: { exact: email },
          },
        },
      }),
    });

    if (!searchRes.ok) {
      console.error('notify: Square search failed', searchRes.status, await searchRes.text());
      return res.status(502).json({ error: 'Signup failed, please try again' });
    }

    const searchData = await searchRes.json();
    const existing = searchData.customers && searchData.customers[0];

    if (existing) {
      const updateRes = await fetch(`${SQUARE_BASE}/customers/${existing.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          preferences: { email_unsubscribed: false },
        }),
      });

      if (!updateRes.ok) {
        console.error('notify: Square update failed', updateRes.status, await updateRes.text());
        return res.status(502).json({ error: 'Signup failed, please try again' });
      }

      await sendSignupNotification(email);
      return res.status(200).json({ ok: true });
    }

    const createRes = await fetch(`${SQUARE_BASE}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idempotency_key: randomUUID(),
        email_address: email,
        reference_id: 'ricelyfe-site-notify-form',
        preferences: { email_unsubscribed: false },
      }),
    });

    if (!createRes.ok) {
      console.error('notify: Square create failed', createRes.status, await createRes.text());
      return res.status(502).json({ error: 'Signup failed, please try again' });
    }

    await sendSignupNotification(email);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('notify: unexpected error', err);
    return res.status(500).json({ error: 'Signup failed, please try again' });
  }
};
