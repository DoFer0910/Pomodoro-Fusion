---
trigger: always_on
---

# Development Workflow: Web Version First Implementation Rule

## 1. Basic Policy
Implementation and functional verification of new features shall, as a rule, be **prioritized for the Web app version (Next.js)**. The desktop app version (Electron) will follow the procedure of reflecting and building the results after the feature is finalized in the Web version.

## 2. Reasons for Applying This Rule
- **Reliable Verification**: In the Google Antigravity environment, verifying behavior specific to the desktop app can be difficult or unstable.
- **Simplified Troubleshooting**: To clearly identify whether issues stem from logic problems (common to the web) or environment/packaging problems (specific to Electron).
- **Development Speed**: It is more efficient to complete development entirely in the web version, where HMR (Hot Module Replacement) and browser debugging tools can be fully utilized.

## 3. Implementation Procedure (Standard Procedure)
1. **Implementation in the Web Version**: Implement new features in the web environment using commands like `npm run dev`.
2. **Verify in Web Version**: Confirm perfect behavior in the browser (e.g., Pomodoro timer functionality, UI responsiveness).
3. **Deploy to Desktop Version**:
   - Integrate the web version code into the desktop environment.
   - Run `npm run dev:electron` to check for desktop-specific display issues.
4. **Build Verification**: Finally, verify that the installer generates correctly using `npm run build:electron`.

## 4. Important Notes
- When using Node.js-specific APIs (e.g., file system operations), create mocks (dummy implementations) in the web version to prevent errors. Replace these with the actual implementation during Electron integration.
*** Translated with www.DeepL.com/Translator (free version) ***

