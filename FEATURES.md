# AppTuner — Future Features

> Ideas that still matter. Not a commitment — a backlog.
> Only build these once AppTuner has real users.
> For immediate priorities: see TODO.md

---

## High Priority (build when ~500 users)

### Multi-device support
- Multiple phones scan the same QR and all receive the same bundle
- Useful for client demos: client + their colleague both see the app simultaneously
- Relay already supports multiple mobile connections per session — just needs mobile UI to handle it

### Console log streaming
- Logs from the running app visible in the CLI output (not just on the phone)
- Currently: logs only visible via Xcode/Android Studio
- Implementation: mobile sends logs back through relay to CLI → CLI prints them

### Error overlay on mobile
- When the app crashes, show a styled error screen with the stack trace
- Currently: white screen of death when something goes wrong
- Much better dev experience

### Bundle size monitoring
- Show bundle size in CLI output after each build
- Warn when bundle exceeds 20MB (slowdown territory)
- Optional: diff vs previous build

---

## Medium Priority (build when ~2,000 users)

### Differential bundle updates
- Instead of re-sending the entire bundle on every file change, only send changed modules
- Currently: full 5-50MB bundle sent on every hot reload
- Would make hot reload near-instant even on slow connections
- Complex to implement — requires tracking module graph

### Supabase integration in CLI
- `apptuner start` detects Supabase URL + anon key in .env and passes them through to the bundle
- Currently: env vars not forwarded (devs have to hardcode or use a workaround)
- Simple to implement once Supabase/Stripe re-pointing is done

### AppTuner Studio (web-based code editor)
- Monaco editor in browser + Claude API + AppTuner relay
- Developer writes code in browser, sees it live on phone instantly
- No local IDE needed for simple edits
- This is the "Lovable for mobile" product — only build after core traction confirmed
- See ROUTE-TO-MARKET.md for strategic context

### Team / shared sessions
- Multiple developers can connect to the same session
- Designer connects with their phone, developer makes changes, both see live
- Relay already supports this architecturally

---

## Low Priority / Speculative

### Android hot reload improvements
- Currently Android reload is slower than iOS
- Metro/bundle execution differences between platforms

### Expo project compatibility mode
- Detect Expo projects and attempt to run them without converting
- Was explored before SDK model — deprioritized
- Might be worth revisiting if many Expo devs request it

### `apptuner share` command
- Generates a shareable URL that anyone can open to see a read-only version of the running app
- Good for investor/stakeholder demos without them needing the AppTuner Mobile app
- Would require a web-based RN renderer (complex)

### Analytics dashboard
- How many sessions started, devices connected, bundles delivered
- Currently: no telemetry at all
- Add opt-in analytics ping on first `apptuner start`

### CLI plugin system
- Allow third-party plugins to extend `apptuner start`
- Example: `apptuner-plugin-sentry` auto-injects Sentry DSN
- Only useful once there's a community

---

## Explicitly Ruled Out

- ❌ Desktop app (Tauri/Electron) — CLI is simpler and works fine
- ❌ Built-in code editor in CLI — use Cursor/Claude Code/VS Code
- ❌ AppTuner as "Expo performance optimizer" — wrong direction, abandons relay moat
- ❌ Firebase native support in SDK 1.0 — use Firebase web SDK instead
- ❌ Bluetooth / NFC in SDK 1.0 — niche, add to SDK 2.0 if requested
- ❌ Payments native (Stripe/RevenueCat) in SDK 1.0 — regulatory complexity, SDK 2.0
