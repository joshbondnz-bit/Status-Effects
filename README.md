# Status Effects

A drinking tracker for harm reduction, framed like a video game. Blood alcohol is a health bar; the effects of drinking are debuffs with countdowns; good choices are buffs.

## What's in this folder

| Path | What it is |
|---|---|
| `status-effects.html` | The clickable prototype. Open it in a browser. It's the visual reference for the real app. |
| `app/` | The real app (Expo / React Native, for iPhone, Android and web). Uses the engine directly. |
| `engine/src/` | The app's brain, in TypeScript: the blood alcohol model, health bar, debuffs, and guidelines. No screens, no wording. |
| `engine/test/` | Automated checks that the engine does what we expect. |
| `package.json` | Project settings and the `npm test` command. |

### Engine files

- `types.ts`: the shapes of things (a profile, a drink, a logged event).
- `drinks.ts`: grams of alcohol, standard drinks by region, calories, drink presets.
- `bac.ts`: the blood alcohol simulation, minute by minute: absorption, food, body water, elimination.
- `hp.ts`: turns blood alcohol into health points and phases (Fresh to Danger).
- `effects.ts`: which debuffs and buffs apply, when they start and end, and how severe they are.
- `guidelines.ts`: weekly guidance by region, Canada's risk continuum, and AUDIT-C scoring.

## Running the tests

You need [Node.js](https://nodejs.org) 23.6 or newer (it runs TypeScript directly, so there's nothing else to install).

```bash
npm test
```

Every line should show a green tick. If you change how the model works, run this again; a red cross tells you exactly which behaviour changed.

## Running the app

```bash
cd app
npx expo start
```

- Press `w` to open it in your browser.
- Or install **Expo Go** on your phone and scan the QR code it prints (phone and computer on the same Wi-Fi).

App code lives in `app/src/`: `screens/` (whole screens), `components/` (health bar, effect cards, drink sheet, pixel sprites), `copy.ts` (all wording), `sprites.ts` (pixel art), `theme.ts` (colours and fonts).

## Known gaps before launch

- **Calibration.** The model uses population averages. It should be checked against published blood alcohol curves, and it likely underestimates peaks for small doses because real elimination slows at low levels.
- **Sources.** Guideline figures, AUDIT-C cut-offs, helplines and research numbers need checking against the original documents.
- **Wording.** Debuff descriptions currently live in the prototype; they move into the app's screens.

## Roadmap

1. Engine extracted and tested (done).
2. App stack chosen: Expo / React Native (done).
3. Rebuild screens against the prototype: Tonight (first version done), then History, Science, Options and onboarding.
4. On-device storage, then optional accounts and sync.
5. Morning-report notifications, Apple Health / Health Connect for HRV, barcode scanning.
6. Sourcing and safety review.
