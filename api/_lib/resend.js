const NOTIFY_TO_EMAIL = process.env.NOTIFY_TO_EMAIL || 'craig@ricelyfe.com';
const NOTIFY_FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || 'Rice Lyfe <onboarding@resend.dev>';

async function sendEmail({ to = NOTIFY_TO_EMAIL, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('resend: RESEND_API_KEY not set, skipping email:', subject);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from: NOTIFY_FROM_EMAIL, to, subject, text }),
    });

    if (!res.ok) {
      console.error('resend: send failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('resend: unexpected error sending email', err);
  }
}

module.exports = { sendEmail, NOTIFY_TO_EMAIL, NOTIFY_FROM_EMAIL };
