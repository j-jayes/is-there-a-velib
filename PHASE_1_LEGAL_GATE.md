# Phase 1: Legal Gate & Risk Checkpoint

**Status**: Pre-Implementation | **Decision**: PENDING | **Decision Date**: ---

## Overview

This document establishes the legal feasibility baseline and explicit go/no-go criteria before proceeding to Phase 2 (Feasibility Reconnaissance) and Phase 3+ (implementation). The goal is **read-only discovery of app-scoped bike metadata (3-star ratings, dock identifiers) without bypassing security protections or violating terms of service**.

---

## A. Confirmed Facts (From Research Phase)

### Official Data Landscape
- **GBFS Standard** (Velib Métropole): Exposes `system_information`, `station_information`, `station_status`
  - ✅ Available: station name, bike/dock counts, availability, last-update timestamp
  - ❌ NOT available: individual bike star ratings, battery levels, dock-level bike IDs
  - **Source**: Direct GBFS specification examination + current site functional validation
  
- **OpenData Portal** (Paris): Velib dataset mirrors GBFS station-level aggregates only
  - ❌ No bike-level granularity
  - **Source**: opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/

### App-Only Features (Confirmed)
- **In-App Bike Star Ratings** (1–3 stars): visible in Velib app v1.6+
  - Used by maintenance teams to prioritize repairs
  - Visible to users for browsing/filtering
  - **Source**: Velib official blog post "La notation des vélos arrive" + Google Play Store description
  
- **Star-Based Filters**: app now allows filtering to show only 2–3 star bikes
  - Electric bikes with good mechanical condition status
  - **Source**: Velib official blog post "Deux nouveautés Vélib' : batterie visible & filtres de vélos étoilés"
  
- **Battery Level Display**: red/orange/green per bike
  - Indicates charge state, not stored in official APIs
  - **Source**: Same blog posts + app UI

---

## B. Legal & Terms of Service Analysis

### Velib's Terms of Service

**Key Restriction** (Velib legal notice, velib-metropole.fr):
> "It is also prohibited to copy, modify, create derivative works, reverse engineer or assemble, or otherwise attempt to discover the source code (except in cases permitted by law) ... [and] copy databases of the Website."

**Interpretation**:
- ❌ **Prohibited**: Reverse-engineering the app to extract proprietary algorithms or authentication credentials
- ❌ **Prohibited**: Bulk extraction and re-distribution of bike data as a competing commercial product
- ⚠️ **Gray Zone**: Read-only observation of app network calls for personal, non-commercial use (subject to local "permitted by law" interpretation)
- ✅ **Permitted**: Using official, public GBFS feeds (explicitly licensed)

### Google Play Store / Android Terms
- Google prohibits reverse-engineering services to "extract trade secrets or proprietary information"
- Certificate pinning (likely on Velib app) makes MITM interception harder without device-level bypass
- **Source**: Google Terms of Service + OWASP MASTG-KNOW-0015 (app security guidelines)

### French Law Context
- **CNIL/GDPR**: Data extraction must not violate user privacy (bike star ratings are public in-app, not personal)
- **EU Software Directive** ("permitted by law" exception): allows reverse-engineering in limited circumstances (interoperability, security research)
- **Academic/personal research exception**: France's copyright law (CPI Article L122-5) permits some forms of research without explicit permission
- ⚠️ **Legal Review Needed**: Exact applicability of these exceptions to personal-use bike data extraction is debatable; consult a French lawyer if planning public rollout

---

## C. Risk Posture: Personal vs. Production

### Personal Use (Current Scope) – **LOWER RISK**
- **User** = sole developer, non-commercial personal tool
- **Distribution** = private, not listed on app stores
- **Data scale** = home + work station only (2–4 stations), <10 bikes/refresh, sampling
- **Likelihood of cease-and-desist** = Low (Velib unlikely to pursue personal use)
- **If blocked** = Easy pivot to official-only mode without user impact (deployed on same host)
- **Acceptable if**: Read-only observation only, no credential harvesting, no bulk exports, fails gracefully

### Production/Public Scale – **HIGHER RISK**
- **Users** = 100+ strangers consuming extracted data
- **Distribution** = public GitHub, app stores, shared URL, or social media
- **Data scale** = city-wide extraction, persistent archival, re-distribution
- **Likelihood of cease-and-desist** = High (Velib owns data, may protect commercial value)
- **If blocked** = Impacts all users; requires immediate rollback or alternative
- **NOT acceptable** without explicit Velib licensing or cooperation

**→ This implementation targets Personal Use scope only**

---

## D. Go / No-Go Decision Framework

### Pre-Phase 2 Checkpoint (NOW)
**Question**: Is personal, read-only, non-invasive observation of app network calls legally and ethically acceptable?

**Go Criteria** (ALL must be true):
- [ ] Velib's ToS permits personal, non-commercial reverse-engineering for interoperability (or can be reasonably interpreted that way)
- [ ] No extraction of credentials, signing keys, or copyrighted code
- [ ] No bulk data harvest or re-distribution; only optional, graceful enhancement to existing personal tool
- [ ] Clear fallback to official-only data if app extraction fails or Velib requests cessation
- [ ] No intentional bypass of security technologies (certificate pinning, app integrity checks) – observe only what is visible with standard tools

**No-Go Criteria** (fail if ANY is true):
- [ ] Requires patching/resigning the official app
- [ ] Requires bypassing certificate pinning via custom CA or app modification
- [ ] Requires credential harvesting or session hijacking
- [ ] Velib has publicly stated they forbid personal extraction
- [ ] Feasibility research (Phase 2) shows blocking/detection mechanisms that would escalate risk

**Current Status**: **HOLD for Phase 2 results**  
- Phase 2 must confirm whether app network traffic can be observed *without bypassing protections*
- If non-invasive observation is not feasible, **phase 2 recommendation → NO-GO** (proceed to Phase 3 with official-only data)

---

### Post-Phase 2 Checkpoint (After feasibility research)
Once Phase 2 completes, re-evaluate:
1. **Can we observe app calls without patching/cert-pinning bypass?** (Yes → continue | No → NO-GO)
2. **Do the calls expose useful bike metadata in plaintext or recoverable form?** (Yes → continue | No → NO-GO, insufficient ROI)
3. **Does Velib have active endpoint detection/blocking for third-party clients?** (No → continue | Yes → higher risk, re-evaluate)

---

## E. Acceptable Use Boundaries & Trigger Events

### What We WILL Do
- ✅ Read-only observation of app network calls using standard tools (emulator, network monitor, no patching)
- ✅ Store extracted metadata (star ratings, dock IDs) in optional backend service with caching and failover
- ✅ Display app-derived data in UI only if official data is also available as fallback
- ✅ Gracefully degrade to official-only mode if app extraction becomes unavailable
- ✅ Log failures and alert on endpoint drift (schema changes, auth failures, blocking)
- ✅ Keep tool private/non-commercial; document legal caveats in README

### What We Will NOT Do
- ❌ Patch, resign, or modify the official Velib app
- ❌ Bypass certificate pinning via custom CAs or app interception tools
- ❌ Harvest user credentials, session tokens, or authentication cookies
- ❌ Bulk-export bike data for sale, distribution, or competing services
- ❌ Reverse-engineer Velib's proprietary rating/recommendation algorithms
- ❌ Continue extracting if Velib issues a cease-and-desist or blocks access

### Trigger Events to STOP Immediately
1. **Legal notice** from Velib requesting cessation of extraction
2. **Technical blocking**: Velib deploys detection/auth changes that block observation without app modification
3. **Terms change**: Velib's ToS is updated to explicitly forbid personal extraction
4. **App changes**: Velib implements runtime integrity checks or certificate pinning bypass-detection
5. **Public escalation**: Velib publicly states they prohibit personal use extraction (e.g., in blog or security advisory)

**If triggered**: Revert to official-only data immediately, disable backend app-adapter, commit to git history with explanation.

---

## F. Decision & Sign-Off

### Current Recommendation (Pre-Phase 2)
**→ Proceed to Phase 2 (Feasibility Reconnaissance)**

**Rationale**:
- Personal, non-commercial scope with clear fallback makes risk acceptable
- Phase 2 is purely observational (non-invasive) – no code changes or deployments yet
- Go/no-go checkpoint after Phase 2 results will determine if deeper investigation is feasible
- Building infrastructure now (backend, config, fallback) is not betting the farm on extraction success

### Approval Chain
- [x] Developer (you) understands the legal constraints and acceptable use boundaries
- [ ] Phase 2 confirms non-invasive observation feasibility (pending)
- [ ] Phase 2 re-evaluation: extract metadata usefulness vs. risk trade-off (pending)
- [ ] Final go/no-go: proceed to Phase 3 backend implementation or pivot to official-only (pending)

---

## G. Fallback Strategy

At any point during implementation or deployment, **reverting to official-only mode is fast and preserves user experience**:

1. **Config-based kill switch**: Set `enableAppDataExtraction: false` in config.js
2. **Environment variable**: `VELIB_ENABLE_APP_EXTRACTION=false` on server
3. **Feature flag in backend**: Return empty `threeStarBikes` array if extraction is disabled
4. **Frontend graceful degradation**: Show only official data; 3-star panel hides if no data
5. **No user-facing changes**: App behaves same as today (manual refresh, station counts, no bike details)

---

## H. Further Considerations

### Personal Use → Production Path (Out of Scope for Now)
If this tool grows and users request production access:
- **Licensing**: Negotiate with Velib to expose bike-level data in official GBFS or partner API
- **Attribution**: Clearly mark app-derived data as unofficial/experimental
- **Compliance**: Add error handling, retry logic, privacy policy, and dispute resolution
- **Hardening**: Implement rate limiting, IP rotation, and monitoring for abuse

### Data Ownership & Longevity
- Velib owns bike star ratings; we are borrowing them for personal use only
- If Velib shuts down extraction, design allows instant pivot to official data
- Document this risk in README so users know why data may disappear

---

## Sign-Off

**Document Version**: 1.0  
**Date Created**: 2026-03-18  
**Created By**: Implementation Phase 1  
**Status**: SUBMITTED FOR REVIEW  

**Decision**: [ ] GO TO PHASE 2 | [ ] NO-GO, OFFICIAL-ONLY MODE

*(Placeholder for developer sign-off once Phase 2 results are available)*
