# AppTuner — Route to Market

> Last updated: 2026-02-28 — Major pivot. Full rewrite.

---

## What AppTuner is

A direct Expo alternative. Same modules, same DX, global relay sharing, instant builds via shell re-signing — at half the price of EAS. No lock-in. Your code stays bare RN.

---

## Who the customer is

**Primary:** Indie developer / freelancer / small agency building React Native apps.
- Knows what Expo is and is paying $99/month for EAS (or wants to avoid it)
- Wants Expo's DX (modules, preview, sharing) without the price and lock-in
- Building new projects — not migrating old ones

**Secondary:** Developer starting a new RN project who discovers AppTuner before they touch Expo.

**Not targeting:** Funded startups already deep in Expo with no reason to switch.

---

## The pitch

> "Everything Expo gives you — same modules, same DX, instant builds — at half the price. No lock-in."

**The word-of-mouth moment:**
Developer demos app to client in another city.
Client: "How did you do that??"
Developer: "I just sent you a QR code."
Client shares their phone with a colleague.
Two people in a different country see the app live. No App Store. No TestFlight.
That moment is impossible to explain. You have to see it.

---

## Phase 1 — SDK Expansion (NOW — 3 weeks)

Goal: 20 Expo-compatible modules in AppTuner Mobile shell.
Expo's modules are MIT licensed — we compile them in directly.

**Adding in order of how commonly used they are:**
- `expo-image`, `expo-camera`, `expo-av`, `expo-file-system`
- `expo-media-library`, `expo-sharing`, `expo-haptics`, `expo-clipboard`
- `expo-linear-gradient`, `expo-blur`, `expo-font`
- `expo-splash-screen`, `expo-status-bar`, `expo-constants`
- `expo-web-browser`, `expo-linking`
- `react-native-webview`, `react-native-video`
- `@react-native-community/netinfo`, `react-native-permissions`

When we hit ~20 modules: AppTuner covers 80%+ of what Expo apps use.
That's the threshold where "switching" becomes compelling for new projects.

---

## Phase 2 — Re-signing Build Pipeline

Shell is pre-built. A "build" = re-sign with user's cert. ~30 seconds.

1. User uploads Apple cert + provisioning profile to dashboard
2. AppTuner injects icon, name, bundle ID
3. Re-signs → delivers `.ipa`
4. User uploads to App Store Connect themselves (or we add EAS Submit equivalent later)

This closes the loop: build with AppTuner → preview via relay → ship to App Store.
All without leaving AppTuner. All at a fraction of EAS cost.

---

## Phase 3 — Starter Templates (10x)

Each template: TypeScript + SDK modules showcased + `.cursorrules` + Supabase auth.
Free on GitHub. AI engines index them. Developers find AppTuner without searching.

- Fitness tracker, restaurant ordering, community app, booking, marketplace
- Event management, delivery tracker, chat, news reader, dashboard

For each launch: post on r/reactnative, X, LinkedIn. Short demo video.

---

## Phase 4 — App Store + Play Store

- iOS: TestFlight done → submit for full App Store review
- Replace placeholder icon first
- Android: build + Play Store submission after iOS approved

Public listing = trust signal. Developers won't install a dev tool that isn't on the App Store.

---

## Phase 5 — Pricing & Business

- **Free tier:** relay sharing (limited — enough to get hooked)
- **Indie ($29/month):** unlimited relay + re-signing builds
- **Team (TBD):** multiple projects, shared sessions

EAS is $99/month. We're $29. The math is obvious.

Supabase + Stripe are already wired up — just need re-pointing from old Cloudflare endpoints to VPS.

---

## Phase 6 — Distribution & Discoverability

- `apptuner.io/llms.txt` — AI agents read this and adopt AppTuner patterns
- `apptuner-mcp` on npm — MCP server for Cursor/Windsurf/Claude Code
- `create-apptuner-app` CLI — `npx create-apptuner-app my-app --template fitness-tracker`
- Comparison page on apptuner.io — "AppTuner vs Expo vs EAS"
- X account: building in public, short demo gifs
- Reddit: genuine posts on r/reactnative when templates drop

---

## Success metrics (end of 2026)

| Metric | Target |
|---|---|
| Paying users | 200–500 |
| ARR | $70k–$175k |
| npm downloads/month | 1,000+ |
| App Store installs | 1,000+ |
| GitHub template stars | 500+ |

---

## Co-founder plan

When: after 100-200 paying customers.
Who: Amsterdam-based agency or technical studio, 50/50.
They bring: full team, execution, marketing, legal, scaling.
Pepijn brings: IP, working product with customers, creative/commercial direction.
Pepijn's ongoing role: founder/advisor/sparring partner — not day-to-day operator.

---

## What NOT to do

- ❌ Build an Expo app converter — dead strategy
- ❌ Try to make existing Expo apps run in AppTuner — not our problem
- ❌ Build `apptuner check` / `apptuner convert` features — these are deleted
- ❌ Target funded startups locked into Expo — too entrenched
- ❌ Rush the partner search — get traction first, then negotiate from strength
