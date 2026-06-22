# Recommended Public Structure

This repo is best published with a split between public study material and private source material.

## Public

- `README.md`
- `public-study/`
- `public/`
- `src/` if it only contains reusable presentation or report logic
- `Makefile`
- `package.json`
- `vercel.json`
- `docs/` if sanitized and source-free

## Private

- `api/data/` raw CSV/JSON source sets
- `api/docs/` source PDFs, spreadsheets, and archives
- `deploy/` host-specific deployment scripts
- `.env` and secrets
- `*.zip`, `*.pdf`, and source bundles

## Folderization Standard

Use this convention for new work:

- `public/` for the browser-facing app
- `api/` for the runtime backend
- `src/` for shared logic and transformations
- `scripts/` for one-off utilities
- `data/` for sanitized or derived datasets only
- `docs/` for human-readable explanations
- `public-study/` for publication-ready narrative material

## Publishing Rule

If a file can be used to recover a restricted source corpus, keep it private.
