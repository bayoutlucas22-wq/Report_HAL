# Argentina Hydrocarbons Open Data — Output Guide

**Generated:** 2026-04-01 | **Coverage:** 2015–2026 | **Source:** Argentina Secretaría de Energía (SESCO / datos.gob.ar)

This folder contains **20 report CSVs**, 3 raw data files, and 2 Excel bundles extracted and filtered from Argentina's national hydrocarbons open data platform. All records include a `tejas_match` and `tejas_found_in` column for cross-referencing against a Tejas valve/asset list (currently `False` for all rows — no Tejas matches found in this dataset).

---

## Folder Contents at a Glance

| File | Rows | Size | Description |
|------|------|------|-------------|
| `argentina_hydrocarbons_2015_2026.xlsx` | all sheets | 82 MB | Master Excel workbook — all 20 reports as separate sheets |
| `tejas_all_combined.xlsx` | — | 6.6 KB | Tejas-focused cross-reference export |
| `summary_report.txt` | — | 7 KB | Auto-generated run summary with record counts per dataset |
| `all_wells_estado.csv` | 100,000 | 15 MB | Raw well status snapshot |
| `all_wells_produccion.csv` | 130,000 | 43 MB | Raw per-well production data |
| `all_wells_fractura.csv` | 4,646 | 1.3 MB | Raw fracturing records |

---

## Report Files by Category

### Wells

#### `report_pozos_perforacion.csv` — 344,538 rows
**Drilling activity per well (2015–2026)**

Tracks every well under active drilling. Each row is one well × one monthly snapshot.

Key columns:
- `sigla` — well identifier
- `empresa` / `empresa_informante` — operator / reporting company
- `areapermisoconcesion` / `areayacimiento` — concession area and reservoir
- `cuenca` — basin (e.g. NEUQUINA, AUSTRAL)
- `provincia` — province
- `anio` / `mes` / `indice_tiempo` — time dimension
- `tipopozo` — well type (Petrolífero, Gasífero, etc.)
- `tipoestado` — status
- `formacion` / `formprod` — formation and productive formation
- `clasificacion` / `subclasificacion` — resource classification
- `tipo_de_recurso` — CONVENCIONAL / NO CONVENCIONAL
- `profundidad` — depth (meters)
- `prod_pet`, `prod_gas`, `prod_agua` — monthly oil, gas, water production
- `iny_agua`, `iny_gas`, `iny_co2`, `iny_otro` — injection volumes
- `tef` — productive days

---

#### `report_pozos_terminados.csv` — 100,000 rows
**Completed/finished wells (from 2009, no date filter applied)**

Monthly counts of newly completed wells by company, concession, and completion type.

Key columns:
- `empresa` / `idempresa` — company
- `areapermisoconcesion` / `areayacimiento` — area
- `tipodepozoterminado` — completion type (e.g. Productivos de Petróleo, Inyectores)
- `concepto` — work concept (Productivos, Exploratorios, etc.)
- `cantidad` — count of wells completed
- `cuenca`, `provincia`, `ubicacion` (On Shore / Off Shore)
- `indice_tiempo` — month index

---

#### `report_metros_perforados.csv` — 2 rows
**Drilled meters by company/concept (2015 data only after filter)**

Very small table. Same schema as `report_pozos_terminados` but `concepto` tracks meters drilled per concept type.

---

### Production

#### `report_produccion.csv` — 130,000 rows
**Per-well production — Annex IV (2015–2026)**

The most granular production table. One row per well per month.

Key columns: same as `report_pozos_perforacion.csv` (shares schema — this is the production-focused export of the same Annex IV source).

---

#### `report_prod_petroleo_yac.csv` — 25,000 rows
**Oil production aggregated by reservoir/field (2015–2026)**

Key columns:
- `empresa`, `areapermisoconcesion`, `areayacimiento`, `cuenca`, `provincia`
- `concepto` — production concept (Primaria, Secundaria, Terciaria, etc.)
- `cantidad` — volume (m³)
- `indice_tiempo`, `anio`, `mes`

---

#### `report_prod_gas_yac.csv` — 80,000 rows
**Gas production aggregated by reservoir/field (2015–2026)**

Same schema as oil equivalent above. Volumes in thousands of m³ (Mm³).

---

#### `report_prod_oil_diario_yac.csv` — 14,181 rows
**Average daily oil production by reservoir (2015–2026)**

Key columns:
- `produccion_petroleo_promedio_dia_m3` — average daily oil output (m³/day)
- `empresa`, `areayacimiento`, `areapermisoconcesion`, `cuenca`, `provincia`
- `indice_tiempo`, `anio`, `mes`

---

#### `report_prod_gas_diario_yac.csv` — 16,500 rows
**Average daily gas production by reservoir**

Key columns:
- `produccion_gas_promedio_dia_mm3` — average daily gas output (Mm³/day)
- Same dimensional columns as the oil daily equivalent.

---

#### `report_prod_oil_shale_cuenca.csv` — 3,165 rows
**Shale & tight oil production by basin (2015–2026)**

Key columns:
- `cuenca` — basin
- `concepto` — Shale Oil / Tight Oil / Shale+Tight combined
- `cantidad_m3` — volume
- `indice_tiempo`, `anio`, `mes`

---

#### `report_prod_gas_shale_cuenca.csv` — 4,080 rows
**Shale & tight gas production by basin**

Key columns:
- `cuenca`, `concepto` (Shale Gas / Tight Gas), `cantidad_mm3`
- `indice_tiempo`, `anio`, `mes`

---

### Completions

#### `report_fractura.csv` — 3,642 rows
**Hydraulic fracturing jobs (Annex IV, 2015–2026)**

Each row is one fracture job on one well.

Key columns:
- `idpozo` / `sigla` — well ID and name
- `areapermisoconcesion`, `yacimiento`, `cuenca`
- `empresa_informante`
- `fecha_inicio_fractura` / `fecha_fin_fractura` — job start/end date
- `cantidad_fracturas` — number of fracture stages
- `longitud_rama_horizontal_m` — horizontal lateral length (m)
- `presion_maxima_psi` — max treating pressure
- `agua_inyectada_m3` — water injected (m³)
- `arena_bombeada_nacional_tn` / `arena_bombeada_importada_tn` — sand volumes
- `co2_inyectado_m3` — CO₂ injected
- `potencia_equipos_fractura_hp` — equipment power (HP)
- `tipo_reservorio` — CONVENCIONAL / NO CONVENCIONAL
- `subtipo_reservorio` — SHALE / TIGHT / etc.
- `tipo_terminacion` — Punzado, Cañoneo, etc.
- `formacion_productiva` — producing formation (e.g. Vaca Muerta, Los Molles)

---

### Exploration

#### `report_exploracion_cuencas.csv` — 24 rows
**Sedimentary basin polygons**

Each row is one basin. Contains full GeoJSON geometries (MultiPolygon).

Key columns:
- `cuenca` — basin name
- `ubicacion` — ONSHORE / OFFSHORE
- `tipo` — Productiva / No Productiva
- `geojson` — full polygon geometry

---

#### `report_permisos_exploracion.csv` — 84 rows
**Active exploration permits**

Key columns:
- `areapermisoconcesion` / `codigo_de_sesco` — area name and code
- `empresa_informante` / `empresa_operadora_sesco` — reporting and operating company
- `alta_planos_base` / `modificacion_planos_base` — map creation/update dates
- `participacion_en_consorcio` — consortium participation shares
- `comentarios_de_geometria` — geometry notes

---

### Concessions

#### `report_concesiones.csv` — 297 rows
**Exploitation concession areas**

Same schema as `report_permisos_exploracion` but for concessions (exploitation, not exploration). Includes full GeoJSON polygons.

---

#### `report_yacimientos.csv` — 875 rows
**Individual reservoir/field polygons**

Key columns:
- `areayacimiento` / `idya` — reservoir name and code
- `empresa_operadora` / `empresa_informante`
- `geojson` — MultiPolygon geometry
- `alta_planos_base` / `modificacion_planos_base` — dates

---

### Companies

#### `report_registro_empresas.csv` — 191 rows
**Upstream company registry**

Key columns:
- `empresa` / `idempresa`
- `categoria` — Operadora / Productora / Transportadora
- `cuit` — tax ID
- `numeroregistro` — registry number
- `aniodelregistro` — registration year
- `calle`, `numero`, `piso`, `oficina`, `cp` — address
- `mail`, `telefono`

---

#### `report_consorcios.csv` — 4,012 rows
**Consortium participation records**

Each row is one company's stake in one concession area.

Key columns:
- `empresa` — company name
- `areapermisoconcesion` / `codigodesesco` — area
- `participacion` — percentage stake (float)
- `fechaasignacion` — assignment date
- `observaciones`

---

### Transport

#### `report_transporte_ductos.csv` — 36,403 rows
**Pipeline transport volumes — Annex 20 (2015–2026)**

Key columns:
- `empresa` — transporter company
- `denominacion_ducto` / `idducto` — pipeline name/ID
- `tipo_ducto` — Oleoducto / Gasoducto / Poliducto
- `tipo_producto` / `producto` — product type (Petroleo, Gas Natural, etc.)
- `nodo_origen` / `nodo_destino` — origin/destination nodes
- `longitud_tramo` / `longitud_ducto` — segment and total pipeline length (km)
- `volumen` — transported volume
- `tipo_operacion` — operation type
- `tipo_mercado` — Interno / Exportación
- `tipo_jurisdiccion` — Nacion / Provincia
- `area` — geographic area
- `cargador` — shipper company
- `anio`, `mes`

---

### Compliance

#### `report_inspecciones.csv` — 430 rows (2015–2026 filtered from 4,909 total)
**Fuel supply inspections at service stations**

Key columns:
- `razonsocial` / `cuit` — business name and tax ID
- `bandera` — fuel brand (YPF, Shell, DAPSA, etc.)
- `provincia`, `localidad`, `direccion`
- `fechainspeccion` — inspection date
- `producto1`–`producto8` — fuel types sold
- `existencia1`–`existencia8` — stock volumes per product
- `hubo_quiebre1`–`hubo_quiebre8` — stock-out occurred (SI/NO)
- `cantidad_dias_desabastecido1`–`8` — days without supply
- `precio_venta_publico1`–`8` — retail price per product
- `acredita` — ID credential of responsible person
- `idinspector`, `idusuario`
- `valido` — record validity flag

---

### Environment

#### `report_venteo.csv` — 1,006 rows
**Declared venting and flaring points**

Key columns:
- `procdet` — detailed process / site name
- `pv` — point ID
- `tipo` — CHIMENEA DE QUEMA / VENTEO / etc.
- `procedencia` — source (YACIMIENTO, PLANTA, etc.)
- `empresa_informante`
- `geojson` — Point geometry (lat/lon)

---

## Common Columns Across All Reports

| Column | Description |
|--------|-------------|
| `tejas_match` | `True`/`False` — whether this record matched a Tejas asset |
| `tejas_found_in` | Which Tejas source file the match came from (empty if no match) |
| `fecha_data` | Record load/update timestamp in source system |
| `cuenca` | Hydrocarbon basin (NEUQUINA, AUSTRAL, CUYANA, GOLFO SAN JORGE, NOROESTE, etc.) |
| `areapermisoconcesion` / `idareapermisoconcesion` | Concession area name and SESCO code |
| `areayacimiento` / `idareayacimiento` | Reservoir/field name and code |
| `empresa` / `idempresa` | Operator company name and code |
| `anio` / `mes` / `indice_tiempo` | Year, month (int), and composite index (YYYY-MM) |
| `provincia` | Argentine province |
| `ubicacion` | On Shore / Off Shore |

---

## How to Use

### Load a report in Python
```python
import pandas as pd

df = pd.read_csv("report_pozos_perforacion.csv")
# Filter by basin
neuquina = df[df["cuenca"] == "NEUQUINA"]
# Filter by company
ypf = df[df["empresa"].str.contains("YPF", na=False)]
```

### Load the master Excel workbook
```python
xl = pd.ExcelFile("argentina_hydrocarbons_2015_2026.xlsx")
print(xl.sheet_names)  # one sheet per dataset
df = xl.parse("pozos_perforacion")
```

### Parse GeoJSON geometries
Several reports (`report_concesiones`, `report_exploracion_cuencas`, `report_yacimientos`, `report_venteo`) embed full GeoJSON. To map them:
```python
import geopandas as gpd
import json

df = pd.read_csv("report_yacimientos.csv")
df["geometry"] = df["geojson"].apply(lambda x: json.loads(x) if pd.notna(x) else None)
gdf = gpd.GeoDataFrame(df, geometry=df["geometry"].apply(lambda x: gpd.GeoSeries.from_wkt([json.dumps(x)]).iloc[0] if x else None))
```

---

## Data Notes

- **Record limits:** Several datasets were extracted with a 100,000 or 130,000 row cap. Full datasets may have more records.
- **Tejas matching:** All `tejas_match` values are `False` — no Tejas valve/equipment identifiers were found in any of the 20 datasets.
- **Metros perforados:** Only 2 records pass the 2015–2026 date filter; the source API returned 100,000 rows but most predate 2015.
- **GeoJSON fields:** Raw GeoJSON strings can be very large (basin polygons especially). Parse on demand rather than loading all at once.
- **Encoding:** Files use UTF-8 with BOM (`\ufeff`). Use `encoding="utf-8-sig"` in pandas if column headers show a leading `﻿`.

```python
df = pd.read_csv("report_concesiones.csv", encoding="utf-8-sig")
```
