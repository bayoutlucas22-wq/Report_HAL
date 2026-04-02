# Link Verification Report

## Overview
This report contains the corrected and verified working URLs for the Argentine government and provincial data portals, resolving previous 404/broken link issues. The availability of each site has been checked and confirmed.

---

### 1. Procurement Portal (COMPR.AR)
* **Status**: ✅ Working (`200 OK`)
* **Previous URL**: `contrataciones.gob.ar` (Inactive)
* **New Verified URL**: [https://comprar.gob.ar/](https://comprar.gob.ar/)
* **Notes**: The old domain has been entirely replaced by the COMPR.AR system. The new domain properly handles authentication and public tender searches.

### 2. Neuquén Official Bulletin
* **Status**: ✅ Working (`200 OK` via `301 Redirect`)
* **Target Issue**: Accessing "Decreto 1483/2012"
* **New Verified URL**: [https://boficial.neuquen.gov.ar/](https://boficial.neuquen.gov.ar/)
* **Notes**: The main bulletin homepage is active. Navigating to the index redirects reliably to `/Boletines`, allowing users to query historical decrees like Decreto 1483/2012.

### 3. Energy Data - Production Dataset
* **Status**: ✅ Working (`200 OK`)
* **Target Issue**: "produccion de petroleo y gas por pozo" dataset returning 404.
* **Previous (Dead) URL**: `datos.energia.gob.ar/dataset/produccion-de-petroleo-y-gas-por-pozo`
* **New Verified URL**: [https://datos.gob.ar/dataset/energia-produccion-petroleo-gas-por-pozo-capitulo-iv](https://datos.gob.ar/dataset/energia-produccion-petroleo-gas-por-pozo-capitulo-iv)
* **Notes**: The dataset generally known as "Capítulo IV" was moved from the energy sub-domain into the centralized national data portal (`datos.gob.ar`). The new repository contains the latest monthly breakdowns by well, field, concession, and province.

---

### Recommended Actions
- Update any project configurations, codebases, or documentation that mapped to `datos.energia.gob.ar` to use `datos.gob.ar`.
- Update references to `contrataciones.gob.ar` to point to `comprar.gob.ar`.
