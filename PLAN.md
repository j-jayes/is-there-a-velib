# is-there-a-velib: Project Plan

**Goal**: Enhance the Velib status tool to show individual bike quality ratings (3-star system) and best-condition dock positions, using official data + optional app-derived data extraction.

**Current Status**: Phase 3a Complete ✅ — Backend working with official GBFS data

---

## 6-Phase Roadmap

### Phase 1: Legal Gate ✅ DONE
**Document**: [PHASE_1_LEGAL_GATE.md](PHASE_1_LEGAL_GATE.md)

- [x] Analyze Velib ToS constraints
- [x] Establish acceptable use boundaries (personal, read-only, non-commercial)
- [x] Define go/no-go criteria for Phase 2
- [x] Create fallback strategy (revert to official-only any time)

### Phase 2: Feasibility Reconnaissance 🔄 IN PROGRESS
**Document**: [PHASE_2_FEASIBILITY.md](PHASE_2_FEASIBILITY.md)

**Objective**: Discover Velib app network endpoints without bypassing security

- [ ] Install Android SDK + emulator
- [ ] Set up network monitoring (Fiddler/mitmproxy)
- [ ] Capture app endpoint metadata (non-invasive observation)
- [ ] Fallback: Static APK analysis if network blocked
- [ ] Document findings: endpoints, schemas, feasibility verdict
- [ ] Re-evaluate go/no-go based on results

**Status**: Awaits Android SDK setup on developer machine

### Phase 3: Backend Architecture 🟡 PARTIAL (3a done, 3b-c pending Phase 2)
**Document**: [PHASE_3_BACKEND_ARCHITECTURE.md](PHASE_3_BACKEND_ARCHITECTURE.md)

#### Stage 3a: Official Adapter ✅ DONE
- [x] Node.js HTTP server (`backend/index.js`)
- [x] GBFS adapter with caching (`backend/adapters/official.js`)
- [x] Aggregation & normalization (`backend/aggregator.js`)
- [x] `/api/summary?stations=...` endpoint working
- [x] Frontend refactored to consume backend API
- [x] Automatic GBFS fallback if backend unavailable
- [x] Local testing: backend + static site both working

#### Stage 3b: App Data Adapter (Placeholder)
- [ ] Create `backend/adapters/app-data.js` template
- [ ] Feature flags & environment variable injection
- [ ] Graceful disable if app extraction unavailable
- **Depends on**: Phase 2 results

#### Stage 3c: App Data Integration
- [ ] Implement actual app endpoint calls
- [ ] Add retry logic, circuit breaker, schema validation
- [ ] Monitor for endpoint drift and app updates
- **Depends on**: Phase 2 results + Stage 3b

### Phase 4: Frontend UI Enhancement ⏸️ BLOCKED
**Objective**: Add optional 3-star bike detail panel

- [ ] Display 3-star bikes in home station detail (if available)
- [ ] Show dock numbers for best-condition bikes
- [ ] Fallback messaging when app data unavailable
- [ ] Add styles for new components
- **Depends on**: Phase 3c

### Phase 5: Deployment & Ops ⏸️ BLOCKED
**Objective**: Deploy to production host (single full-stack)

- [ ] Choose platform (Vercel/Render/Netlify/Railway)
- [ ] Set up environment secrets (serverside only)
- [ ] Add CORS restrictions to configured origin
- [ ] Create deployment docs
- [ ] Add monitoring for endpoint health & errors
- **Depends on**: Phase 3c

### Phase 6: Hardening & Maintenance ⏸️ BLOCKED
**Objective**: Ensure reliability & catch app changes early

- [ ] Parser fixture tests using sanitized recorded payloads
- [ ] Contract tests for frontend API schema
- [ ] App update detection (version bump monitoring)
- [ ] Playbook for reverting to official-only if blocked
- **Depends on**: Phases 3-5 complete

---

## Current Architecture

```
Frontend (Static)          Backend (Node.js)          Data Sources
==============             =================          ============
index.html            -->  /api/summary         -->  GBFS (official)
app.js                -->  backend/             -->  Velib App (app-derived, pending)
config.js             -->  adapters/
styles.css            -->  routes/
                          cache/
                          logger/
```

### Running Locally

**Terminal 1 – Backend**:
```bash
cd c:\dev\is-there-a-velib
node backend/index.js
# Server on http://localhost:3000
```

**Terminal 2 – Static Site**:
```bash
cd c:\dev\is-there-a-velib
python -m http.server 8080
# Site on http://localhost:8080
```

**Browser**: Visit `http://localhost:8080`, click "Refresh now"  
Expected: Shows current home/work station counts from GBFS

---

## Key Files

| File | Purpose |
|------|---------|
| `PHASE_1_LEGAL_GATE.md` | Legal analysis & acceptable use boundaries |
| `PHASE_2_FEASIBILITY.md` | Android research plan & methodology |
| `PHASE_3_BACKEND_ARCHITECTURE.md` | Backend design, response schema, deployment |
| `IMPLEMENTATION_PROGRESS.md` | Detailed progress checklist & file structure |
| `backend/` | Node.js service (config, adapters, routes, cache) |
| `app.js` | Frontend (refactored to use `/api/summary`) |
| `config.sample.js` | Configuration template (add `backendUrl`, feature flags) |
| `config.js` | User config (git-ignored) |

---

## Decision Checkpoints

### ✅ Phase 1 Complete
- [x] Reverse-engineering-first approach is legally acceptable (personal, non-commercial, read-only)
- [x] Fallback strategy documented; can revert anytime

### 🔄 Phase 2 Awaiting Completion
- [ ] Android emulator / network monitoring feasible without patching app?
- [ ] App endpoints discoverable and schemas recoverable?
- [ ] Risk acceptable based on findings?

### ⏳ Phase 3c Gate
- [ ] Phase 2 found usable endpoints?
- [ ] Schema drift detection is viable?
- [ ] Maintenance burden acceptable?

---

## Success Criteria

By project completion:
- ✅ Official GBFS data always available
- ✅ 3-star bike ratings shown when available (Phase 3c)
- ✅ Dock positions for best-condition bikes displayed (Phase 3c)
- ✅ Graceful fallback if app extraction fails
- ✅ Clear legal & risk documentation
- ✅ Deployable on single full-stack host

---

## Team Notes

- **Developer**: You
- **Platform**: Windows development, target deployment on serverless host
- **Tech Stack**: Node.js (backend), vanilla JS (frontend), GBFS + Velib App (data)
- **Branch**: `feature/android-emulation-added-data` (current work)
- **Main Branch**: `main` (stable, tests passing)

---

## Next Immediate Step

**→ Install Android SDK + emulator to begin Phase 2 feasibility research**

Once Phase 2 is complete, Phase 3b-c implementation can proceed in parallel with Phase 4 UI work.

---

**Last Updated**: 2026-03-18  
**Status**: Backend working, awaiting Android setup for app data discovery  
**Completion Target**: TBD (blocked on Phase 2 feasibility)
