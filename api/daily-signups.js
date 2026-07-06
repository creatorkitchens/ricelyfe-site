const { squareHeaders, countCustomers } = require('./_lib/square');
const { sendEmail } = require('./_lib/resend');
const { getPacificMidnightUTC } = require('./_lib/pacific-time');

const NOTIFY_FORM_REFERENCE_ID = 'ricelyfe-site-notify-form';

module.exports = async (req, res) => {
  if (process.env.CRON_SECRET) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    console.error('daily-signups: missing SQUARE_ACCESS_TOKEN');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const headers = squareHeaders(token);
  const now = new Date();
  const todayStart = getPacificMidnightUTC(now);

  try {
    const [todayCount, cumulativeCount] = await Promise.all([
      countCustomers(headers, {
        reference_id: { exact: NOTIFY_FORM_REFERENCE_ID },
        created_at: { start_at: todayStart.toISOString(), end_at: now.toISOString() },
      }),
      countCustomers(headers, {
        reference_id: { exact: NOTIFY_FORM_REFERENCE_ID },
      }),
    ]);

    await sendEmail({
      subject: `Rice Lyfe signups — ${todayCount} today, ${cumulativeCount} total`,
      text: `Today: ${todayCount} new signup${todayCount === 1 ? '' : 's'}\nCumulative total: ${cumulativeCount} signup${cumulativeCount === 1 ? '' : 's'}`,
    });

    return res.status(200).json({ ok: true, today: todayCount, cumulative: cumulativeCount });
  } catch (err) {
    console.error('daily-signups: unexpected error', err);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
};
