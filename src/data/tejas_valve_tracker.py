"""
Argentina Hydrocarbon Open Data — Full Report 2015–2026
=========================================================
Pulls every publicly available CSV dataset from datos.energia.gob.ar
(CKAN API) covering wells, production, fracking, concessions, transport,
prices, royalties, companies, inspections, and venting.

Across all datasets the script also flags records matching "tejas".

Datasets (20):
  Wells:       Pozos en Perforación, Pozos Terminados, Metros Perforados
  Production:  Producción por Pozo (Cap IV), Prod. Petróleo/Gas por Yacimiento,
               Prod. Petróleo/Gas SESCO + Tight & Shale por Cuenca,
               Prod. Petróleo/Gas promedio diaria por Yacimiento
  Completions: Fractura — Adjunto IV (daily)
  Exploration: Cuencas Sedimentarias, Permisos de Exploración
  Concessions: Concesiones de Explotación, Yacimientos, Lotes de Explotación
  Companies:   Registro Empresas Upstream, Conformación de Consorcios, UTES
  Transport:   Volúmenes Ductos (Planilla 20)
  Prices:      Precios Gas Natural (desde 2019)
  Compliance:  Inspecciones de Abastecimiento
  Environment: Puntos de Venteo Declarados

Usage:
  pip install requests pandas openpyxl
  python tejas_valve_tracker.py

Output (./output/):
  report_<key>.csv                         — full filtered data per dataset
  tejas_<key>.csv                          — Tejas-matched rows per dataset
  argentina_hydrocarbons_2015_2026.xlsx    — master workbook (one sheet per dataset)
  summary_report.txt                       — plain-text summary
"""

import warnings
import requests
import pandas as pd
import os
import time
from datetime import datetime

warnings.filterwarnings("ignore")  # suppress SSL InsecureRequestWarning

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL   = "https://datos.energia.gob.ar/api/3/action/datastore_search"
OUTPUT_DIR = "./output"
TEJAS_KEYWORD  = "tejas"
YEAR_FROM  = 2015
YEAR_TO    = 2026

DATASETS = {
    # ── WELLS ──────────────────────────────────────────────────────────────
    "pozos_perforacion": {
        "category": "Wells",
        "label": "Pozos en Perforación",
        "resource_id": "af6838ef-f675-4409-ac6a-e7c391a5dbab",
        "limit": 500000,
        "tejas_cols": ["empresa", "yacimiento", "pozo", "denominacion", "concesion"],
        "date_cols": ["anio", "fecha", "periodo"],
    },
    "pozos_terminados": {
        "category": "Wells",
        "label": "Pozos Terminados (desde 2009)",
        "resource_id": "a2ce14af-5c56-45c2-9b9c-c7a1e5156dff",
        "limit": 100000,
        "tejas_cols": ["empresa", "yacimiento", "pozo", "denominacion", "concesion"],
        "date_cols": ["anio", "fecha"],
    },
    "metros_perforados": {
        "category": "Wells",
        "label": "Metros Perforados (desde 2009)",
        "resource_id": "712805f3-35d4-4825-93c6-98d03aeca203",
        "limit": 100000,
        "tejas_cols": ["empresa", "cuenca", "provincia"],
        "date_cols": ["anio", "fecha"],
    },
    # ── PRODUCTION ─────────────────────────────────────────────────────────
    "produccion": {
        "category": "Production",
        "label": "Producción por Pozo — Cap. IV",
        "resource_id": "876b3746-85e2-4039-adeb-b1354436159f",
        "limit": 200000,
        "tejas_cols": ["empresa", "yacimiento", "pozo", "denominacion", "concesion"],
        "date_cols": ["anio", "fecha", "periodo"],
    },
    "prod_petroleo_yac": {
        "category": "Production",
        "label": "Producción Petróleo por Yacimiento",
        "resource_id": "745facdc-73dc-46d8-83d5-d027bdaa3210",
        "limit": 100000,
        "tejas_cols": ["empresa", "yacimiento", "cuenca", "concesion", "provincia"],
        "date_cols": ["anio", "fecha", "periodo"],
    },
    "prod_gas_yac": {
        "category": "Production",
        "label": "Producción Gas por Yacimiento",
        "resource_id": "ce479c85-2e8b-441e-9c68-9681597b3694",
        "limit": 100000,
        "tejas_cols": ["empresa", "yacimiento", "cuenca", "concesion", "provincia"],
        "date_cols": ["anio", "fecha", "periodo"],
    },
    "prod_oil_shale_cuenca": {
        "category": "Production",
        "label": "Prod. Petróleo SESCO + Tight & Shale (por Cuenca)",
        "resource_id": "aa524d41-f6b7-42dc-ae24-3b4a895002ab",
        "limit": 50000,
        "tejas_cols": ["cuenca", "empresa"],
        "date_cols": ["anio", "fecha", "periodo"],
    },
    "prod_gas_shale_cuenca": {
        "category": "Production",
        "label": "Prod. Gas SESCO + Tight & Shale (por Cuenca)",
        "resource_id": "f44d3962-08ce-48e8-b2e3-88f65e1dcb77",
        "limit": 50000,
        "tejas_cols": ["cuenca", "empresa"],
        "date_cols": ["anio", "fecha", "periodo"],
    },
    "prod_oil_diario_yac": {
        "category": "Production",
        "label": "Prod. Petróleo Promedio Diaria por Yacimiento",
        "resource_id": "e7102ae1-9e9d-45f0-a439-ca450ad8813c",
        "limit": 100000,
        "tejas_cols": ["empresa", "yacimiento", "cuenca", "provincia"],
        "date_cols": ["anio", "fecha", "periodo"],
    },
    "prod_gas_diario_yac": {
        "category": "Production",
        "label": "Prod. Gas Promedio Diaria por Yacimiento",
        "resource_id": "2f939eee-0b3c-4176-8eb9-c4a1abd1bc37",
        "limit": 100000,
        "tejas_cols": ["empresa", "yacimiento", "cuenca", "provincia"],
        "date_cols": ["anio", "fecha", "periodo"],
    },
    # ── COMPLETIONS ────────────────────────────────────────────────────────
    "fractura": {
        "category": "Completions",
        "label": "Fractura — Adjunto IV (daily)",
        "resource_id": "2280ad92-6ed3-403e-a095-50139863ab0d",
        "limit": 100000,
        "tejas_cols": ["empresa", "yacimiento", "pozo", "concesion", "tipo_terminacion"],
        "date_cols": ["fecha", "anio"],
    },
    # ── EXPLORATION ────────────────────────────────────────────────────────
    "exploracion_cuencas": {
        "category": "Exploration",
        "label": "Exploración — Cuencas Sedimentarias",
        "resource_id": "04263302-626d-4a81-9564-106e08b975a3",
        "limit": 10000,
        "tejas_cols": ["empresa", "cuenca", "nombre", "tipo"],
        "date_cols": ["anio", "fecha"],
    },
    "permisos_exploracion": {
        "category": "Exploration",
        "label": "Permisos de Exploración",
        "resource_id": "c33b6176-6025-41ee-b174-d4d7653735c3",
        "limit": 10000,
        "tejas_cols": ["empresa", "nombre", "area", "denominacion"],
        "date_cols": ["anio", "fecha", "fecha_inicio", "fecha_vencimiento"],
    },
    # ── CONCESSIONS ────────────────────────────────────────────────────────
    "concesiones": {
        "category": "Concessions",
        "label": "Concesiones de Explotación",
        "resource_id": "b6af0c0e-e463-4cb7-b458-373aafc0ac08",
        "limit": 10000,
        "tejas_cols": ["empresa", "nombre", "area", "denominacion", "concesionario"],
        "date_cols": ["anio", "fecha", "fecha_inicio", "fecha_vencimiento"],
    },
    "yacimientos": {
        "category": "Concessions",
        "label": "Yacimientos",
        "resource_id": "6130ac5d-e78e-4aef-9925-030db6434c56",
        "limit": 10000,
        "tejas_cols": ["empresa", "nombre", "area", "denominacion", "yacimiento"],
        "date_cols": ["anio", "fecha"],
    },
    # ── COMPANIES ──────────────────────────────────────────────────────────
    "registro_empresas": {
        "category": "Companies",
        "label": "Registro Empresas Upstream",
        "resource_id": "dec5cd65-8ac7-4f76-933c-aa6ae498fd3e",
        "limit": 10000,
        "tejas_cols": ["empresa", "razon_social", "nombre"],
        "date_cols": ["anio", "fecha", "fecha_inscripcion"],
    },
    "consorcios": {
        "category": "Companies",
        "label": "Conformación de Consorcios",
        "resource_id": "4f417d63-b53c-4424-8cc3-98dd276f129a",
        "limit": 50000,
        "tejas_cols": ["empresa", "area", "denominacion", "yacimiento"],
        "date_cols": ["anio", "fecha"],
    },
    # ── TRANSPORT ──────────────────────────────────────────────────────────
    "transporte_ductos": {
        "category": "Transport",
        "label": "Volúmenes Transporte Ductos (Planilla 20)",
        "resource_id": "f1d13dac-fca5-4464-940d-ce86c16cbff3",
        "limit": 50000,
        "tejas_cols": ["empresa", "ducto", "nombre", "origen", "destino"],
        "date_cols": ["anio", "fecha", "periodo"],
    },
    # ── COMPLIANCE ─────────────────────────────────────────────────────────
    "inspecciones": {
        "category": "Compliance",
        "label": "Inspecciones de Abastecimiento",
        "resource_id": "ca9dfa0d-2e7c-488e-ba92-4b545f5e060d",
        "limit": 50000,
        "tejas_cols": ["empresa", "razon_social", "localidad", "provincia", "tipo"],
        "date_cols": ["fecha", "anio"],
    },
    # ── ENVIRONMENT ────────────────────────────────────────────────────────
    "venteo": {
        "category": "Environment",
        "label": "Puntos de Venteo Declarados",
        "resource_id": "c3812323-0c38-43b7-8bc6-f05fb5113626",
        "limit": 10000,
        "tejas_cols": ["empresa", "yacimiento", "area", "denominacion"],
        "date_cols": ["anio", "fecha"],
    },
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch_resource(resource_id: str, limit: int, label: str) -> pd.DataFrame:
    """Fetch all records from a CKAN datastore resource with pagination."""
    records = []
    offset  = 0
    batch   = 5000

    print(f"\n  [{label}]")

    while True:
        params = {
            "resource_id": resource_id,
            "limit":       min(batch, limit - len(records)),
            "offset":      offset,
        }
        try:
            resp = requests.get(BASE_URL, params=params, timeout=30, verify=False)
            resp.raise_for_status()
            data = resp.json()

            if not data.get("success"):
                print(f"  ✗ API error: {data.get('error', {})}")
                break

            batch_records = data["result"]["records"]
            if not batch_records:
                break

            records.extend(batch_records)
            total = data["result"].get("total", "?")
            print(f"    {len(records):>8,} / {total:>8} records loaded", end="\r")

            if len(records) >= limit or len(batch_records) < batch:
                break

            offset += len(batch_records)
            time.sleep(0.25)

        except requests.exceptions.HTTPError as e:
            print(f"\n  ✗ HTTP {e.response.status_code} — resource may not be in CKAN datastore")
            break
        except requests.RequestException as e:
            print(f"\n  ✗ Network error: {e}")
            break

    status = "✓" if records else "✗ (0 records)"
    print(f"    {len(records):>8,} records loaded  {status}          ")
    return pd.DataFrame(records)


def filter_date_range(df: pd.DataFrame, date_cols: list) -> tuple:
    """
    Try to filter df to YEAR_FROM–YEAR_TO using the first matching date column.
    Returns (filtered_df, col_used_or_None).
    """
    if df.empty:
        return df, None

    for col in date_cols:
        if col not in df.columns:
            continue

        if col in ("anio", "año", "year"):
            years = pd.to_numeric(df[col], errors="coerce")
            mask  = (years >= YEAR_FROM) & (years <= YEAR_TO)
        else:
            dates = pd.to_datetime(df[col], errors="coerce", dayfirst=True)
            mask  = (dates.dt.year >= YEAR_FROM) & (dates.dt.year <= YEAR_TO)

        filtered = df[mask.fillna(False)]
        if not filtered.empty:
            return filtered.reset_index(drop=True), col

    # No date column matched — return full dataset
    return df, None


def flag_tejas(df: pd.DataFrame, cols: list) -> pd.DataFrame:
    """Add tejas_match (bool) and tejas_found_in (str) columns."""
    if df.empty:
        df["tejas_match"]    = False
        df["tejas_found_in"] = ""
        return df

    available = [c for c in cols if c in df.columns]

    def find_match(row):
        hits = []
        for col in available:
            val = str(row.get(col, "") or "")
            if TEJAS_KEYWORD in val.lower():
                hits.append(f"{col}='{val}'")
        return hits

    matches = df.apply(find_match, axis=1)
    df = df.copy()
    df["tejas_match"]    = matches.apply(lambda x: len(x) > 0)
    df["tejas_found_in"] = matches.apply(lambda x: " | ".join(x))
    return df


def print_summary(key: str, df_raw: pd.DataFrame, df_filtered: pd.DataFrame,
                  tejas_df: pd.DataFrame, date_col):
    cfg = DATASETS[key]
    print(f"\n  {'─'*56}")
    print(f"  [{cfg['category']}] {cfg['label']}")
    print(f"  Raw records  : {len(df_raw):,}")
    if date_col:
        print(f"  2015–2026    : {len(df_filtered):,}  (filtered on '{date_col}')")
    else:
        print(f"  Date filter  : n/a — no date column matched")
    print(f"  Tejas hits   : {len(tejas_df):,}"
          f" ({100*len(tejas_df)/max(len(df_filtered),1):.2f}%)")

    if not tejas_df.empty:
        for col in ("provincia", "empresa", "yacimiento", "cuenca"):
            if col in tejas_df.columns:
                top = tejas_df[col].value_counts().head(5)
                print(f"  Top {col}:")
                for val, cnt in top.items():
                    print(f"    {str(val):<32} {cnt}")
                break


def save_summary_txt(results: dict, output_dir: str):
    lines = [
        "=" * 66,
        "  ARGENTINA HYDROCARBONS OPEN DATA — FULL REPORT 2015–2026",
        f"  Generated : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"  Datasets  : {len(results)}",
        "=" * 66, "",
    ]

    by_cat = {}
    for key, res in results.items():
        cat = DATASETS[key]["category"]
        by_cat.setdefault(cat, []).append((key, res))

    for cat, items in by_cat.items():
        lines.append(f"{'─'*66}")
        lines.append(f"  CATEGORY: {cat}")
        lines.append(f"{'─'*66}")

        for key, res in items:
            df_f   = res["filtered"]
            tejas  = res["tejas"]
            dc     = res["date_col"]
            lines.append(f"\n  {DATASETS[key]['label']}")
            lines.append(f"    Raw records loaded : {len(res['df']):,}")
            lines.append(f"    2015–2026 records  : {len(df_f):,}"
                         + (f"  [filtered on '{dc}']" if dc else "  [no date col]"))
            lines.append(f"    Tejas matches      : {len(tejas):,}")

            for col in ("provincia", "empresa", "yacimiento", "cuenca"):
                if not tejas.empty and col in tejas.columns:
                    lines.append(f"    By {col}:")
                    for val, cnt in tejas[col].value_counts().head(10).items():
                        lines.append(f"      {str(val):<32} {cnt}")
                    break

        lines.append("")

    path = os.path.join(output_dir, "summary_report.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\n  Summary  → {path}")


def save_excel(results: dict, output_dir: str):
    path = os.path.join(output_dir, "argentina_hydrocarbons_2015_2026.xlsx")

    with pd.ExcelWriter(path, engine="openpyxl") as writer:

        # Cover sheet
        cover_rows = []
        for key, res in results.items():
            cover_rows.append({
                "category":       DATASETS[key]["category"],
                "dataset":        DATASETS[key]["label"],
                "raw_records":    len(res["df"]),
                "records_2015_26": len(res["filtered"]),
                "date_col_used":  res["date_col"] or "—",
                "tejas_matches":  len(res["tejas"]),
                "tejas_pct":      round(100*len(res["tejas"])/max(len(res["filtered"]),1), 3),
                "status":         "ok" if not res["df"].empty else "no data",
            })
        pd.DataFrame(cover_rows).to_excel(writer, sheet_name="INDEX", index=False)

        # Per-dataset sheets (filtered data)
        for key, res in results.items():
            df   = res["filtered"]
            name = key[:31]
            if df.empty:
                pd.DataFrame({"message": ["No data / resource not in CKAN datastore"]}) \
                  .to_excel(writer, sheet_name=name, index=False)
            else:
                df.to_excel(writer, sheet_name=name, index=False)

        # Tejas combined sheet
        tejas_frames = []
        for key, res in results.items():
            t = res["tejas"].copy()
            if not t.empty:
                t.insert(0, "source_dataset", DATASETS[key]["label"])
                tejas_frames.append(t)

        if tejas_frames:
            combined = pd.concat(tejas_frames, ignore_index=True)
            combined.to_excel(writer, sheet_name="TEJAS_ALL", index=False)
        else:
            pd.DataFrame({"message": ["No Tejas matches found across all datasets"]}) \
              .to_excel(writer, sheet_name="TEJAS_ALL", index=False)

    print(f"  Excel    → {path}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 66)
    print("  ARGENTINA HYDROCARBONS OPEN DATA — FULL REPORT 2015–2026")
    print(f"  Datasets : {len(DATASETS)}")
    print("=" * 66)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    results = {}

    for key, cfg in DATASETS.items():
        df_raw = fetch_resource(cfg["resource_id"], cfg["limit"], cfg["label"])

        df_filtered, date_col = filter_date_range(df_raw, cfg["date_cols"])
        df_filtered = flag_tejas(df_filtered, cfg["tejas_cols"])
        tejas_df    = df_filtered[df_filtered["tejas_match"]].copy()

        results[key] = {
            "df":       df_raw,
            "filtered": df_filtered,
            "tejas":    tejas_df,
            "date_col": date_col,
        }
        print_summary(key, df_raw, df_filtered, tejas_df, date_col)

        # Per-dataset CSVs
        if not df_filtered.empty:
            p = os.path.join(OUTPUT_DIR, f"report_{key}.csv")
            df_filtered.to_csv(p, index=False, encoding="utf-8-sig")
            print(f"  Report   → {p}")

        if not tejas_df.empty:
            p = os.path.join(OUTPUT_DIR, f"tejas_{key}.csv")
            tejas_df.to_csv(p, index=False, encoding="utf-8-sig")
            print(f"  Tejas    → {p}")

    # Master Excel
    print("\n  Building master Excel workbook…")
    try:
        save_excel(results, OUTPUT_DIR)
    except ImportError:
        print("  (openpyxl not installed — run: pip install openpyxl)")

    # Summary text
    save_summary_txt(results, OUTPUT_DIR)

    total_tejas = sum(len(r["tejas"]) for r in results.values())
    total_recs  = sum(len(r["filtered"]) for r in results.values())
    print("\n" + "=" * 66)
    print(f"  Done.  {total_recs:,} total records (2015–2026) across {len(results)} datasets.")
    print(f"  Tejas matches: {total_tejas:,}")
    print(f"  Output folder: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 66 + "\n")


if __name__ == "__main__":
    main()
