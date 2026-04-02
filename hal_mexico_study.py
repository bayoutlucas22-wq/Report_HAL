"""
HAL Mexico Compliance Intelligence Study
=============================================
Maps Halliburton's operational footprint in Mexico mimicking the Argentina study.
It now ingests real SIH dataset provided (PRODUCCION_OPERADORES.csv) to pull the true 
operators and volume metrics, synthesizing drilling parameters (PSI, stages) dynamically
to fit the unified LATAM UI until perforacion (drilling) datasets are provided.
"""

import pandas as pd
import numpy as np
import os
import warnings
from datetime import datetime

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

PROD_OP_PATH = os.path.join(DATA_DIR, "PRODUCCION_OPERADORES.csv")
POZOS_ZIP_PATH = os.path.join(DATA_DIR, "PRODUCCION_POZOS.zip")

PERF_PATH = os.path.join(DATA_DIR, "mexico_perforacion.csv")

def process_operator_exposure():
    print("  Processing real SIH Perforacion data (mexico_perforacion.csv)...")
    try:
        df_perf = pd.read_csv(PERF_PATH)
        df_perf["operador"] = df_perf["operador"].str.upper()
        
        # Aggregate real drilling metrics per Operator
        grp = df_perf.groupby("operador").agg(
            jobs=("id_pozo", "count"),
            stages=("etapas_fractura", "sum"),
            avg_psi=("presion_max_psi", "mean"),
        ).reset_index()
        
        # Join with basins (just grab the most active basin for that operator)
        basins = df_perf.groupby("operador")["cuenca"].agg(lambda x: x.mode()[0] if not x.empty else "N/A").reset_index()
        grp = grp.merge(basins, on="operador")
        grp = grp.rename(columns={"cuenca": "basin"})
        
        # Risk Tier based on real stage intensity instead of just liquids
        def get_tier(row):
            if row["stages"] > 1000: return "HIGH"
            if row["stages"] > 200:  return "MEDIUM"
            return "LOW"
            
        grp["risk_tier"] = grp.apply(get_tier, axis=1)
        grp["avg_psi"] = grp["avg_psi"].fillna(0).astype(int)
        
        return grp.sort_values("jobs", ascending=False)
        
    except Exception as e:
        print(f"Error processing operators: {e}")
        return pd.DataFrame()
        
    except Exception as e:
        print(f"Error processing operators: {e}")
        return pd.DataFrame()


def build_formation_risk():
    print("  Aggregating SIH formation risks from mexico_perforacion.csv...")
    try:
        df_perf = pd.read_csv(PERF_PATH)
        df_perf["formacion"] = df_perf["formacion"].str.title()
        
        grp = df_perf.groupby("formacion").agg(
            jobs=("id_pozo", "count"),
            avg_psi=("presion_max_psi", "mean"),
            offshore_count=("offshore_flag", "sum")
        ).reset_index()
        
        grp["offshore_pct"] = (grp["offshore_count"] / grp["jobs"]) * 100
        grp["offshore_pct"] = grp["offshore_pct"].fillna(0).round(1)
        
        # Assign basic hazards based on actual formation depth/PSI parameters
        def assign_hazard(row):
            if row["avg_psi"] > 11000: return "Deep HPHT / Well control"
            if "Jul" in row["formacion"] or "Cret" in row["formacion"]: return "Naturally fractured carbonates"
            return "Standard pressure horizons"
            
        grp["primary_hazard"] = grp.apply(assign_hazard, axis=1)
        grp["avg_psi"] = grp["avg_psi"].fillna(0).astype(int)
        
        return grp[["formacion", "jobs", "avg_psi", "offshore_pct", "primary_hazard"]].sort_values("jobs", ascending=False).head(10)
    except Exception as e:
        print(f"Error processing formations: {e}")
        return pd.DataFrame()

def build_trend():
    print("  Aggregating true chronological trends from mexico_perforacion.csv...")
    try:
        df_perf = pd.read_csv(PERF_PATH)
        grp = df_perf.groupby("year").agg(
            jobs=("id_pozo", "count"),
            stages=("etapas_fractura", "sum"),
            avg_psi=("presion_max_psi", "mean"),
            avg_hp=("potencia_hp", "mean"),
            avg_lateral=("longitud_lateral_m", "mean"),
            offshore_count=("offshore_flag", "sum")
        ).reset_index()
        
        # Calculate percentages
        grp["offshore_pct"] = (grp["offshore_count"] / grp["jobs"]) * 100
        
        # Calculate Burgos specific share
        burgos_jobs = df_perf[df_perf["cuenca"].str.contains("Burgos", na=False, case=False)].groupby("year").size()
        grp["burgos_pct"] = grp["year"].map(burgos_jobs).fillna(0) / grp["jobs"] * 100
        
        grp = grp.fillna(0).round(1)
        grp[["avg_psi", "avg_hp", "avg_lateral"]] = grp[["avg_psi", "avg_hp", "avg_lateral"]].astype(int)
        
        return grp.sort_values("year")
    except Exception as e:
        print(f"Error processing trends: {e}")
        return pd.DataFrame()


def write_study_report(op_exp, form_risk, trend):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        "=" * 72,
        "  HALLIBURTON MEXICO — COMPLIANCE INTELLIGENCE STUDY",
        f"  Generated: {now}",
        "  Source: SIH Open Data (PRODUCCION_OPERADORES.csv ingested)",
        "=" * 72,
        "",
        "  1. SUMMARY METRICS",
        "─" * 72,
        f"  Active Operators tracked: {len(op_exp)}",
        f"  Total Drilling Jobs (Proxy): {op_exp['jobs'].sum()}",
        "",
        "  2. REAL OPERATOR EXPOSURE (Ranked by Liquid Prod Scale)",
        "─" * 72,
    ]
    
    for _, row in op_exp.head(15).iterrows():
        op_name = str(row['operador'])[:30]
        lines.append(f"  {op_name:<30} | Jobs(P): {row['jobs']:<5} | PSI(P): {row['avg_psi']:<6} | Tier: {row['risk_tier']}")
        
    lines += ["", "  3. FORMATION RISK", "─" * 72]
    for _, row in form_risk.iterrows():
        lines.append(f"  {str(row['formacion']).title():<20} | Jobs: {row['jobs']:<4} | Offshore: {row['offshore_pct']}% | Hazard: {row['primary_hazard']}")
        
    path = os.path.join(OUTPUT_DIR, "hal_mexico_study.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  Report generated → {path}")


def main():
    print("\n" + "=" * 72)
    print("  HAL Mexico Data Processing Pipeline - V2 (Real Data Integration)")
    print("=" * 72)
    
    if not os.path.exists(PERF_PATH):
        print("  ❌ ERROR: Could not find real data at data/mexico_perforacion.csv")
        return
        
    op_exp = process_operator_exposure()
    if not op_exp.empty:
        op_exp.to_csv(os.path.join(OUTPUT_DIR, "hal_mex_operator_exposure.csv"), index=False)
        
    form_risk = build_formation_risk()
    form_risk.to_csv(os.path.join(OUTPUT_DIR, "hal_mex_formation_risk.csv"), index=False)
    
    trend = build_trend()
    trend.to_csv(os.path.join(OUTPUT_DIR, "hal_mex_trend.csv"), index=False)
    
    write_study_report(op_exp, form_risk, trend)
    
    print("\n" + "=" * 72)
    print("  Done. Real Operator ingestion complete.")
    print("=" * 72 + "\n")

if __name__ == "__main__":
    main()
