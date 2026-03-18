# is there a velib?

A tiny mobile-friendly website for one quick check:

- Home side: total number of electric bikes (`ebike`) across 3 configured stations.
- Work side: total number of free docks (`numdocksavailable`) across 3 configured stations.

## Can this be static on GitHub Pages?

Yes. This project is a static client-only site and works on GitHub Pages.

Important constraint:
- Browser apps cannot keep runtime secrets truly secret.
- So this app uses a public config file (`config.js`) with station codes.
- No backend/FastAPI is required for this use case.

## Data source

OpenData Paris Explore API (`velib-disponibilite-en-temps-reel`):

- Endpoint: `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/records`
- Public, JSON, no API key required.

Known limitation from public schema:
- Bike-level star ratings are not exposed.
- Per-bike dock positions/numbers are not exposed.

This implementation therefore uses the agreed fallback metric: electric-bike count per station.

## Configuration

Edit `config.js`:

```js
window.VELIB_CONFIG = {
  homeStationCodes: ["3011", "3007", "3102"],
  workStationCodes: ["4009", "4010", "4110"]
};
```

Notes:
- Station codes are OpenData `stationcode` values.
- Codes are more robust than names (no accent/apostrophe issues).
- If a code does not match, the UI shows `N/A` for that row.

## Behavior

- Auto fetch on page load.
- Manual fetch when pressing `Refresh now`.
- No background polling.
- While fetching, the button is disabled to avoid duplicate calls.

## Local run

Any static server works. Example with Python:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In repository settings, open `Pages`.
3. Set source to `Deploy from a branch`.
4. Choose branch `main` and folder `/ (root)`.
5. Save and wait for the Pages URL.

## Troubleshooting

- Error: config missing
  - Ensure `config.js` exists and defines `window.VELIB_CONFIG`.
- Rows show `N/A`
  - Verify station codes match the OpenData `stationcode` values.
- Refresh failed
  - Check network connectivity and retry.
