function pacificOffsetMinutes(date) {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const ptDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return (utcDate.getTime() - ptDate.getTime()) / 60000;
}

function getPacificMidnightUTC(date) {
  const offsetMin = pacificOffsetMinutes(date);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;

  const naiveUTCMidnight = new Date(`${y}-${m}-${d}T00:00:00Z`);
  return new Date(naiveUTCMidnight.getTime() + offsetMin * 60000);
}

module.exports = { getPacificMidnightUTC };
