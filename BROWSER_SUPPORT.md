# Browser support

The app targets current stable versions of Chrome, Edge, Firefox, and Safari. Core menu calculation works without third-party runtime libraries.

Shared-link compression uses `CompressionStream` and `DecompressionStream` when available and falls back to an uncompressed URL payload. PWA installation and offline caching require HTTPS and service-worker support. Printing/PDF output depends on the browser print engine.

The safety regression suite runs with Node.js:

```sh
node tests/safety.test.cjs
```

Before a release, verify at minimum:

- JSON export/import and raw/compressed links;
- keyboard navigation for dialogs, tabs, and product selection;
- print preview;
- first online load followed by an offline navigation;
- narrow-phone and foldable layouts.
