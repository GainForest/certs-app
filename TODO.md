# TODO — Marketplace / Evaluation Platform Improvements

Source: full UI/UX review (2026-06-10) of the site as a marketplace + evaluation
platform for environmental credits (Bumicerts). Reviewed: home, /bumicerts,
/organizations, /observations, /donations, /leaderboard, bumicert detail pages,
donate modal, sign-in, map/list views, dark + light themes, mobile viewport.

**Core finding:** the site reads as a story gallery, not a marketplace. Buyers
scan for *signal* (verified? how much? how funded? what outcome?) but cards and
detail pages are optimized for prose + photos. Money state, evidence state, and
evaluation state need to be visible at every level: card → detail → checkout.

Legend: `[ ]` open · `[x]` done · `[~]` partially done

---

## P0 — Conversion & honesty

- [x] **Funding signals on explorer cards** — cards showed zero commerce state
  even though an "Accepts donations" filter exists. Added a cached funding
  index (open funding configs + receipt totals) and an "Accepting donations /
  $X raised" pill on `/bumicerts` cards and list rows.
- [x] **Fix the "Accepts donations" client-side filter** — its predicate was
  `() => true` (every loaded record passed). Now checks the funding index.
- [x] **Remove dead donate UI on non-donation projects** — detail page showed
  "Donations are not applicable" *plus* "Raised $0 / Donations 0" *plus* a
  disabled Donate button. Now renders a compact "not accepting donations"
  note instead of dead commerce UI (sidebar + donations tab).
- [x] **Funding goal + progress bar** — `goalInUSD` exists on funding configs
  but was never displayed. Show progress (raised / goal) on the detail
  sidebar and donations tab when a goal is set.
- [x] **Suppress creation-wizard template text** — live cards showed
  "Inspire others to support you. Share about your land…" (×3),
  "Share Your Story, Build Your Community", "Project story" as their real
  descriptions. Sanitized at the data layer.
- [x] **Hide obvious test records from public catalogs** — e.g. "Disposable
  E2E Forest Org Edited" appeared in /organizations. Filtered records whose
  title/name matches disposable-E2E test patterns (manage pages unaffected,
  e2e specs assert only on /manage).
- [x] **2-line titles on cards** — `line-clamp-1` truncated most project names
  ("Trees for Himalayas,…", "FarmIT: A…"). Titles are the product name.
- [x] **Fix "1 people named" grammar** — pluralize person/people everywhere.
- [x] **Honest search placeholder** — placeholder promised "name, keyword, or
  location" but bumicert search only matches title/short description.
- [x] **Stop hiding inventory by default** — explorer defaulted to the
  "Shows photos" filter, silently dropping ~45% of records. Default is now
  "All Bumicerts" (old `?filters=` links still work).
- [x] **Concise card aria-labels** — card buttons exposed the entire card text
  (title + description + pills + org) as their accessible name.

## P1 — Trust & evaluation layer

- [ ] **Evidence-completeness badge** on cards + detail header, e.g.
  "📍 boundaries · 📷 14 photos · 🔊 monitoring · 📄 2 reports". Data already
  exists (locations, observations, timeline attachments) — surface it as a
  scannable trust meter. Start: count per-DID observations/timeline items.
- [ ] **Link observations to bumicerts visibly** — 41.6K sightings are the
  platform's unique dMRV asset but are an afterthought on project pages.
  Show "this project's site has N verified sightings, last one X days ago"
  in the detail header / cards.
- [ ] **Quantified claims: format + validate** — cards show raw "⭔ 24164249 ha"
  (unformatted and implausible). Format (`24.2M ha`) and sanity-check at
  creation time; flag outliers instead of printing them.
- [ ] **Evaluation records (ATProto)** — let third parties publish evaluation
  records against a claim (Hypercerts evaluation model). Add an
  "Evaluations" tab: who reviewed, methodology, verdict.
- [ ] **Verified-org tier** — a "verified by GainForest" badge + default
  catalog view; requires a curation/moderation surface.
- [ ] **Donor identity prompts** — top donor is "Anonymous supporter" ($19.2K
  of $26.9K total): social proof is wasted. Prompt to attach name/pseudonym
  at donation time; let anonymous donors pick a display alias.
- [ ] **Empty-tab annotations** — detail tabs "Site Boundaries" / "Timeline"
  are usually empty voids; annotate counts ("Timeline · 0") or collapse.

## P2 — Marketplace depth

- [ ] **Fiat payments** — donate flow is USDC + wallet only ("Continue to
  wallet"); caps the audience at crypto-natives. Average donation $153.94 is
  card territory (Stripe / embedded-wallet providers).
- [ ] **Donor portfolio + updates** — "you've supported 3 projects, here's
  what happened since": account page section, email/notification when a
  supported project posts evidence, shareable receipt pages.
- [ ] **Buyer-oriented sorts** — "Most funded", "Trending", "Recently active",
  "Closest to goal" (needs funding index server-side or at sort time).
- [ ] **Full-catalog map** — map view only plots loaded pages (pan to Africa →
  5 pins + "Load more" under the map). Add a lightweight geo query that
  returns all coordinates for map mode.
- [ ] **Country facet for projects** — organizations have one, projects don't.
- [ ] **Donate modal transparency** — show where money goes (recipient
  wallet/org), fees ("100% to steward" is a selling point if true), and what
  the donor receives (public receipt, on-chain record).
- [ ] **Recent-donor social proof on detail pages** — "12 people supported
  this, most recently 2 days ago" near the Donate button.
- [ ] **Credits vs crowdfunding decision** — if "credits" is meant literally,
  unitization is missing entirely: quantity, unit price, ownership,
  retirement ledger. Decide the model; current UI is project crowdfunding.

## P3 — Reach, SEO, polish

- [x] **Sitemap detail URLs** — sitemap had only 8 section URLs; every project
  page is a marketplace landing page. Now emits bumicert detail pages.
- [x] **JSON-LD structured data** on bumicert detail pages (Project +
  DonateAction when accepting donations).
- [x] **Organizations fallback art** — broken-image (`ImageOff`) icons
  dominated the org grid; replaced with branded leaf-on-gradient fallback.
- [ ] **SSR first explorer page** — explorer pages render empty HTML for
  crawlers (`revalidate = 60` does nothing; clients fetch everything).
  Clients already accept `initialRecords`/`initialPage` props. Needs care:
  the client-only choice was deliberate (Vercel static-gen timeout); guard
  with a short timeout + fallback to client fetch.
- [ ] **Real inventory on the home page** — "What exactly is a Bumicert" shows
  a hardcoded fictional project (Reforestation of Mount Halimun); the
  homepage shows no real projects at all. Feature live, funded projects.
- [ ] **Org card real signals** — replace generated boilerplate ("A nonprofit
  advancing community-led environmental stewardship.") with real counts:
  # bumicerts, # observations, total raised.
- [ ] **Body-level scrolling** — `main.overflow-y-auto` inner scroll container
  breaks PageDown/Space before focus, scroll restoration, fragment anchors.
- [ ] **Contrast / a11y audit** — muted text on glass pills in dark mode;
  focus states in drawer; map keyboard navigation.
- [ ] **Drawer cleanups** — duplicate platform icons (two YouTube buttons) —
  done for the detail sidebar (dedupe by platform); verify RecordDrawer too.

---

## Implementation notes

- Funding index lives in `app/_lib/funding-summary.ts`: one cached pass over
  `appGainforestFundingConfig` (open + wallet set) joined with cached
  `fetchReceipts()` totals, keyed by bumicert at-uri.
- Template-text + test-record filters live in `app/_lib/indexer.ts`
  (`sanitizeShortDescription`, `isLikelyTestRecordName`) so every surface
  (cards, drawer, detail, search) benefits.
- e2e safety: disposable-org assertions only run on /manage pages, which use
  by-DID fetchers — public-catalog filtering does not affect them.
