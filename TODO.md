# AppTuner — Master TODO

> Last updated: 2026-02-28
> One list, ordered by what gets us to first paying users fastest.
> Context: primary customer = freelance mobile dev sharing WIP apps with clients remotely.

---

## NOW — Unblock first real users

- [x] **Upgrade mobile to RN 0.81.6 / React 19.1.4** ✅
- [x] **Rebuild mobile with SDK 1.0 native modules** ✅ confirmed end-to-end working
- [x] **Relay max message size → 50MB** ✅
- [x] **Publish CLI to npm (apptuner@0.1.3)** ✅
- [x] **Full Cloudflare purge → VPS-only** ✅
- [x] **Wire MCP to Claude Code locally** ✅
- [x] **Create `public/llms.txt`** ✅ deploys on next git push

- [x] **Fix: camera-on-relaunch bug** ✅ 2026-02-28
  - `loadingRecents` state added — camera no longer flashes before Recent Projects screen

- [x] **Fix: shake-to-disconnect broken** ✅ 2026-02-28
  - Root cause: RN 0.81.6 New Architecture debug builds no longer post `RCTShowDevMenuNotification`
  - In release builds (TestFlight / App Store) shake works perfectly via UIWindow swizzle
  - JS fix applied: listener now registered once with refs — no re-registration gap during state changes

- [x] **Build + full device test (UDID: 00008101-00140DA11EF9001E)** ✅ 2026-02-28
  - Confirmed: scan QR → connect → hot reload working end-to-end
  - Note: shake doesn't work in debug builds (RN 0.81.6 New Arch — works fine in release/TestFlight)

- [x] **TestFlight — confirmed working** ✅ 2026-02-28
  - Scan QR ✅ · hot reload ✅ · shake to disconnect ✅ · no warnings ✅ · recent projects ✅

- [ ] **App Store submission** — submit same build (1.0 build 1) for App Store review
  - Go to App Store Connect → AppTunerMobile → App Store tab → add build → submit for review
  - Review takes 1-3 days, usually same day

---

## SOON — Make it trustworthy enough to charge for

- [ ] **Stripe + pricing working end-to-end**
  - Re-point Supabase + Stripe from old Cloudflare URLs → VPS endpoints
  - Set up pricing tiers: Indie $12/mo (1 device), Team $49/mo (5 devices)
  - Test full flow: signup → payment → session works

- [ ] **Rewrite landing page (apptuner.io)**
  - Hero: "Your app on their phone. Anywhere. Instantly."
  - Lead with the relay magic — that's the differentiator nobody else has
  - Sub-headline: "No TestFlight. No same WiFi. Just scan and go."
  - Show the killer moment: 2 phones, different WiFi networks, same live app
  - Vercel/Linear aesthetic — cutting edge, modern
  - Include: quick start, SDK library list, pricing

- [ ] **Publish MCP to npm as `apptuner-mcp`**
  - Run `npm login` first (token expired), then `cd dist-mcp && npm publish --access public`

- [ ] **git push** — deploys `llms.txt` + any dashboard updates to apptuner.io

- [ ] **App Store listing polish**
  - Professional screenshots (show relay magic — 2 phones, different WiFi)
  - Description written for discoverability: "share React Native app without TestFlight"
  - **Replace placeholder app icon** — currently a solid blue square, needs real AppTuner branding
    - Source file: `mobile/ios/AppTunerMobile/Images.xcassets/AppIcon.appiconset/AppIcon-1024.png`
    - Replace with a 1024x1024 PNG, Xcode auto-generates all sizes

---

## NEXT — Get discovered

- [ ] **Submit MCP to registries**
  - mcp.so + Smithery
  - Tags: react-native, mobile, hot-reload, development

- [ ] **`create-apptuner-app` CLI on npm**
  - `npx create-apptuner-app my-app --template fitness-tracker`
  - AI tools will suggest this alongside `create-expo-app`
  - This is how AI agents discover AppTuner automatically

- [ ] **`apptuner.io/start` page**
  - Single-purpose: "Share your React Native app with anyone in 5 minutes"
  - Written for devs who already have a working RN app
  - Conversion funnel for word-of-mouth arrivals

- [ ] **`apptuner.io/templates` page**
  - Grid of all templates with screenshots
  - Links to GitHub org `apptuner-templates`

- [ ] **Create GitHub org: `apptuner-templates`**
  - All templates, starter kits, and examples live here separately from rawvibe

- [ ] **Comparison page: AppTuner vs Expo**
  - Title: "AppTuner vs Expo: share your app with anyone, instantly"
  - SEO targets: "react native preview on device without expo", "share react native app with client without testflight"
  - Machine-readable — gets picked up by AI RAG systems

- [ ] **Stack Overflow answer**
  - Q: "How to share React Native app with client without TestFlight?"
  - Thorough, genuinely helpful answer mentioning AppTuner
  - Gets indexed by AI tools within days

---

## TEMPLATES — 2 per week, 10 weeks = 20 templates by June 2026

> Every template: TypeScript + .cursorrules + .windsurfrules + CLAUDE.md + AGENTS.md + Supabase auth + AppTuner pre-configured.
> For each release: post on Reddit (r/reactnative, r/cursor, r/vibecoding) + X with demo gif.

- [ ] **Template 1: Fitness tracker** — workouts, progress, health data
- [ ] **Template 2: Restaurant ordering** — menu, cart, order status
- [ ] **Template 3: Community/members app** — tennis club, gym, sports team
- [ ] **Template 4: Booking/scheduling** — appointments, calendar
- [ ] **Template 5: Marketplace** — listings, search, messaging
- [ ] **Template 6: Event management** — tickets, attendees, schedule
- [ ] **Template 7: Delivery tracker** — orders, map, status
- [ ] **Template 8: Chat/messaging** — rooms, direct messages, notifications
- [ ] **Template 9: News/blog reader** — feed, bookmarks, categories
- [ ] **Template 10: Dashboard/admin** — stats, charts, management

---

## CLEANUP — Remove deprecated cruft

- [ ] **Remove `apptuner check` command**
  - Deprecated, not needed in SDK model
  - Delete `src-cli/commands/check.ts` and remove from `cli.ts`

- [ ] **Remove `apptuner convert` command**
  - Deprecated, not needed in SDK model
  - Delete `src-cli/commands/convert.ts` and remove from `cli.ts`

---

## DISTRIBUTION — When we're ready to scale

- [ ] **Demo video (60 seconds max)**
  - CLI start → QR scan → app on phone → code change → hot reload → share QR with friend on different WiFi
  - The "different WiFi" moment is the killer — nobody else can do this

- [ ] **X / Reddit presence**
  - Create X account (@apptuner or @apptunerio)
  - First 5 posts planned:
    1. Zero followers + demo gif of relay magic
    2. First template launch
    3. "We added llms.txt so AI agents know about AppTuner"
    4. Hot reload: code change → phone updates in 2s
    5. Two phones, different WiFi, same live app
  - Reddit posts on r/reactnative, r/cursor, r/vibecoding when each template drops

- [ ] **Play Store submission (Android)**
  - After iOS is live and stable

---

## REAL-WORLD TESTING — Before any public launch

- [ ] **Test: navigation-heavy app** (tabs + stack + deep linking)
- [ ] **Test: camera app** (VisionCamera live preview + photo capture)
- [ ] **Test: maps app** (react-native-maps + location permissions)
- [ ] **Test: notification-heavy app** (Notifee local + background handlers)
- [ ] **Test: relay over 4G/5G** (phone and Mac on completely different networks)
- [ ] **Test: large bundle app** (complex app, many dependencies — test chunking)
