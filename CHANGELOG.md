# Changelog

## Unreleased

### Security

- Closed DOM XSS through imported meal times: all time labels are bounded, normalized, and escaped in the app and print view.
- Replaced broad object merging during JSON/hash import with explicit allowlists and range validation.
- Limited compressed and raw shared payload sizes.
- Reduced simplified-view links: they no longer contain the client name, waist, medical screening, weight history, or check-ins.
- A simplified-view link can no longer unlock specialist controls and is explicitly described as a bearer link, not authorization.
- Opening a shared link no longer silently overwrites the browser's saved profile.

### Privacy and reliability

- Added visible local-storage failure reporting and controls to save or delete the local copy.
- JSON backups now include the specialist note, completion checklist, active day, and UI mode.
- Added explicit warnings before copying full-profile links.

### Accessibility and PWA

- Corrected field grouping and tab roles, removed labels containing multiple labelable controls, and fixed a generic ARIA label.
- The service worker now deletes only caches owned by this app.
- Offline app-shell fallback is limited to document navigation; missing scripts and images return an error.

### Tests and documentation

- Added negative tests for hostile imported times and state, simplified-link data minimization, non-overwriting link imports, cache isolation, and navigation-only fallback.
- Documented privacy, the portable JSON format, browser support, and food-data provenance limits.
