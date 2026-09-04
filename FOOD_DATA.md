# Food data provenance and limitations

The built-in food table is a product-planning dataset, not a laboratory database. Values represent common foods and practical portions; recipes and brands can differ materially.

Fields `k`, `p`, `f`, `cb`, and `fb` describe energy, protein, fat, carbohydrate, and fiber per 100 g. The quality fields `na`, `sf`, and `sug` are explicit only where present. When absent, the UI's quality indicator uses documented heuristics and must remain labelled as an estimate.

## Provenance policy for future records

Every new or revised record should be reviewed against a named authoritative composition source or a photographed manufacturer label and should carry, in a versioned source table:

- stable product ID;
- source organization or brand;
- source URL or label reference;
- retrieval/review date;
- prepared/raw basis and serving basis;
- confidence: measured label, authoritative database, recipe estimate, or heuristic;
- reviewer and change reason.

The current legacy table does not yet provide that metadata per record. Until it does, sodium, saturated-fat, and free-sugar totals must not be represented as clinical measurements. Version history belongs in Git and material data changes belong in [CHANGELOG.md](CHANGELOG.md).
