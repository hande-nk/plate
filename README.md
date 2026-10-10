# Plate

A progress-first food journal. Photos never leave the phone.
Decisions live in STUDIO_LOG.md (Naz Studio project). Design tokens: `app/globals.css` (v3.1).

## Run it

```bash
npm install
npm test          # 35 failing tests = your to-do list
npm run dev       # http://localhost:3000, speed test at /spike
```

`dev` and `build` use webpack on purpose: Turbopack copies the web worker as a raw .ts file instead of bundling it.

## Who writes what

| Folder | Who | What |
| --- | --- | --- |
| `src/core/` | **Naz** | The intelligent code. Every function throws `TODO(Naz)` until you write it. Tests are the spec. |
| `app/`, `src/workers/`, config | scaffolding | Shell, speed-test harness, tokens. |

## Suggested order (easy to hard)

1. `energy.ts`: Mifflin-St Jeor, TDEE, deficit, target floor. Warm-up, about 20 minutes.
2. `honesty.ts`: one formula and four verdicts.
3. `router.ts`: rules in order of trust.
4. `matcher.ts`: softmax with temperature, the personal prior, add-one smoothing. Watch the overflow test.
5. `labelParser.ts`: regex against messy OCR. The fun one.
6. `kalman.ts`: 2x2 matrices by hand. Hardest. Write `predict` and `update` as separate helpers.

Run one file at a time: `npx vitest energy`. Stuck? Ask the studio for a hint before asking for `/reveal`.

## Speed test (the riskiest assumption)

Pass bar: median under 2 s per photo on Naz's iPhone, after the model loads.
The phone needs HTTPS for WebGPU, so deploy once with `npx vercel` (free Hobby plan) and open `/spike` in Safari.
If it fails on every setting, the matcher moves to a Vercel function (Path B) and nothing else changes.
