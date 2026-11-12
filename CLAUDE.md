# CLAUDE.md: Plate

Lines marked **CONFLICT** are places where Naz's product brief and the code disagree. Do not resolve them yourself. Ask Naz.

## 1. What Plate is
Plate is a phone web app (PWA) for the Tufts meal plan. A student snaps a photo of their plate, the app ranks likely dishes, and the student confirms dishes and servings to log the meal. It adds a weight trend, feelings per plate, a Sunday edition, and a detective story (Safiye Hanım) on top of that log.

## 2. Stack and local run
- Next.js 16 (App Router) + React 19 + TypeScript 5.9 strict. Geist font. Plain CSS tokens in `app/globals.css`, no Tailwind.
- On device: `@huggingface/transformers` (CLIP, in a web worker) and `tesseract.js` (label and screenshot OCR).
- Supabase (Postgres, auth, RLS, Cron, Vault). Web Push via `web-push`. Vitest. Hosted on Vercel, auto-deploy from `main`.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest run, all of src/core
npx vitest matcher   # one file
npm run typecheck    # tsc --noEmit
npm run build
```
- `dev` and `build` must keep `--webpack`. Turbopack ships the web worker as raw .ts.
- Env vars in `.env.local` (never commit, never print values): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PUSH_TICK_SECRET`, `USDA_API_KEY`.
- Vercel env changes need a redeploy. WebGPU and push need HTTPS, so test those on the deployed site.
- Migrations are numbered SQL files run by hand in the Supabase SQL editor. There is no Supabase CLI config. Never edit a migration that has run. Add the next number.

## 3. Repo map
- `app/`: one folder per screen, each a client `page.tsx`. `/` Today, `/log`, `/add`, `/snack`, `/order`, `/weigh`, `/progress`, `/edition`, `/case`, `/treats`, `/profile`, `/welcome`, `/login`.
- `app/api/`: `push/tick` (cron target), `push-test`, `usda` (FoodData Central proxy). Node runtime.
- `app/eval`, `app/portion-spike`, `app/push-spike`, `app/preview/*`: unlinked test benches. Keep them unlinked.
- `src/core/`: pure logic, one `x.ts` plus `x.test.ts` each (33 modules, 34 test files, about 344 tests). Naz's code.
- `src/components/`: shared UI (HungerFlow, TeaGlass, GlassPuzzle, ClueSheetV2, LogCalendar, Usuals, MissingDish, cards).
- `src/lib/`: glue that touches Supabase or the browser (`supabase.ts`, `photos.ts` IndexedDB, `push.ts`, `caseFile.ts`, `clueAfterSave.ts`, `treatRoom.ts`, `day.ts`). `storyArt.ts` is generated SVG, 85 KB. Do not read or hand-edit it.
- `src/workers/`: `matcher.worker.ts` (CLIP), `detector.worker.ts` (parked portion spike).
- `supabase/migrations/`: 0001 to 0017. `public/`: `sw.js`, manifest, icons. `design/`: icon source.

## 4. Build status (read from the code on Nov 12, 2026; tests not run in this pass)
**Built and wired**
- Login guard on every screen, Welcome, Profile (saves per field, JSON export, delete account).
- `/log`: photo, CLIP ranks the hall's dishes, personal prior, top 8, servings 0.5/1/1.5/2, "when" chips, search fallback (`MissingDish`), usuals, clue check.
- `/add` (label OCR into the dish library, Atwater plausibility), `/snack` (label, fraction of packet), `/order` (mobile-order screenshots, USDA estimates).
- Today feed, feeling chips, calendar, `/weigh` with Kalman trend, `/progress` with honesty card, `/edition` with deduction and treat proposal, `/case` story with choices and voice notes, `/treats`, hunger flow with tea glass and puzzle.
- Push: Supabase Cron every 15 min, `push_tick()`, `/api/push/tick`, `duePushes`, `record_pushes()`.

**Partial**
- Eval: `/eval` computes Hit at 1, Recall at 3 and 8, and ms, but results live in localStorage on one phone and leave by "Copy results". CLIP only, flat prior. No results file in the repo.
- Dietary: `avoids` and `allergy_note` are saved on the profile and shown in Profile. Nothing reads them to filter, warn, or suggest.
- `MentionDishesToggle.tsx` exists but no screen imports it.
- `public/sw.js`: listens for `"active"` and calls `waitUnitl`. Both are typos, so the activate handler never runs.

**Stubbed or parked**
- `routeItem` in `core/router.ts` has tests but no caller. Screens set `route` by hand.
- `core/count.ts`, `detector.worker.ts`, `/portion-spike`: photo portion counting, failed on iPhone, kept for the write-up.
- Friends toggle is disabled ("spring, opt-in"). Dark mode tokens are a TODO in `globals.css`.

**Not started (no code found)**
- Daily menu data, model training or fine-tuning, meal ratings, Constellation, photo-painted theme, Side Quests, any social feature, +/- count for "each" dishes, tap-the-plate crop matching.

## 5. Ship rules for Dec 1, 2026
1. The daily loop comes first: open, snap, confirm, feeling. Target is under 10 seconds per meal. Do not add steps to `/log`.
2. Second: a reportable eval. Finish the 12-photo run and commit the numbers to the repo.
3. Third: fix what breaks on the phone before building anything new (`sw.js` typos, README).
4. Deferred until after Dec 1 unless Naz says otherwise: everything under "Not started", dark mode, friends, visual memory, photo portion estimation.
5. Do not start a new screen, table, or dependency without Naz's yes. Software budget is $0.
6. Never show a card with invented data. If the data is not there yet, say when it will be.
- **CONFLICT**: the brief says MVP ships Dec 1. STUDIO_LOG (Oct 26) moved the demo to Dec 13.
- **CONFLICT**: the brief lists Constellation, a photo-painted theme, and Side Quests as features. None exist in code, and STUDIO_LOG parks Side Quests after Dec 1 and rejects "night sky and planets."

## 6. Data and ML
- Dish data: a private per-user `dishes` table. Rows come from on-phone OCR of nutrition labels and screenshots (`/add`, `/snack`), order parts (`/order`), and USDA FoodData Central estimates via `/api/usda`. USDA rows are labeled as estimates with a low to high range.
- **CONFLICT**: the brief says the photo is matched against that day's menu at Carmichael, Dewick, or Hodgdon. The code has no daily menu. `menu_items` was dropped in migration 0002, and `/log` scores every dish the user has saved for the chosen hall. Halls in code are `carm`, `dewick`, `hodge`, `kindlevan`.
- Do not scrape Nutrislice or call its API. Do not add a nightly menu job.
- Matcher: `Xenova/clip-vit-base-patch32`, zero-shot, prompt "a photo of {}". Desktop runs WebGPU fp16. Phones run wasm q8 on a photo shrunk to 1080 px. Keep that split, phones crash otherwise.
- Scoring is `core/matcher.ts`: softmax over CLIP scores times a personal prior built from past `meals.dish_id` with add-one smoothing.
- **CONFLICT**: the brief says a real model trained or fine-tuned on app data. The code trains nothing. The only learning is the personal prior.
- **CONFLICT**: the brief says the app identifies servings. The user picks servings by hand. The photo never sets a portion.
- Labels: each logged `meals` row (dish_id, portion, photo_key) is a confirmed label. Photos stay on the phone, so image and label only meet on that device.
- Eval: open `/eval` on the phone, pick a hall, shoot a plate, tap the true dishes, count dishes missing from the library, save. Goal is 12 plates. Metrics come from `core/accuracy.ts`. Missing dishes stay out of recall.
- Report numbers exactly as measured, with plate count and device. Never round up or hide a bad result.
- **CONFLICT**: the brief says meal ratings. The code stores a feeling per plate (energized, satisfied, heavy, hungry), not a rating.

## 7. Privacy rules
- Plate photos never leave the phone. They live in IndexedDB (`src/lib/photos.ts`). The database stores only `photo_key`. Never upload a photo, never add a storage bucket for photos, never send a photo to a hosted model.
- All model inference and OCR run on the device. Label and order screenshots are read, then dropped. Never save them.
- Every table has row-level security scoped to `auth.uid()`. Every new table gets RLS and a cascade from `auth.users` in the same migration.
- No `service_role` key anywhere in the app or on Vercel. Server routes act with the user's token or a shared secret checked by a database function.
- Only `NEXT_PUBLIC_*` values reach the browser. `VAPID_PRIVATE_KEY`, `PUSH_TICK_SECRET`, and `USDA_API_KEY` stay server-side.
- Dietary data (`avoids`, `allergy_note`), weight, and cravings are sensitive. Keep them in the user's own rows. Never log them, put them in a push body, a URL, or an analytics call.
- Respect `hide_numbers` (no kcal or macros) and `hide_weight` (trend only) on every screen that shows either.
- Export and delete must keep working: the JSON export excludes photos, and `delete_my_account()` removes the user's rows and login.
- No medical claims. Allergy notes are the user's own note, not a safety check. Never imply a dish is safe for an allergy.
- Safiye never mentions weight, bodies, calories, or amounts. Clues come from logging only, never from eating less.

## 8. Coding conventions seen in the code
- `src/core/` is Naz's. Give her types, a skeleton, and tests. Write core logic only when she types `/reveal`. Scaffolding, pages, and config are fine to write when asked.
- Core functions are pure: no Supabase, no DOM, no `Date.now()` inside. Pass `now` and `tz` in. Every core file has a test file beside it.
- Import with the `@/` alias (`@/core/...`, `@/lib/...`). Workers load by relative `new URL(...)`.
- Pages are `"use client"`, check the session first, and `router.replace("/login")` when there is none.
- Supabase calls go through `src/lib/supabase.ts`. Check `error` and show its text. Bonuses (photo save, clue check) never block a meal save.
- One meal is one insert of several `meals` rows that share `eaten_at` and `photo_key`. A plate is the pair `eaten_at|photo_key`.
- Day math uses the profile time zone with `Intl.DateTimeFormat("en-CA", { timeZone })`. Never use `toISOString()` for a local day.
- Styling: tokens and classes from `globals.css` (`.card`, `.btn`, `.btn-quiet`, `.choice`, `.muted`, `.glass`) plus inline styles. Matcha means progress only. Selection is ink. Glass is for controls only. Tap targets are 44 px minimum.
- Buttons are `type="button"` with `aria-pressed` for toggles. Respect reduced motion.
- No `any`. Double quotes. Short comments that say why. Database columns stay snake_case in TypeScript.
- Bump the comment version in `public/sw.js` whenever it changes.
- Commit messages are short and lowercase.

## 9. Writing rules for user-facing copy
- No em dashes. Use commas, periods, colons, or parentheses.
- Never use: leverage, spearhead, passionate about, delve, tapestry, testament to, unlock, elevate.
- Short, specific, warm. Say the real thing ("Photos stay on this phone"), not a slogan.
- Never use guilt, streak pressure, or "earned" food. Treats are "planned and enjoyed."
- New Safiye lines and new card copy are drafts until Naz approves them. Mark them as drafts.

## 10. Open questions for Naz
1. Ship date: Dec 1 or Dec 13?
2. Daily menu: is the per-hall private library the "menu" for the MVP, or do you want a real daily menu source? The log rules out Nutrislice scraping.
3. ML claim: is CLIP plus the personal prior the MVP model, or does a trained or fine-tuned model have to ship? If yes, where does training run at $0, and how do photos leave the phone for it?
4. Eval: where should results live in the repo (for example `eval/results.json`), and is 12 plates enough to report?
5. Ratings vs feelings: are the four feeling chips the "meal ratings", or is a rating a separate thing?
6. Dietary help: what should `avoids` and `allergy_note` do before Dec 1, if anything?
7. Easter eggs: are Constellation, the photo-painted theme, and Side Quests in the MVP? Does Constellation clash with the rejected "night sky and planets"?
8. Design reference: the brief says "Plate v3", `globals.css` says tokens v3.1, the log mentions v3.2 and v3.3 frames. Which one wins? "More people" has no code yet.
9. Halls: the brief names three. The code has four (Kindlevan). Keep four?
10. Cleanup you may want: both `package-lock.json` and `yarn.lock` are committed, an empty file `0005` sits at the root, README still says "35 failing tests" and points at `/spike`, the production URL is hard-coded in two routes and migration 0007, there is no lint script, and migrations 0001 and 0004 disagree on column names (`age` vs `age_years`, `day` vs `weighed_at`).
