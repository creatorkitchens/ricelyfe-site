const { randomUUID } = require('crypto');
const { SQUARE_BASE, squareHeaders } = require('./_lib/square');
const { sendEmail } = require('./_lib/resend');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTIFY_FORM_REFERENCE_ID = 'ricelyfe-site-notify-form';

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

  const headers = squareHeaders(token);

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

      await sendEmail({
        subject: 'New Rice Lyfe signup',
        text: `${email} just signed up to be notified when Rice Lyfe opens.`,
      });
      return res.status(200).json({ ok: true });
    }

    const createRes = await fetch(`${SQUARE_BASE}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idempotency_key: randomUUID(),
        email_address: email,
        reference_id: NOTIFY_FORM_REFERENCE_ID,
        preferences: { email_unsubscribed: false },
      }),
    });

    if (!createRes.ok) {
      console.error('notify: Square create failed', createRes.status, await createRes.text());
      return res.status(502).json({ error: 'Signup failed, please try again' });
    }

    await sendEmail({
      subject: 'New Rice Lyfe signup',
      text: `${email} just signed up to be notified when Rice Lyfe opens.`,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('notify: unexpected error', err);
    return res.status(500).json({ error: 'Signup failed, please try again' });
  }
};
