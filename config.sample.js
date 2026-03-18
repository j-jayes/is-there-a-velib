window.VELIB_CONFIG = {
  // Copy this file to config.js and replace the station codes below.
  // Keep three codes in each array for the intended UX.
  homeStationCodes: [
    "3011",
    "3007",
    "3102"
  ],
  workStationCodes: [
    "4009",
    "4010",
    "4110"
  ],

  // Backend API configuration
  // Set to null to use official GBFS only (no backend required)
  // Set to local URL for development, or deployed URL for production
  backendUrl: "http://localhost:3000",    // Development backend
  // backendUrl: "https://your-domain.com", // Production backend

  // Feature flags
  enableAppDataExtraction: false,  // Set to true once Phase 2 is complete
  includeThreeStarBikes: true,     // Show 3-star electric bikes in UI if available

  // Advanced: override to true to force official-only mode (no backend calls)
  forceOfficalOnly: false,
};
