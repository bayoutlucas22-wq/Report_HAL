# Methodology

The study uses a layered workflow:

1. Collect public or semi-public records from regional regulatory and disclosure sources.
2. Normalize records into a common schema for comparison across markets.
3. Derive summary metrics, counts, and trend signals.
4. Generate narrative findings and dashboard views from the derived data.
5. Separate any source-sensitive material from the public-facing publication layer.

## Analytical pattern

- Normalize heterogeneous records into shared categories
- Compare regions using consistent summary metrics
- Prioritize aggregated findings over source-level detail
- Present only sanitized extracts in the public edition

## Public-study rule

The public version should never expose enough detail to recreate restricted source bundles. If a field, filename, URL, or identifier can be used to trace back to the original source corpus, it must be removed, generalized, or aggregated.

## Reproducibility

Public readers should be able to understand:

- how the workflow is organized
- how summaries are derived
- how the dashboard is structured
- what kinds of inputs were used at a high level

They should not be able to rebuild the private source corpus from the public package alone.
