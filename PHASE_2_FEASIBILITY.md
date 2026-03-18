# Phase 2: Feasibility Reconnaissance

**Status**: In Progress | **Objective**: Non-invasive discovery of app network call patterns and bike metadata availability

---

## Overview

Determine whether the Velib app's bike-level data (3-star ratings, dock positions) is accessible via network observation **without patching the app or bypassing security protections**. This phase has three tracks:

1. **Non-Invasive Network Monitoring** (PRIMARY): Observe app behavior in standard emulator
2. **Static APK Analysis** (FALLBACK): If network monitoring is blocked, extract endpoint/schema hints from the APK
3. **Go/No-Go Decision** (GATE): Based on results, decide if extraction is feasible and acceptable

---

## Prerequisites

- Android SDK / ADB (Android Debug Bridge)
- Android Emulator (API level 30+, e.g., Pixel 3a image)
- Velib app APK (can be extracted from Play Store or downloaded via APK extractor)
- Network monitoring tool (Fiddler, Charles, mitmproxy, or Wireshark)
- Text editor and git for notes

---

## Track A: Non-Invasive Network Monitoring (Primary Path)

### Step A1: Set Up Android Emulator

1. **Launch emulator with network proxy support**:
   ```powershell
   # If using Android CLI tools, create or start emulator
   # Example: emulator -avd Pixel_3a_API_30 -http-proxy 127.0.0.1:8888
   ```
   *(Exact commands depend on your Android SDK setup; adjust paths as needed)*

2. **Verify ADB is accessible**:
   ```powershell
   adb devices
   ```
   You should see an emulator instance listed.

3. **Set system-wide proxy (if needed)** for network monitoring:
   - Settings → Network & Internet → Advanced → Proxy
   - Or configure via command: `adb shell settings put global http_proxy 127.0.0.1:8888`

### Step A2: Install Velib App in Emulator

1. **Download APK**:
   - Via Google Play Store on emulator (easiest, if Play Services installed)
   - Or extract from phone: `adb pull /data/app/com.paris.velib*/`
   - Or use third-party APK downloader (APKPure, APKCombo)

2. **Install**:
   ```powershell
   adb install -r "C:\path\to\velib.apk"
   ```

### Step A3: Capture Network Traffic

**Option 1: Fiddler (Windows-native)**
1. Install Fiddler Classic or Telerik Fiddler
2. Enable Tools → Options → Connections → Act as system proxy
3. Configure emulator proxy to point to Fiddler (localhost:8888)
4. Launch Velib app; refresh home station list
5. Inspect captured calls in Fiddler's Web Sessions list

**Option 2: mitmproxy (Cross-platform)**
```powershell
# Install (if not already)
pip install mitmproxy

# Run proxy
mitmproxy -p 8888

# In emulator, set system proxy to 127.0.0.1:8888
# Certficate warnings are expected (see note below)
```

**Option 3: Charles Proxy**
- Similar to Fiddler; commercial but powerful
- Supports SSL interception with custom CA

### Step A4: Record Observations

As the app loads and refreshes, **document ONLY metadata** (do not extract credentials):

**For each network call, record**:
- Hostname (e.g., `api.velib.com`, `bike-service.velib-app.fr`)
- Path/endpoint (e.g., `/api/v2/bikes`, `/station/{id}/bikes`)
- HTTP method (GET, POST)
- Response format hints (JSON, protobuf, etc.)
- Response schema (if visible in proxy)
- Approximate response size

**STOP before**:
- Exporting credentials or session tokens
- Patching the app to bypass cert pinning
- Installing custom CAs on the emulator (if app detects this)

### Step A5: Analyze Results

**Success Criteria**:
- ✅ App makes at least one call that includes bike-level data (ratings, dock IDs, battery, etc.)
- ✅ Response is in a readable format (JSON preferred; protobuf is harder to decode)
- ✅ Endpoint is accessible without special authentication beyond app login

**Failure Signs**:
- ❌ **Certificate pinning blocks MITM**: Proxy receives SSL handshake error; app may refuse to connect
- ❌ **App detects custom CA**: Logging in fails or app shows "this app cannot be verified"
- ❌ **No bike-level endpoints**: All calls are station-level aggregates (redundant with GBFS)
- ❌ **Requests are encrypted/binary**: Schema cannot be inferred without reverse-engineering

---

## Track B: Static APK Analysis (Fallback)

### When to Use
If Track A's network monitoring is blocked (e.g., app rejects custom CA or cert pinning is too aggressive), use static analysis as a last resort.

### Step B1: Extract APK (if not already done)

```powershell
adb shell pm path com.paris.velib
# Output example: package:/data/app/com.paris.velib-abc123/base.apk

adb pull /data/app/com.paris.velib-abc123/base.apk $PWD\velib.apk
```

### Step B2: Decompile APK

Using **apktool** (open-source):
```powershell
# Install apktool if needed
choco install apktool

# Decompile
apktool d velib.apk -o velib-decompiled
```

This produces:
- `AndroidManifest.xml` (app permissions, activities, services)
- `resources/` (UI layouts, strings, images)
- `smali/` (bytecode; reverse-engineered Java)

### Step B3: Search for API Endpoints & Schemas

Search decompiled code for:
- Domain names (find grep for `.com`, `.fr`, `api`, `https`)
- Hardcoded paths (`/api/`, `/v1/`, `/bike`, `/station`)
- Endpoint constant definitions or URL builders
- JSON schema hints (field names like `stars`, `dockId`, `batteryLevel`)

**Example search**:
```powershell
# In velib-decompiled/, search for common keywords
grep -r "api.velib" . | head -20
grep -r "free_bike" .
grep -r "stars\|rating\|dock" .
```

### Step B4: Map Candidate Endpoints

Build a list of potential endpoints without executing them:
- e.g., found: `GET /api/v2/stations/{stationId}/bikes`
- e.g., found: schema field `rideQualityRating` (maps to "stars")

### Step B5: Verify via Simulator (Optional)

Once you have candidate endpoints, switch back to Track A to verify in actual app traffic (confirm paths are really called).

---

## Integration with Backend (Provisional)

Once feasibility is determined, you'll feed these findings into the backend adapter:

```javascript
// Example: backend/adapters/velib-app.js (structure only, not fully implemented yet)

const VELIB_APP_API_BASE = 'https://api.velib-app.fr'; // Placeholder, from Track A/B results
const ENDPOINTS = {
  bikes: '/api/v2/bikes',           // From feasibility results
  stationBikes: '/api/v2/stations/{id}/bikes',
};

// Will be called from Phase 3 backend service
async function fetchBikeMetadata(stationId) {
  // TODO: Not yet implemented; pending Phase 2 results
}

module.exports = { VELIB_APP_API_BASE, ENDPOINTS, fetchBikeMetadata };
```

---

## Risk Management During Phase 2

**What remains safe**:
- ✅ Observing network calls in emulator (no user data harvested)
- ✅ Reading decompiled Java; no execution or binary patching
- ✅ Documenting findings locally; not sharing extraction code publicly

**Red lines** (STOP immediately if encountered):
- ❌ App requires patching or resigning
- ❌ App integrity checks prevent modified versions from running
- ❌ Certificate pinning bypass requires custom CA or app modification
- ❌ Extraction requires harvesting user credentials (session tokens, API keys)

---

## Deliverables

### Phase 2 Report

Create `PHASE_2_RESULTS.md` documenting:

1. **Network Monitoring Results**
   - List of captured endpoints
   - Response schemas (sanitized; rename sensitive fields)
   - Feasibility verdict: accessible? (yes/no)

2. **APK Analysis Results** (if performed)
   - Candidate endpoints and paths found
   - Schema hints
   - Encryption/obfuscation observed

3. **Technical Feasibility Verdict**
   - Can we observe bike data without patching? ✅/❌
   - Is the data in a recoverable format? ✅/❌
   - What is the minimum cost of ongoing maintenance (app updates, schema drift)? ⬜ (estimate)

4. **Risk Reassessment**
   - Does evidence suggest Velib actively blocks third-party extraction? ✅/❌
   - Are there end-to-end protections (encryption, signature verification) beyond cert pinning? ✅/❌
   - Recommended next steps

---

## Timeline Estimate

- **Track A (Network Monitoring)**: 2–4 hours (setup + observation)
- **Track B (APK Analysis)**: 1–2 hours (if needed, lower priority unless Track A fails)
- **Reporting**: 1 hour
- **Total**: 3–6 hours before go/no-go decision

---

## Next Steps

1. **Now**: Set up Android emulator and network monitoring (Track A)
2. **Upon completion**: Document findings in `PHASE_2_RESULTS.md`
3. **Review**: Check whether extracted endpoints/schemas meet feasibility criteria
4. **Decide**: Update `PHASE_1_LEGAL_GATE.md` with Phase 2 results and final go/no-go
5. **Proceed**: If GO → Phase 3 (backend design); if NO-GO → pivot to official-only mode

---

**Phase 2 Start Date**: 2026-03-18  
**Status**: Setup Phase  
**Next Checkpoint**: Phase 2 Results Review
