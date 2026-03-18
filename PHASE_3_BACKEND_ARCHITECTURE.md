# Phase 3: Backend Architecture

**Status**: Starting | **Scope**: Single-host full-stack aggregator service

---

## Design Overview

A lightweight backend service that:
1. **Consumes official data** from Velib GBFS (station-level: bike counts, dock availability)
2. **Optionally consumes app-derived data** (bike-level: 3-star ratings, dock IDs, battery levels) – feature-flagged, best-effort fallback if unavailable
3. **Aggregates & normalizes** both sources into a unified API response
4. **Tracks data freshness** and source attribution (official vs app-derived)
5. **Caches aggressively** to minimize upstream API calls
6. **Fails gracefully** by returning official-only data if app extraction is unavailable or disabled

---

## API Contract

### Frontend Request

```
GET /api/summary?stations=12345,67890&includeAppData=true
```

### Response Schema

```json
{
  "timestamp": "2026-03-18T14:30:45Z",
  "stations": [
    {
      "stationId": 12345,
      "name": "Toudouze - Clauzel",
      "mechanical": {
        "available": 3,
        "total": 10,
        "source": "official"
      },
      "electric": {
        "available": 2,
        "total": 8,
        "source": "official"
      },
      "docks": {
        "available": 5,
        "total": 18,
        "source": "official"
      },
      "lastUpdate": "2026-03-18T14:29:30Z",
      "threeStarBikes": {
        "count": 1,
        "dockIds": [5],
        "source": "app-derived",
        "freshness": "5m",
        "status": "available"
      }
    }
  ],
  "meta": {
    "official_data_freshness": "1m",
    "app_data_freshness": "5m",
    "app_data_enabled": true,
    "fallback_mode": false
  }
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Browser)                       │
│                   app.js + index.html                        │
└────────────────────────┬────────────────────────────────────┘
                         │ GET /api/summary
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend Service (Node.js/Express)               │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ API Handler: `/api/summary`                            │ │
│  │ - Parse station IDs from query params                  │ │
│  │ - Check cache (TTL 1–5 min)                            │ │
│  │ - Call adapters for official + app data (parallel)     │ │
│  │ - Merge results with source attribution                │ │
│  │ - Return unified response                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                         │                                     │
│      ┌──────────────────┼──────────────────┐                │
│      ↓                  ↓                   ↓                │
│  ┌─────────┐      ┌──────────┐      ┌────────────┐          │
│  │ Official│      │ App Data │      │  Cache     │          │
│  │ Adapter │      │ Adapter  │      │  Layer     │          │
│  │(GBFS)   │      │(Feature- │      │  (1–5min   │          │
│  │         │      │ flagged) │      │   TTL)     │          │
│  └────┬────┘      └──────┬───┘      └────┬───────┘          │
│       │                  │               │                   │
└───────┼──────────────────┼───────────────┼───────────────────┘
        │                  │               │
        ↓                  ↓               │
   ┌─────────┐        ┌──────────┐        │
   │ GBFS    │        │ Velib    │        │
   │ Public  │        │ App      │        │
   │ API     │        │ (Private)│        │
   └─────────┘        └──────────┘        │
                                          │
                                    (Optional)
                              Redis/Memcached
```

---

## File Structure

```
c:/dev/is-there-a-velib/
├── backend/                          # NEW
│   ├── index.js                      # Entry point (Express server)
│   ├── adapters/
│   │   ├── official.js               # GBFS adapter
│   │   └── app-data.js               # Velib app adapter (placeholder)
│   ├── cache.js                      # In-memory cache with TTL
│   ├── aggregator.js                 # Merge official + app data
│   ├── config.js                     # Backend config (env vars)
│   └── routes/
│       └── summary.js                # GET /api/summary handler
├── app.js                            # REFACTOR: Use /api/summary instead of direct GBFS
├── index.html                        # ENHANCE: Add 3-star bikes panel (optional)
├── config.sample.js                  # ADD: Backend URL, feature flags
├── config.js                         # User config (git-ignored)
├── styles.css                        # ADD: Styles for new 3-star panel
└── README.md                         # UPDATE: Backend docs, architecture, caveats
```

---

## Phase 3 Implementation Stages

### Stage 3a: Official Adapter Only (No App Data)

**Goal**: Get backend working with GBFS alone; establish baseline

- Create `backend/adapters/official.js` → Fetch GBFS, parse station data
- Create `backend/routes/summary.js` → Aggregate official data
- Refactor `app.js` to call `/api/summary` instead of direct GBFS
- Add `config.sample.js` keys: `backendUrl`, `enableAppDataExtraction: false`

**Verification**: Manual refresh returns same data as before, just via backend

### Stage 3b: App Data Adapter (Placeholder)

**Goal**: Structure ready to receive Phase 2 feasibility results

- Create `backend/adapters/app-data.js` → Placeholder with constructor-injected endpoint config
- Add environment variables: `VELIB_APP_API_ENDPOINT`, `VELIB_APP_ENABLED`
- Add feature flag: `includeAppData` query parameter
- When disabled or erroring out, gracefully fall back to official-only response

**Verification**: Backend responds with `app_data_enabled: false` or `status: "unavailable"`

### Stage 3c: Phase 2 Integration (Pending)

**Goal**: Once Phase 2 results are available, hook in extracted endpoints

- Populate `VELIB_APP_API_ENDPOINT` from Phase 2 findings
- Implement actual request/response parsing in `app-data.js`
- Add retry logic, circuit breaker, schema validation
- Update monitoring to track app endpoint health

---

## Caching Strategy

```javascript
// backend/cache.js - Simple in-memory cache with TTL

const cache = {
  // Key: "station_official_12345", "station_app_12345"
  // Value: { data, timestamp }
};

function get(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

function set(key, data, ttlMs = 60000) {
  cache[key] = { data, timestamp: Date.now(), ttl: ttlMs };
}
```

---

## Fallback & Circuit Breaker

```javascript
// Pseudocode for Stage 3b behavior

async function fetchStationData(stationId) {
  try {
    const official = await AdapterOfficial.fetch(stationId);  // Always fetch
    
    if (!config.enableAppDataExtraction) {
      return { ...official, source: "official_only" };
    }
    
    try {
      const appData = await AdapterApp.fetch(stationId);
      return merge(official, appData);  // Both sources
    } catch (appError) {
      metrics.recordAppAdapterError(appError);
      return { ...official, appDataStatus: "error", source: "official_fallback" };
    }
  } catch (officialError) {
    return { error: "All data sources unavailable", source: "none" };
  }
}
```

---

## Configuration (Environment Variables & Config File)

```javascript
// backend/config.js

module.exports = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Official GBFS
  gbfsUrl: process.env.GBFS_URL || 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/records',
  officialCacheTtlMs: 60000,  // 1 min

  // App-derived data (feature-flagged)
  enableAppDataExtraction: process.env.VELIB_ENABLE_APP_EXTRACTION === 'true',
  appApiEndpoint: process.env.VELIB_APP_API_ENDPOINT || null,
  appCacheTtlMs: 300000,  // 5 min (staler than official)

  // Monitoring
  logLevel: process.env.LOG_LEVEL || 'info',
};
```

---

## Testing Strategy

### Unit Tests

- **official.js**: Mock GBFS response → parse station counts
- **app-data.js**: Mock app endpoint → parse bike ratings, validate schema
- **aggregator.js**: Merge two datasets → verify source attribution
- **cache.js**: TTL expiration → verify cleanup

### Integration Tests

- **Stage 3a**: Start backend, hit `/api/summary?stations=12345` → verify official data matches current working site
- **Stage 3b**: Set `enableAppDataExtraction=false`, hit endpoint → verify app data is omitted
- **Stage 3c** (pending Phase 2): Mock app endpoint, hit aggregator → verify merged response structure

### Contract Tests

- Frontend expects specific response schema; backend must satisfy it
- If backend schema changes, frontend may break → fixture tests must catch drift

---

## Deployment Target

- **Platform Options**: Vercel (recommended), Render, Netlify Functions, Railway
- **Runtime**: Node.js 18+
- **Secrets Management**: All API keys and endpoints are server-only; never expose to frontend

---

## Next Steps After Phase 3 Design

1. **Stage 3a (Official Adapter)**: Implement and test with current GBFS data
2. **Await Phase 2**: Android feasibility research; gather app endpoint metadata
3. **Stage 3b → 3c (App Adapter)**: Once Phase 2 is complete, hook in app-derived data
4. **Phase 4**: Refactor frontend to consume backend API

---

**Phase 3 Design Date**: 2026-03-18  
**Status**: Architecture finalized; ready to code Stage 3a  
**Next Checkpoint**: Stage 3a implementation start
