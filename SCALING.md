# AppTuner — Scaling Plan

> The relay is the bottleneck. Everything else scales fine.
> Current setup handles ~100-300 concurrent sessions.
> Don't over-engineer early — just know the plan.

---

## Current Architecture (Single VPS)

```
All traffic
    ↓
relay.apptuner.io (single VPS, PM2, Node.js ws)
    ↓
In-memory session state (Map<sessionId, {cli, mobiles[]}>)
    ↓
Max message size: 50MB
```

**Works fine up to:** ~100-300 concurrent sessions
**Breaking point:** In-memory state = no horizontal scaling possible (yet)

---

## What Breaks First

1. **Memory** — each session holds references to 2-5 WebSocket connections + potentially a 50MB bundle in memory if being forwarded. At 300 sessions = ~15GB potential bundle memory. VPS likely has 4-8GB RAM.
2. **CPU** — Node.js single thread. Message routing is fast but 500+ concurrent connections will start to show.
3. **Bandwidth** — each bundle is 5-50MB. 1,000 sessions/day × 20MB avg = 20GB/day = ~600GB/month. Most VPS plans include 1-10TB/month — fine for a long while.

---

## Scaling Stages

### Stage 1: Monitor (0-500 users, now)
**Cost:** 0 extra work

Add basic logging to the relay so you know when problems are coming:
- [ ] Log: active connection count every 60s
- [ ] Log: peak concurrent sessions per day
- [ ] Log: total bundles forwarded + total MB transferred
- [ ] Alert: PM2 restart = something crashed (already handled)

**When to worry:** consistently > 100 concurrent sessions

---

### Stage 2: Optimize existing VPS (500-1,000 users)
**Cost:** 1-2 days work

- [ ] Upgrade VPS to larger instance (more RAM + CPU)
- [ ] Tune Node.js: `--max-old-space-size=4096`, `--max-semi-space-size=64`
- [ ] Add connection limit per session (e.g. max 5 mobile devices per session)
- [ ] Add bundle TTL: don't keep large bundles in memory after forwarding

**When to worry:** consistently > 300 concurrent sessions

---

### Stage 3: Stateless relay + Redis (1,000-5,000 users)
**Cost:** 3-5 days work

This is the key architectural change that enables horizontal scaling.

**Current problem:** session state lives in-memory in one Node.js process. You can't run two relay instances because they don't share state.

**Solution:** Move session routing state to Redis.

```
                    ┌─ relay instance 1 (VPS 1) ─┐
                    │  stateless, reads Redis      │
Load balancer ──────┤                             ├── Redis (session registry)
(Nginx/Caddy)      │  stateless, reads Redis      │
                    └─ relay instance 2 (VPS 2) ─┘
```

Each relay instance:
1. On CLI connect: writes `{sessionId: {nodeId, cliSocketId}}` to Redis
2. On mobile connect: looks up which node owns this session → forwards via inter-node message
3. On disconnect: removes from Redis

**Implementation:**
- [ ] Add Redis to VPS (or use Redis Cloud free tier)
- [ ] Replace in-memory `Map` with Redis pub/sub for cross-node routing
- [ ] Wrap relay in Docker, deploy second instance on same or different VPS
- [ ] Add Nginx or Caddy as load balancer

---

### Stage 4: Managed WebSocket infrastructure (5,000+ users)
**Cost:** 1 week + ongoing subscription cost

At this scale, managing WebSocket infrastructure yourself becomes painful. Use a managed service:

- **Ably** — purpose-built for realtime, generous free tier, scales to millions
- **Pusher** — simpler API, good for WebSocket relay patterns
- **Soketi** — self-hosted Pusher-compatible server (keeps cost low)

**Trade-off:** lose control of the relay, gain reliability + automatic scaling.

**Decision point:** if relay infrastructure is taking > 4 hours/month to maintain, switch to managed.

---

## Bandwidth Cost Projection

| Users/day | Avg bundle | Sessions | Data/day | Data/month | VPS cost |
|-----------|-----------|---------|---------|-----------|---------|
| 50 | 15MB | 50 | 750MB | 22GB | Current VPS |
| 500 | 15MB | 500 | 7.5GB | 225GB | Current VPS |
| 2,000 | 15MB | 2,000 | 30GB | 900GB | Upgrade VPS |
| 10,000 | 15MB | 10,000 | 150GB | 4.5TB | Multi-VPS or CDN |

Most VPS plans include 2-10TB/month. Bandwidth is not the first thing that breaks.

---

## Relay Deployment (Current Process)

```bash
ssh user@relay.apptuner.io
cd ~/relay && git pull && npm install && pm2 restart apptuner-relay
```

**When to automate:** when you're deploying more than once a week.

- [ ] Add GitHub Actions CD: push to `main` → SSH → git pull → pm2 restart
- [ ] Add health check endpoint to relay: `GET /health` → `{"status":"ok","connections":42}`
- [ ] Add uptime monitoring (UptimeRobot free tier — alerts you if relay goes down)

---

## Mobile App Scaling (App Store)

The AppTuner Mobile app itself doesn't need server infrastructure — it's a client.

But App Store scaling concerns:
- **Review times** increase as you get more users and submit updates
- **App Store crashes** need to be monitored (use Xcode Organizer)
- **iOS version compatibility** — support last 2 major iOS versions minimum

---

## Summary: What to Do Now vs Later

| Action | Do when |
|--------|---------|
| Add connection logging to relay | Now (30 min) |
| Add uptime monitoring | Now (15 min) |
| Upgrade VPS | 300+ concurrent sessions |
| Redis + horizontal scaling | 1,000+ concurrent sessions |
| Managed WebSocket service | 5,000+ concurrent sessions |
| GitHub Actions CD for relay | Deploying > once/week |
