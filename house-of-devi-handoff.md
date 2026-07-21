# House of Devi - Project Handoff

Last updated: July 21, 2026. Paste or upload this into a new chat in this project to continue seamlessly.

## What this project is

A website for **House of Devi**, an arts platform that is a program of the **Dalwadi Foundation** (EIN 42-2492631, 2 Azalea Trail Lane, Bellaire TX 77401), based in Houston. Developer is **Rain** (GitHub `rainpurl`, private repo `rainpurl/hod`). The site is **live in production at houseofdevi.org** on Cloudflare Pages (also reachable at hod.katr.es).

Note: the Foundation's 501(c)(3) was pending as of an earlier handoff. Confirm whether it has been granted, since it gates Google for Nonprofits eligibility (see Email system).

## How we work (read this first, it is the most important section)

- **Rain does not use a terminal or any local dev tools.** All deployment happens by dropping files into the **GitHub web UI**, which triggers an automatic Cloudflare Pages build. Never give Rain commands to run locally.
- **Deliver work as small, targeted zips** named `hod-<topic>.zip`, placed in the outputs directory and shared with `present_files`. Include **only the files that changed**, with full folder structure preserved.
- **Build and verify before delivering.** Run `npm install && npm run build` and confirm it ends with "Complete!", then grep `dist/` to confirm the change compiled (prerendered HTML, `dist/_astro/*.css`, and `dist/_worker.js/**/*.mjs` including shared chunks like `dist/_worker.js/chunks/Layout_*.mjs`). Do **not** use `wrangler dev`, it times out in this environment.
- Clean `node_modules dist .astro .wrangler` out before zipping.
- **Never include `src/content/` or `src/data/ledger.json`** in a zip unless a change truly requires it, and if so, flag it explicitly.
- GitHub web upload only **adds or overwrites**. It cannot delete. If a file needs to be removed, tell Rain to delete it manually.
- **No em dashes anywhere** (hard style rule). Arrows (→) are fine.
- When a change needs a **SQL migration**, name the file descriptively and call it out clearly so Rain runs it in Supabase before deploying.
- The footer credit linking to `katr.es` ("built by STUDIO KATRESAI") is **intentional**, it is the studio's site, not Rain's. Leave it.
- **Communication:** keep answers factual, clean, and succinct, not over-formatted; ask before assuming important things; if a turn will take more than about 10 seconds, give a time estimate first.

## Files the staff portal owns (do not overwrite these)

Rain edits real content through the staff portal, and some of those edits commit straight back into the GitHub repo. A delivery zip that includes one of those files would overwrite Rain's live edits with a stale copy. Treat the two groups below as a hard boundary.

**Safe, can never be touched by a GitHub upload** (these live in Supabase, not in files): all appearance and brand settings (logo sizes, colors, fonts, page images, uploaded logos, stored in the `brand` bucket as `site-settings.json` plus images), CRM contacts, the artist directory and member profiles, form submissions, and analytics. Shipping code never affects any of these.

**Portal-owned and at risk** (the portal commits these into the repo via the GitHub API, so never include them in a zip unless the task is specifically to change them): everything under `src/content/**` (blog, board, projects, pages, events, artists), `src/data/footer.json`, and `src/data/ledger.json`.

Rules for the portal-owned files:
- Default to never shipping them. Normal code and feature work does not need them.
- The source snapshot is a point-in-time copy. Its versions of these files may already be behind Rain's live portal edits, so do not treat the snapshot copies as current truth.
- If a task genuinely requires editing one of them, pull the current file from the live GitHub repo first (or have Rain paste it in), edit that, and deliver. Never ship the snapshot's stale copy.
- Before Rain uploads any zip, he should glance at the file list; anything under `src/content/` or `src/data/` is a flag to pause and confirm it belongs.

## Tech stack and key locations

- **Astro 5** (`output: server`, `@astrojs/cloudflare`). Prerendered public pages; SSR (`prerender = false`) for everything under `portal/*`, `edit/*`, and `api/*`.
- **Cloudflare Pages**, project `hod-4nt.pages.dev`, custom domain houseofdevi.org. `wrangler.jsonc` at repo root sets `nodejs_compat`, `disable_nodejs_process_v2`, an **`ai` binding** (Workers AI), and the **R2 binding `UPLOADS`** (used for uploads and the email outbox/queue/quota).
- **Supabase** at `https://cqofvsnfgtljayvjnndh.supabase.co`. Public buckets: `media`, `timeline`, `brand`. Service role via the `SUPABASE_SERVICE_ROLE_KEY` Cloudflare secret.
- All working files live at `/home/claude/houseofdevi/` in the build environment.
- Brand color and font tokens are in `src/styles/global.css` under `:root`.
- Staff auth: `src/lib/staff.ts` (`staffAuthed`), Google allowlist plus a password. Staff dashboard at `src/pages/edit.astro`, developer tools at `src/pages/edit/dev.astro`.
- Core libraries in `src/lib/`: `members.ts`, `crm.ts`, `forms.ts`, `analytics.ts`, `content-admin.ts`, `github.ts`, `storage.ts`, `brand.ts`, `ai.ts`, `zeffy.ts`, `emails.ts`.
- Runtime appearance settings live in the `brand` bucket as `site-settings.json`, written by `src/pages/api/site-settings.ts` and `src/pages/api/page-image.ts`, applied client-side by an inline script in `src/layouts/Layout.astro`.
- Editable footer: `src/data/footer.json` + `src/components/Footer.astro` + `/edit/footer.astro` + `/api/footer.ts`.
- **Scheduled cron:** `src/pages/api/cron/form-digest.ts` + a GitHub Actions workflow. Runs **daily** (9am Central), triggered by curling `hod-4nt.pages.dev/api/cron/form-digest` with `CRON_SECRET` (the pages.dev URL bypasses Bot Fight Mode). It sends the form/membership digest via Resend (katr.es key) and, on every run, **drains the email carryover queue** (see Email system).
- **Emails feature:** `src/lib/emails.ts`, `src/pages/api/email-send.ts`, `src/pages/edit/emails.astro`, plus the tile in `src/pages/edit.astro`. Unsubscribe via `src/pages/unsubscribe.astro` + per-contact `unsubscribe_token` (in `crm.ts`).

## Cloudflare secrets and environment

Set and working:
- `SUPABASE_SERVICE_ROLE_KEY`.
- `CRON_SECRET` (must match the GitHub Actions secret; rotate if still a weak placeholder).
- `GOOGLE_CLIENT_ID`, and the `AI` + `UPLOADS` bindings in `wrangler.jsonc`.
- `RESEND_API_KEY` = the **personal katr.es** Resend key. Used for **staff-facing** automatic mail (the daily digest, contact-form staff notifications).
- `CONTACT_FROM_EMAIL` = automations@katr.es, `CONTACT_TO_EMAIL` = studio@katr.es, `DIGEST_EMAIL` = studio@katr.es. Optional `NEWSLETTER_FROM_EMAIL` override.
- `RESEND_BLAST_API_KEY` = the **House of Devi** Resend account key (a separate Resend account from katr.es, so its quota is its own). Currently powers the Emails composer; planned to become the **client-facing** transactional sender from @houseofdevi.org (see Email system).

Not set yet:
- `ZEFFY_API_KEY`, `ZEFFY_WEBHOOK_SECRET` (pending Zeffy access).
- Gmail send credentials for blasts (OAuth refresh token or service account; see Email system).
- houseofdevi.org is not yet verified in the HOD Resend account with SPF/DKIM (pending email-domain access), so HOD Resend sending is not live yet.

Env changes require a Cloudflare redeploy.

## Current state

- **Domain cutover to houseofdevi.org is complete** (Cloudflare nameserver delegation via Porkbun confirmed). The site also serves at hod.katr.es. Note: `Layout.astro`'s pages.dev guard and `track.ts`'s referrer logic hardcode houseofdevi.org as canonical; confirm that is still the intended primary.
- **All five SQL migrations have been run** in Supabase: `crm-schema`, `forms-schema`, `directory-approval`, `directory-manual-add`, `directory-headshot`. The Emails feature uses R2, so it needed no DB migration.
- **Emails composer shipped** (see Email system).
- **Old CRM "email blast" panel removed.** Its formatting controls were ported into the composer first; CRM contact management (add, edit, tags, import, export, Zeffy sync, unsubscribe) is untouched.
- **Daily digest is live** (9am Central) via the katr.es Resend key, and it also drains the email carryover queue each run. The contact form sends an immediate staff notification.
- **Analytics collection hardened:** client and server now exclude `/portal` and `/api`, skip logged-in members and staff (cookie checks), and filter bots; the `pageviews` table was reset once.
- Earlier shipped and confirmed: the journal "Start a conversation" CTA (links to r/SouthAsianArtCircle), CRM CSV export (`/api/crm-export`, UTF-8 BOM for Excel), the page-image render-timing fix, and the dev status panel (AI model row plus a live DNS delegation check).

## Update - July 21, 2026 (Subscribe toggle, footer newsletter, directory search, Contribute/Partner editors)

Shipped as one combined zip. `brand.ts` is shared across these items, so a single deploy avoids an ordering break. Build verified ("Complete!"), compiled markers confirmed in prerendered HTML and the SSR worker, em-dash clean.

Files changed:
- `src/lib/brand.ts` - removed the `home.heroBtn1` link slot (hero button 1 is no longer an editable link); added `CONTRIBUTE_TEXT_SLOTS` / `CONTRIBUTE_LINK_SLOTS` and `PARTNER_TEXT_SLOTS` / `PARTNER_LINK_SLOTS`.
- `src/pages/index.astro` - hero button 1 is now a fixed "Subscribe" toggle that expands the Zeffy newsletter inline below the CTA (`newsletter-form/subscribe-3`, height 600); button 2 ("Our story" to /about-us) stays editable. The toggle dispatches a window resize event so the pinned horizontal scrollers re-measure after the hero height changes.
- `src/components/Footer.astro` - replaced the native `/api/subscribe` form with the same Zeffy newsletter embed (height 520) in the brand column; removed the old form submit script. The `/api/subscribe` endpoint and its `.ft__sub*` input CSS are now unused but left in place.
- `src/pages/portal/directory.astro` - the directory grid is full width now (removed the 1040px cap, switched to `auto-fill, minmax(220px, 1fr)`); added a client-side search (matches across name, medium, location, bio) and a Grid/List view toggle; card name/meta/bio are wrapped in `.card__text` so list view can lay them beside the photo. Hidden cards use `.card[hidden] { display: none !important }` because `.card { display: flex }` otherwise beats the UA hidden rule.
- `src/pages/get-involved/contribute.astro` and `src/pages/get-involved/partner.astro` - added `data-txtslot` / `data-linkslot` / `data-rich` slots and the per-page `applyPageContent()` script. Text and button overrides are applied per page (not globally); images are the only thing applied globally by Layout.
- `src/pages/edit/contribute.astro` and `src/pages/edit/partner.astro` - new structured-field editors mirroring the Opportunities editor, calling `initPageEditor("/get-involved/contribute")` and `.../partner`. No dates UI.

Manual step still required (not shipped): the repo `edit.astro` still carries the old password flow, so it was deliberately left out of the zip to avoid re-adding the password. Add two tiles by hand in the GitHub web UI, in the "Site edits" section's `tools` array, right after the "Artist Opportunities page" line:
- `{ label: "Contribute page", href: "/edit/contribute", desc: "Edit the text and buttons on the Contribute page." },`
- `{ label: "Partner page", href: "/edit/partner", desc: "Edit the text and buttons on the Partner page." },`

Notes and tradeoffs:
- Both newsletter embeds use the `subscribe-3` Zeffy URL. Heights are single numbers (homepage 600, footer 520). The footer embed sits in the narrow brand column (max 320px), so it renders tall and skinny; raise that column's `max-width` to change it.
- Contribute editability: headings, ledes, card bodies, and buttons are editable, and the card bullet lists are folded into the card body rich fields. The In-kind categories grid (Resources / Space and venue / Services) is intentionally left fixed, since its tag styling would be stripped by the rich-text sanitizer.
- Donate / Give buttons are exposed as editable links; the default href is the on-page anchor `#donate-form`, and leaving a field blank keeps the default. Overwriting the href breaks the scroll-to-form until the field is cleared.

### Post-launch fixes (same day)

Two follow-ups after the batch went live:
- Homepage Subscribe panel: the Zeffy newsletter iframe now preloads (new `eager` prop on `ZeffyEmbed`, sets `loading="eager"`, so it is ready before the click), the panel opens with a `max-height` + `opacity` transition, and it was moved out of the centered hero grid into its own full-width row below the grid, so expanding it no longer re-centers the logo or adds whitespace. Closed state is pixel-identical to before.
- Footer signup: the Zeffy form's card, heading, and colors live inside the cross-origin frame and cannot be styled from the site. To drop the redundant "Subscribe" heading, `ZeffyEmbed` gained a `cropTop` prop that grows the iframe and shifts it up so the container's `overflow:hidden` clips that many pixels off the top. Footer uses `cropTop={60}` with `height={240}`. Both are tunable single numbers: raise `cropTop` if the heading still peeks, lower it if the email field's top is cut; raise `height` if the submit button is cut, lower it to trim empty space below. This crop is brittle by nature (a Zeffy layout change can misalign it); the durable fix would be to blank the form title and set brand colors in the Zeffy dashboard.

## Email system (current build and the plan)

### What is built
The Emails composer at `/edit/emails`: list selection from CRM category tags; BCC-default recipients with To/CC/Reply-to behind a "More options" toggle; a formatting toolbar (H2/H3, bulleted and numbered lists, link, hosted image upload, button, clear) with paste-cleaning; signatures; an outbox with previews; and a live daily/monthly limits indicator. Sending is **Option B**: one personalized message per contact, each with a one-click unsubscribe. Today it sends via the HOD Resend key (`RESEND_BLAST_API_KEY`) with a **95/day cap** and a **carryover queue** drained by the daily digest cron. The From field locks the domain to @houseofdevi.org; only the local part is editable.

### The driving constraint
Resend's free transactional tier is 100 emails/day and 3,000/month, and it counts every To/CC/BCC recipient separately. With about **800 CRM contacts (growing)** and no budget, a full-list blast cannot go out on Resend free. Not every send is to the whole list; most are segmented, with occasional full-list blasts.

### Decided architecture: three send paths, split by recipient
- **Staff-facing automatic mail -> personal katr.es Resend key. KEEP IT, scoped to staff only.** Examples: the daily digest, staff notifications of new submissions/requests. From automations@katr.es.
- **Client-facing automatic mail -> HOD Resend account, from @houseofdevi.org.** Examples: a confirmation to someone who submits a form; artist-directory emails to the applicant (request received, approved, declined). Some of these may be new functionality, not just a repoint. A single form submission may trigger two emails: a client confirmation (HOD key) plus a staff notification (katr.es key). Consider renaming `RESEND_BLAST_API_KEY` to reflect its new role (same account and key).
- **Bulk CRM blasts -> Gmail API via Google Workspace, from @houseofdevi.org.** Workspace allows roughly 2,000 emails / 2,000 external recipients per day per user, so a full-list blast goes out in one day for free. This replaces the 95/day cap with about 2,000/day.

### Google Workspace for Nonprofits (prerequisite for the blast path)
- Enroll the **Dalwadi Foundation** (the 501(c)(3)) in Google for Nonprofits, verified through Google's partner Goodstack. HOD is a program and cannot enroll on its own; fiscally sponsored orgs without their own 501(c)(3) are ineligible. **Requires the Foundation's 501(c)(3) to be granted** (was pending; confirm first).
- The free edition includes professional email at the domain, the full collaboration suite, AI tools, up to 2,000 users, and 100 TB pooled storage, at no cost. It does **not** raise Gmail's sending limits or make Gmail a bulk sender.
- The Workspace account will be on **dalwadi.org**; houseofdevi.org gets added to it. One shared account means an account-level abuse action by Google would affect both domains.

### Sending as @houseofdevi.org from a dalwadi.org Workspace account
In the Dalwadi Workspace Admin console, add houseofdevi.org as a **secondary domain** (not a domain alias), verify ownership, and create the mailbox (e.g. hello@houseofdevi.org) as a user on that domain. It then sends natively as @houseofdevi.org, including via the Gmail API. Sending limits are per user, so this mailbox gets its own roughly 2,000/day.

### DNS for houseofdevi.org with two senders (Resend + Google), and why it is stable
Both Resend (client transactional) and Google (blasts) send from @houseofdevi.org. This is stable, not the fragile case, because the two never share a DNS record. A name can have only one SPF record and SPF has a 10-lookup limit, so the risk is forcing two services into the same root SPF. Resend avoids this: it routes its envelope/Return-Path through a `send` subdomain and signs DKIM with a key whose domain matches @houseofdevi.org. So Google owns the root SPF, Resend owns the send-subdomain SPF, each has its own DKIM selector, and one DMARC record covers both (Google passes via aligned SPF + DKIM, Resend via aligned DKIM).

Target records on houseofdevi.org:
- Root TXT (SPF): `v=spf1 include:_spf.google.com ~all` (Google only).
- Root MX → Google (only if you also want to receive mail at @houseofdevi.org; recommended, it is a real mailbox).
- Google DKIM: the `google._domainkey...` record from the Workspace console.
- `send.houseofdevi.org`: Resend's MX and SPF, exactly as Resend shows them.
- Resend DKIM: its selector record (often a CNAME).
- `_dmarc.houseofdevi.org`: one DMARC record (start at p=none, tighten later).

Stability rules: one SPF record per name and keep the root one Google-only; exactly one DMARC record; paste each provider's records verbatim; in Cloudflare set all of them to DNS only (grey cloud, not proxied), since proxying a DKIM CNAME breaks verification.

Optional hardening (not needed at current scale): to wall the bulk reputation off from the transactional mail, send blasts from a subdomain (e.g. news@email.houseofdevi.org); the cost is the visible From changes.

### Gmail integration (code work, once the domain is live)
Reuse what exists: the CRM (Supabase) as the contact source of truth, the unsubscribe tokens and `/unsubscribe` page, and the send queue and outbox built for the composer. Swap the blast send path from Resend to the Gmail API (one message per call, so keep the existing per-run pacing; the Gmail API supports attachments, removing the limitation where Resend batch blasts could not carry files). Change the blast cap from 95/day to about 2,000/day and have the indicator track Gmail's daily usage. Auth: a stored OAuth refresh token for the mailbox, or a service account with domain-wide delegation that the Dalwadi admin authorizes for the `gmail.send` scope. Both work from Cloudflare Workers over HTTPS.

### Deliverability for blasts
Pacing and chunking help with staying under the daily cap and ramping volume so steady sends read as normal use, but they do not fix content or reputation filtering, and the API does not bypass it. Keep: SPF/DKIM/DMARC on houseofdevi.org; a real one-click unsubscribe with the List-Unsubscribe header (tokens already exist); list hygiene (drop hard bounces and long-inactive addresses, since Gmail gives little bounce/complaint feedback); pace the rare full-list blast and watch inbox vs Promotions placement.

### Building for growth and keeping the sender swappable
Keep the contact list as the source of truth in Supabase and treat the email sender as a swappable backend, so switching providers later means changing the send call, not migrating the list. Free-tier fallbacks if Gmail deliverability disappoints or the list outgrows it: Resend Broadcasts (free up to 1,000 contacts, unlimited sends, auto unsubscribe and bulk headers; about $40/month at 5,000 contacts; lowest switching cost), EmailOctopus (free up to 2,500 subscribers and 10,000 emails/month), Brevo (no contact cap free but a daily send limit of a few hundred). MailerLite's free tier was cut to about 250 subscribers, so it no longer fits. At scale on zero budget, nonprofit discounts on a proper platform are the real lever.

## The other remaining build: Zeffy

Two goals: a **shop/checkout** and **CRM auto-sync** of donors/buyers. Status: blocked on access to the Zeffy account (Rain is not the owner). A message to the owner was drafted offering either to be made admin or to share access.

Facts (verified June 2026): Zeffy has a read-only public API in beta (payments, contacts, campaigns; key under Settings → Organization → Integrations; rate limit 100/min) and supports webhooks (a `payment.completed` event POSTs the full payment object). The shop is hosted by Zeffy; the site links to or embeds the Zeffy-hosted page. To grant access, the owner uses Settings → Manage users to invite, then can transfer the single owner role or grant Campaigns + Contacts permissions.

Code in place: `src/lib/zeffy.ts` and `src/pages/api/zeffy-webhook.ts`; the CRM page has a "Sync from Zeffy now" button. To finish once access is granted: set `ZEFFY_API_KEY` and `ZEFFY_WEBHOOK_SECRET`; point a Zeffy webhook at `https://houseofdevi.org/api/zeffy-webhook?key=<that secret>`; build a Shop page that links to or embeds the Zeffy store; test the sync (the beta contacts endpoint may need a small tweak after a real call).

## Open decisions and prerequisites

- [ ] Confirm the Dalwadi Foundation's 501(c)(3) is granted (gates Workspace for Nonprofits).
- [ ] Enroll in Google for Nonprofits (Goodstack); activate Workspace; add houseofdevi.org as a secondary domain; create hello@houseofdevi.org.
- [ ] Publish the Email-system DNS records on houseofdevi.org; verify houseofdevi.org in the HOD Resend account; verify the Google domain.
- [ ] Confirm the staff-vs-client split of each automatic email, including whether a client confirmation on form submit is wanted (may be new functionality).
- [ ] Decide the composer's one-off direct-send path (Gmail for attachment support and shared identity, or keep on Resend).
- [ ] Decide the Gmail auth method (OAuth refresh token vs service account with domain-wide delegation).
- [ ] Then the code work: repoint client transactional onto the HOD Resend key from @houseofdevi.org, keep staff mail on katr.es, and add the Gmail blast send path.
- [ ] Zeffy: still blocked on account access.
- [ ] Domain canonical: confirm houseofdevi.org vs hod.katr.es as primary (Layout/track.ts hardcode houseofdevi.org).

## Optional cleanup (none urgent)

- Rotate `CRON_SECRET` if it is still a weak placeholder.
- Retire the old Wix site if not already done.
- Add photos to the "Now" point on the timeline if still empty.
- Re-export the footer logo cropped tight so it stops depending on the CSS crop.

## Hard-won gotchas worth remembering

- **Layout head scripts must be wrapped in `DOMContentLoaded` guards** to avoid timing races with page body parsing. Page images apply to elements inside the body and must wait; color/font/size settings apply to `<html>` and do not. This asymmetry caused an earlier "images do not save" bug that was actually a render-timing issue.
- **No em dashes in delivered code** (verified clean on all zips). Run the em-dash grep as its own command, since grep returns exit 1 on no matches and would break an `&&` chain.
- **Portal-managed files** (`src/content/`, `src/data/footer.json`, `src/data/ledger.json`) are repo-committed and at risk of being overwritten by a code zip. Supabase-stored data (appearance, CRM, directory, forms, analytics) is structurally immune.
- **SSR pages compile to `dist/_worker.js/pages/<name>.astro.mjs`** (plus chunks). Verify expected strings in that page module. Minification normalizes quote style, so grep quote-agnostic raw substrings.
- The **houseofdevi.org Resend key is its own separate account**, so the 95/day cap is exact with no shared-quota concern. Resend free tier: 100/day per-recipient, 3,000/month.
- When a feature "does not work" after a fix, first check whether the relevant file was actually in the last uploaded zip. Web uploads only overwrite the files dropped in.
- `site-settings.json` and the brand images are served `no-cache` with open CORS, so cross-origin fetches from the site and dev page both work.
