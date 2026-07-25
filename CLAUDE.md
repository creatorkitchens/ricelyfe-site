# Rice Lyfe Site

Single-page "coming soon" landing site for Rice Lyfe — a Japanese-Korean fusion
inari and rice bowl concept operating out of a walk-up window at 478 Shotwell
St, San Francisco. The kitchen is rented from Joey the Cat Arcade, but the
arcade is NOT open to the public — do not write copy that invites people to
enter the arcade or treats it as a second entrance. Customers were ringing
the arcade's door looking for Rice Lyfe before this was corrected in the site
copy (2026-07); the walk-up window on Shotwell is the only public access
point. Soft opening targeted August 2026 (site copy has slipped from
"mid-July" → "second half of July" → "late July" → "August" as the timeline
has moved; window is still waiting on SF permit approval — expect this to
keep shifting).

## Structure

- `index.html` — the entire site. No build step, no framework, no dependencies
  beyond Google Fonts (loaded via `<link>` tags).
- All CSS is inline in a `<style>` block in the `<head>`.
- Logo and wordmark images are embedded directly as base64 data URIs inside
  the HTML (`data:image/png;base64,...`). There are no separate image asset
  files in this repo — if the logo needs to change, the base64 string inside
  `index.html` needs to be regenerated and swapped in-place.
- `api/notify.js` — a Vercel serverless function (Node, `module.exports = async
  (req, res) => {...}`, no framework). The only backend code in this repo; see
  "Notify signup / Square sync" below.

## Deployment

- Hosting: Vercel, connected via GitHub integration.
- Pushing to `main` auto-deploys to production. No manual Vercel dashboard
  steps needed for routine content updates.
- Domain: ricelyfe.com (root) and [www.ricelyfe.com](https://www.ricelyfe.com) both point to Vercel.
  DNS is managed in Squarespace Domains (domain registered there, but the
  site itself is NOT hosted on Squarespace — DNS was repointed to Vercel).
  - `A` record: `@` → `76.76.21.21`
  - `CNAME` record: `www` → `cname.vercel-dns.com`
- GitHub repo: `creatorkitchens/ricelyfe-site` (same org/account as Creator
  Kitchens — this is a separate project, not related to CK).

## Brand

- Palette: cream (#F5F0E3), cream-dark (#EDE5CE), olive-deep (#2C3020),
  olive-mid (#6B7A57), gold (#C4A028), gold-light (#D4B84A).
- Fonts: Cormorant Garamond (headings/serif accents), Jost (body copy),
  JetBrains Mono (labels, eyebrows, mono/uppercase UI text).
- Voice: confident, understated, culturally specific — avoid generic
  "restaurant marketing" tone. Copy should read like a person with a point
  of view, not a business announcing itself.

## Current content notes

- Menu items shown are a preview/subset, not the full opening menu. Pricing
  tiers exist conceptually (Classic ~$5, Signature ~$6, Elevated for
  premium items like the Hokkaido scallop) but tier labels are NOT shown
  visually on the site — keep it to item-level tags only (e.g. "Signature",
  "Classic", "Elevated", "Add-on") so the page stays about excitement, not
  pricing logic.
- Standard Deviant Brewing collab item (black lager & miso ribeye) has its
  own dedicated section — treat future collabs the same way rather than
  folding them into the regular menu grid.
- Inner Circle membership section intentionally avoids the word "discount."
  Membership is positioned as community/belonging (reusable box, free
  monthly 4-pack that resets with no carryover, first access to drops,
  partner perks) — not a percentage-off program.
- DoorDash / Uber Eats are NOT linked anywhere on the site currently.
  Delivery is being handled through Square (customer pays the delivery fee
  there) until further notice.

## Notify signup / Square sync

- The hero "Notify me" form (`#notify-form` in `index.html`) is live, real
  functionality — not a placeholder. On submit it POSTs `{ email }` to
  `/api/notify`, which upserts the address into Square's Customers API
  (search by exact email, update if found, else create with
  `preferences.email_unsubscribed = false` and `reference_id:
  "ricelyfe-site-notify-form"`). Confirmed working end-to-end as of 2026-07 —
  Craig has seen real signups land in Square.
- Requires the `SQUARE_ACCESS_TOKEN` env var to be set in Vercel's project
  settings (Production env). Without it, `/api/notify` returns a 500 and the
  form shows the "Something went wrong" error state.
- Square API version is pinned in code (`Square-Version: 2024-10-17` in
  `api/notify.js`) — bump deliberately, not incidentally, if touching that
  file.
- The nav bar itself has no "Get notified" / "Order now" shortcut link — only
  the hero form and the Lab Day section link to `#notify`.
- On a successful signup, `api/notify.js` also emails Craig (`craig@ricelyfe.com`
  by default, overridable via `NOTIFY_TO_EMAIL`) via Resend so he knows in
  real time. Requires `RESEND_API_KEY` in Vercel's env vars — without it the
  function just logs a warning and skips the notification (signup to Square
  still succeeds). The `from` address defaults to Resend's sandbox
  `onboarding@resend.dev`, which can only deliver to the email address used to
  create the Resend account — if that's not `craig@ricelyfe.com`, either
  verify a domain in Resend for a real `from` address, or set
  `NOTIFY_TO_EMAIL` to match the Resend account's own email.
- Shared helpers live in `api/_lib/` (`square.js`, `resend.js`,
  `pacific-time.js`) — Vercel doesn't treat underscore-prefixed paths under
  `api/` as routes, so these are safe to `require()` from both `notify.js`
  and `daily-signups.js` without becoming their own endpoints.

## Daily signup report (`api/daily-signups.js`)

- Runs on a Vercel Cron schedule defined in `vercel.json` (`0 7 * * *` UTC,
  i.e. ~midnight Pacific year-round — the offset is computed dynamically so
  it holds across the PST/PDT switch). Emails Craig via Resend with today's
  signup count and the cumulative total, both counted from Square customers
  with `reference_id: "ricelyfe-site-notify-form"`.
- If `CRON_SECRET` is set in Vercel's env vars, the endpoint requires
  `Authorization: Bearer <CRON_SECRET>` (Vercel's cron invoker sends this
  automatically once the env var exists) — this stops anyone else from
  hitting the endpoint and triggering emails/API calls on demand. Optional
  but recommended; without it the endpoint has no auth of its own.
- Vercel's Hobby plan allows cron jobs but the trigger time isn't
  millisecond-precise — expect the email within roughly an hour of 07:00 UTC,
  not exactly on the minute.
- Uses the same `SQUARE_ACCESS_TOKEN` and Resend env vars as the notify
  signup flow — no separate credentials to manage.

## What this repo is NOT (yet)

- No ordering/checkout functionality — "Order now" links (meta-row, Lab Day)
  point out to `https://order.ricelyfe.com`, not an embedded checkout in this
  site.
- No CMS or database for content — every copy/menu change is a direct edit to
  `index.html` and a git push. (The notify form is the one exception with a
  real backend — see above.)
- No connection to Square's Catalog API yet. Sold-out states, live pricing,
  and item availability are all manually maintained in the HTML for now.
  (Future direction under discussion: pull menu/availability from Square
  directly rather than hardcoding it here.)

## Working in this repo

- Most changes are simple text/copy edits, price changes, or small style
  tweaks inside `index.html` — no need to scaffold new files for those.
- When adding new menu items or sections, match the existing card/grid
  patterns already in the file rather than introducing new layout systems.
- After any change: commit and push to `main` to trigger the Vercel
  redeploy. No separate deploy command needed.
- Craig sometimes edits `index.html` directly in Google Drive
  (`My Drive/RICELYFE/index.html`, under the craig@ricelyfe.com account)
  before asking for it to be copied into this repo. If asked to make a copy
  edit, check whether an updated version already exists in Drive rather than
  editing the repo's `index.html` in parallel — otherwise the two copies can
  diverge. Local filesystem access to that Drive folder is blocked by macOS
  permissions, so pulling it requires going through the Drive web UI
  (download the file, then replace it in the repo).
