# App Store listing (draft)

Everything below goes into App Store Connect when the app is set up there. Character limits are Apple's.

## Name (30 max)

**Status Effects: Drink Tracker** (29)

The home-screen label is **StatusFX** (set in `app/app.json`).

## Subtitle (30 max)

**See what each drink does** (24)

Kept plain on purpose: outside the app, say what it does without game words.

## Promotional text (170 max, can change any time without a new version)

Log your drinks and watch your HP. Status Effects shows how tonight is hitting your body, your sleep and tomorrow, so you can decide when to call it. (149)

## Description (4,000 max)

Status Effects shows what each drink is doing to you, as it happens, styled like a classic video game.

YOUR HP RING
Every drink drains your HP based on your body, what you've eaten and how fast you're drinking. Watch it drain in real time, see where you're heading before you order the next one, and get a clear warning before you reach dangerous levels.

BUFFS AND DEBUFFS
Drinks come with status effects: Impaired judgment, Dehydration, Impaired sleep, Hangover, Slow recovery and more, each with a timer and a severity. Water, food and a slower pace earn buffs. Tap any effect to see what it means, and the Science tab shows the research behind each one.

ALCOHOL FORECAST
See your blood alcohol across the night: when you'll peak, how much will still be in your system at bedtime, and when it clears. Try "what if one more?" before you decide.

THE MORNING AFTER
A morning report sums up last night: drinks, lowest HP, sleep, and the debuffs still running. Tell it how you feel, and History learns how many drinks your mornings can take.

HISTORY
A calendar coloured by how much you drank, weekly totals against your region's guidelines, alcohol-free streaks and achievements. Tap any night for its full recap.

BUILT FOR REAL NIGHTS OUT
- One-tap logging, with sizes for your region: pints, cans, schooners, handles, shots
- Build your own mixed drinks
- Save your regular drinks with prices, and track what you've spent
- Guidelines and help lines for Canada, the US, the UK, Australia, New Zealand and Europe
- Dark and light themes

PRIVATE BY DESIGN
No account, no ads, no tracking. Everything stays on your phone.

IMPORTANT
Status Effects gives estimates based on population averages. It is not a breathalyser or medical advice, and it never tells you you're safe to drive. Never drink and drive. If someone shows signs of alcohol poisoning, call your local emergency number. For people of legal drinking age only.

## Keywords (100 max, comma-separated, no spaces needed)

drink,tracker,alcohol,BAC,blood alcohol,hangover,units,drinking,RPG,HP,calories,sleep,beer,wine (95)

## Category

Primary: **Health & Fitness**. Secondary: **Lifestyle**.

## Age rating

Answer "Frequent/Intense" for alcohol, tobacco or drug use or references. That gives the app Apple's highest age rating, which is expected for a drink tracker.

## App Review notes (4,000 max)

Paste this into App Store Connect under App Review Information → Notes. It explains the game style before the reviewer guesses, and points them at the safety features. Update the last paragraph once the paid unlock ships.

> Status Effects is a harm-reduction tool for adults who drink. It aims to make tracking your drinking engaging, so people make informed choices, drink less, and see how alcohol's effects carry into the next day.
>
> The game style is there to help people learn, and drinking is always the cost, never the reward. Every drink lowers your HP, and the debuffs show real effects (impaired judgment, dehydration, poorer sleep, hangover) with timers from the published research cited in the Science tab. What earns buffs and achievements is restraint: drinking water, eating, pacing to one drink an hour or slower, staying within your region's weekly guideline, finishing the night clear by bedtime, and alcohol-free days and weekends. The app never rewards drinking more, and there are no scores or leaderboards for how much you drink.
>
> Safety features:
> - Setup includes a safety screen. The app's numbers are estimates and not a breathalyser reading. It never says you are safe to drive. It shows your local emergency number. It is for people of legal drinking age only.
> - At very high estimated blood alcohol (0.15% and over), or when HP reaches 0, a safety check-in opens. It asks whether someone sober is with you, offers to text a friend (you pick the recipient) or call the emergency number, and lists the signs of alcohol poisoning. It returns every 30 minutes while the level stays that high.
> - The impaired judgment effect says plainly that it is not a driving clearance, and to not drive tonight.
> - Weekly guidelines and help lines are shown for the user's region (Canada, US, UK, Australia, New Zealand, Europe).
>
> To review without logging real drinks: on the Tonight tab, tap "Load a sample night". On the History tab, tap "Preview History with sample data". You can skip setup to use the default stats.
>
> No account or sign-in is needed. The app has no server, ads, analytics or tracking. All data stays on the device. There are no in-app purchases in this version.

## App Privacy ("nutrition label")

**Data Not Collected.** The app has no server, analytics or tracking, so nothing is collected under Apple's definition. Re-check this if anything that sends data is ever added.

## URLs and what's still needed

- **Privacy policy URL:** https://joshbondnz-bit.github.io/statusfx/privacy/ (source in `site/`, published from the public repo joshbondnz-bit/statusfx)
- **Support URL:** https://joshbondnz-bit.github.io/statusfx/support/ · contact connect.statusfx@outlook.com
- **Screenshots:** iPhone 6.9" (1320 × 2868) at minimum. Easiest made from TestFlight on your phone.
- **Final artwork:** the app icon is final. The splash image is still the placeholder from `app/scripts/make-icons.mjs`.
