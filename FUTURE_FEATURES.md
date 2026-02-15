# AppTuner - Future Features & Ideas

This document tracks potential features and enhancements for future versions of AppTuner. Ideas are organized by priority and complexity.

---

## High Priority (v2.0)

### 1. Contact-Based Session Sharing
**Status:** Idea Phase
**Complexity:** High
**Estimated Effort:** 2-3 weeks

**Description:**
Enable users to share sessions directly with contacts who have AppTuner installed, without manually copying/pasting codes.

**User Flow:**
1. Desktop: Click "Share Project" button
2. Shows list of contacts who have AppTuner installed
3. Select contact (e.g., "Peter")
4. Peter's phone receives push notification: "Pepijn wants to show you his app"
5. Peter taps notification → auto-connects to session

**Technical Requirements:**
- Contact list integration (iOS/Android permissions)
- User registration system (phone number or email)
- Contact matching backend (check which contacts have AppTuner)
- Push notification infrastructure (APNS for iOS, FCM for Android)
- User database mapping identifiers → device tokens
- Privacy controls (opt-in, GDPR compliance)

**Why Later:**
- Adds significant complexity (auth, backend, push notifications)
- Current copy/paste flow works well enough for MVP
- Better to validate market fit before investing in this

**Alternative Consideration:**
- Could use deep linking instead of push notifications (share URL that opens AppTuner with session code pre-filled)

---

## Medium Priority

### 2. Android Support
**Status:** Planned
**Complexity:** Medium-High
**Estimated Effort:** 2-4 weeks

**Description:**
Currently iOS-only. Add full Android support for the mobile app.

**Requirements:**
- Port React Native mobile app to Android
- Test QR scanning on Android devices
- Ensure bundle execution works on Android runtime
- Test auto-reconnection behavior on Android

---

### 3. Bundle Compression
**Status:** Idea Phase
**Complexity:** Medium
**Estimated Effort:** 3-5 days

**Description:**
Compress bundles before sending over WebSocket to reduce transfer time and bandwidth usage.

**Implementation:**
- Gzip bundles before transmission
- Decompress on mobile device
- Track compression ratio in metrics
- Show original vs compressed size in UI

**Benefits:**
- Faster bundle delivery for large apps
- Lower bandwidth costs (important for Cloudflare relay limits)
- Better performance on slow connections

---

### 4. Multi-Device Support (Desktop)
**Status:** Idea Phase
**Complexity:** Medium
**Estimated Effort:** 1 week

**Description:**
Allow desktop app to connect to multiple mobile devices simultaneously.

**Use Cases:**
- Test on iPhone + iPad at same time
- Show app to multiple stakeholders in a meeting
- Team members testing together

**UI Considerations:**
- Device list with active/inactive states
- Separate console logs per device (with device selector)
- Broadcast bundles to all connected devices

---

### 5. Session History & Replay
**Status:** Idea Phase
**Complexity:** High
**Estimated Effort:** 2-3 weeks

**Description:**
Record bundle updates and console logs for later review/replay.

**Features:**
- Save session history (bundles + logs + timestamps)
- Replay sessions to see how app evolved during development
- Export session data for bug reports
- Share session recordings with team

---

## Low Priority / Nice-to-Have

### 6. Custom Project Templates
**Status:** Idea Phase
**Complexity:** Low
**Estimated Effort:** 3-5 days

**Description:**
Provide starter templates for common React Native setups.

**Templates:**
- Bare React Native app
- Navigation setup (React Navigation)
- Redux + TypeScript
- Firebase integration
- Authentication flow

---

### 7. Performance Profiling
**Status:** Idea Phase
**Complexity:** High
**Estimated Effort:** 3-4 weeks

**Description:**
Built-in performance monitoring and profiling tools.

**Features:**
- Track render times
- Component re-render detection
- Memory usage monitoring
- Network request tracking
- FPS meter

---

### 8. Team Workspaces
**Status:** Idea Phase
**Complexity:** Very High
**Estimated Effort:** 4-6 weeks

**Description:**
Shared workspaces for development teams.

**Features:**
- Shared session history
- Team member presence (see who's connected)
- Collaborative debugging
- Shared project settings
- Role-based permissions

**Requirements:**
- Backend infrastructure for multi-user support
- Real-time sync service
- User authentication & authorization
- Team management UI

---

## Research Needed

### 9. Expo Go Integration
**Status:** Research
**Complexity:** Unknown

**Question:**
Can AppTuner work alongside or integrate with Expo Go for developers using Expo managed workflow?

**Considerations:**
- Expo has its own dev server and hot reload
- Would need to understand Expo's bundling approach
- Might require different architecture

---

### 10. VS Code Extension
**Status:** Idea
**Complexity:** Medium
**Estimated Effort:** 2 weeks

**Description:**
VS Code extension for tighter editor integration.

**Features:**
- Start/stop AppTuner from VS Code
- View console logs in editor panel
- Connected device indicator in status bar
- Quick session sharing from editor
- File save triggers bundle update automatically

---

## Rejected / Parking Lot

### ❌ Web-Based Mobile App
**Why Rejected:**
Requires browser testing, doesn't provide the "real device" value prop. AppTuner's strength is testing on actual native devices.

---

## How to Use This Document

**Adding New Ideas:**
1. Add to appropriate priority section
2. Include: Status, Complexity, Effort estimate, Description
3. Explain the "why" and user value
4. Note technical requirements or blockers

**Promoting Ideas:**
- When an idea becomes priority, move it up and update status
- Create GitHub issues for features moving into active development
- Archive completed features to a separate "COMPLETED.md" file

---

**Last Updated:** 2024-02-14
**Next Review:** After v1.0 launch
