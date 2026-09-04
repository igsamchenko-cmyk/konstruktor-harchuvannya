# Portable data format

JSON exports use schema version `2`. Shared URL payloads use compact schema version `4`.

## JSON backup

Top-level fields:

- `v`: schema version;
- `profile`: bounded profile and medical-screening values;
- `settings`: generation settings, exclusions, and sanitized meal times;
- `days`: seven days of meal components;
- `weights` and `checkins`: normalized progress records;
- `note`, `done`, and `activeDay`: specialist note, completion checklist, and current day;
- `ui`: display mode only; imported files cannot restore a locked state;
- `customProducts`: sanitized custom food records;
- `exportedAt`: ISO timestamp.

Imports are allowlisted. Unknown object properties are ignored; strings and collections are size-limited; numeric settings are clamped to UI-supported ranges; product IDs and checklist keys must match their expected shapes. Invalid day structures are discarded and regenerated.

## Compact shared payload

Compact keys are `p` (profile), `s` (settings), `d` (days), `n` (note), `m` (mode), and `c` (custom foods). The outer URL marker identifies raw or deflate-raw encoding. Encoding is compression, not encryption.

The simplified-view variant deliberately omits identifying, medical, and progress-history fields. See [PRIVACY.md](PRIVACY.md).
