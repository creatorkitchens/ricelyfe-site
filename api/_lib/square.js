const SQUARE_BASE = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2024-10-17';

function squareHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Square-Version': SQUARE_VERSION,
    'Authorization': `Bearer ${token}`,
  };
}

async function countCustomers(headers, filter) {
  let count = 0;
  let cursor;

  do {
    const body = { query: { filter }, limit: 100 };
    if (cursor) body.cursor = cursor;

    const res = await fetch(`${SQUARE_BASE}/customers/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Square search failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    count += (data.customers || []).length;
    cursor = data.cursor;
  } while (cursor);

  return count;
}

module.exports = { SQUARE_BASE, SQUARE_VERSION, squareHeaders, countCustomers };
