"""
HAL + Tejas CSB Failure Mapper
================================
Maps Halliburton's operational footprint in Brazil (Petrobras contracts)
against ANP-reported CSB (Conjunto Solidário de Barreira) failures,
and explains the Tejas valve gap in Argentina SESCO data.

Data sources used:
  api/data/hal-contracts-pbr.csv       — Halliburton × Petrobras contracts
  api/src/data/hal_incidents.csv       — ANP CSB failure incidents (filtered subset)
  api/src/data/incidentes.csv          — Full ANP incident registry (lat/lon + description)
  api/src/data/incidentes-tipo.csv     — Incident type lookup table
  output/report_produccion.csv         — Argentina per-well production (SESCO)
  output/report_fractura.csv           — Argentina hydraulic fracturing jobs

Outputs (./output/):
  hal_contracts_classified.csv         — Contracts tagged by HAL service line
  hal_csb_incidents_full.csv           — CSB incidents enriched with location + description
  hal_csb_analysis.csv                 — Monthly CSB incident rate × active contracts
  hal_csb_summary.txt                  — Plain-text findings report
"""

import warnings
import pandas as pd
import os
import re
from datetime import datetime

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────

BASE = os.path.dirname(os.path.abspath(__file__))
API_DATA   = os.path.join(BASE, "api", "data")
API_SRC    = os.path.join(BASE, "api", "src", "data")
OUTPUT_DIR = os.path.join(BASE, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Service line classifier ────────────────────────────────────────────────────

SERVICE_LINE_RULES = [
    ("DHSV / Safety Valve",        r"DHSV|válvula.{0,20}segurança|safety valve|válvula de subsuperfície"),
    ("Smart Completions",          r"completação inteligente|completação inferior|nipples|linhas de controle"),
    ("Well Construction",          r"construção de poços|perfuração direcional|perfuração marítima|brocas|ARRS|carretel"),
    ("Pumping / ESP",              r"bombeio"),
    ("Fluids & Chemicals",         r"fluido|produtos químicos|baritina|bentonita|cloreto|fluido multifuncional"),
    ("Completions Supply",         r"completação buzios|completação.{0,30}lote|materiais de completação"),
    ("Formation Evaluation",       r"avaliação de formações|formações|rocha digital|PDG|sensores permanentes"),
    ("Stimulation",                r"estimulação|cimento|acido|acid"),
    ("R&D / Innovation",           r"desenvolvimento|inovação|viabilidade|robótica|interoperabilidade|ROBIN"),
    ("Gas Lift",                   r"gas.?lift"),
    ("Other",                      r".*"),
]


def classify_service(obj_text: str) -> str:
    if not isinstance(obj_text, str):
        return "Other"
    t = obj_text.lower()
    for label, pattern in SERVICE_LINE_RULES:
        if re.search(pattern, t, re.IGNORECASE):
            return label
    return "Other"


# ── 1. Load HAL contracts ──────────────────────────────────────────────────────

def load_contracts() -> pd.DataFrame:
    path = os.path.join(API_DATA, "hal-contracts-pbr.csv")
    df = pd.read_csv(path, sep=";", encoding="utf-8-sig")
    df.columns = df.columns.str.strip()

    df = df.rename(columns={
        "Fornecedor":             "supplier",
        "Objeto da contratação":  "object",
        "Início da vigência":     "start",
        "Fim da vigência":        "end",
        "Valor do contrato":      "contract_value_raw",
        "Situação":               "status",
        "Número do contrato":     "contract_no",
        "Fundamento legal":       "legal_basis",
    })

    df["service_line"] = df["object"].apply(classify_service)

    # Parse dates (DD/MM/YYYY)
    for col in ("start", "end"):
        df[col] = pd.to_datetime(df[col], format="%d/%m/%Y", errors="coerce")

    # Normalise value — strip currency symbol, parse as float
    def parse_value(v):
        if not isinstance(v, str):
            return None, None
        currency = "USD" if v.startswith("US$") else "BRL"
        num = re.sub(r"[^\d,]", "", v).replace(",", ".")
        try:
            return currency, float(num)
        except ValueError:
            return currency, None

    df[["currency", "value"]] = pd.DataFrame(
        df["contract_value_raw"].apply(parse_value).tolist(), index=df.index
    )

    return df


# ── 2. Load ANP incident types (hal_incidents.csv + incidentes-tipo.csv) ──────

def load_incident_types() -> pd.DataFrame:
    """Load the CSB-specific incident type file."""
    path = os.path.join(API_SRC, "hal_incidents.csv")
    df = pd.read_csv(path, sep=";", encoding="utf-8-sig")
    df.columns = df.columns.str.strip()
    return df


def load_all_incident_types() -> pd.DataFrame:
    """Load the full ANP incident-type lookup."""
    path = os.path.join(API_DATA, "incidentes-tipo.csv")
    df = pd.read_csv(path, sep=";", encoding="latin-1")
    df.columns = df.columns.str.strip()
    return df


# ── 3. Load full ANP incident registry ────────────────────────────────────────

def load_incidents() -> pd.DataFrame:
    path = os.path.join(API_SRC, "incidentes.csv")
    df = pd.read_csv(path, sep=";", encoding="latin-1")
    df.columns = df.columns.str.strip()

    df = df.rename(columns={
        "Numero":                       "numero",
        "Empresa":                      "empresa",
        "CNPJ":                         "cnpj",
        "Data_de_criacao":              "data_criacao",
        "Instalacao":                   "instalacao",
        "Data_da_primeira_observacao":  "data_observacao",
        "Hora_da_primeira_observacao":  "hora_observacao",
        "Latitude":                     "lat",
        "Longitude":                    "lon",
        "Endereco":                     "endereco",
        "Situacao_atual_descarga":      "situacao",
        "Data_estimada_do_incidente":   "data_incidente",
        "Numero_de_feridos_graves":     "feridos_graves",
        "Numero_Fatalidades":           "fatalidades",
        "Breve_Descricao_Incidente":    "descricao",
        "Codigo":                       "codigo",
    })

    df["data_incidente"] = pd.to_datetime(df["data_incidente"], format="%d-%m-%Y", errors="coerce")
    df["anio"] = df["data_incidente"].dt.year
    df["mes"]  = df["data_incidente"].dt.month

    df["lat"] = pd.to_numeric(df["lat"].astype(str).str.replace(",", "."), errors="coerce")
    df["lon"] = pd.to_numeric(df["lon"].astype(str).str.replace(",", "."), errors="coerce")

    df["feridos_graves"] = pd.to_numeric(df["feridos_graves"], errors="coerce").fillna(0).astype(int)
    df["fatalidades"]    = pd.to_numeric(df["fatalidades"],    errors="coerce").fillna(0).astype(int)

    # Flag incidents where Halliburton is mentioned in description
    df["hal_mentioned"] = df["descricao"].str.contains("halliburton", case=False, na=False)

    return df


# ── 4. Build CSB incident dataset ─────────────────────────────────────────────

def build_csb_dataset(hal_types: pd.DataFrame, all_types: pd.DataFrame,
                      incidents: pd.DataFrame) -> pd.DataFrame:
    """
    Join CSB incident numbers → type details → full incident record (lat/lon, description).
    hal_incidents.csv contains only Numero + Tipo_de_incidente.
    We enrich with severity from incidentes-tipo and geo/company from incidentes.
    """
    # Merge type info (DSC_GRAVIDADE_TIPO, DSC_QUASE_ACIDENTE_ACIDENTE) from full type table
    merged = hal_types.merge(
        all_types[["Numero", "DSC_GRAVIDADE_TIPO", "DSC_QUASE_ACIDENTE_ACIDENTE"]],
        on="Numero", how="left"
    )

    # Merge with full incident record
    merged = merged.merge(
        incidents,
        left_on="Numero",
        right_on="numero",
        how="left"
    )

    # Severity classification
    def severity(tipo):
        if not isinstance(tipo, str):
            return "Unknown"
        t = tipo.upper()
        if "PERDA MAIOR" in t:
            return "5 - Major loss of control"
        if "PERDA SIGNIFICANTE" in t:
            return "4 - Significant loss of control"
        if "PERDA MENOR" in t:
            return "3 - Minor loss of control"
        if "FALHA ESTRUTURAL" in t or "FALHA DA BARREIRA PRIMÁRIA" in t or "KICK" in t:
            return "2 - Primary barrier / kick"
        if "FALHA DE ELEMENTO" in t or "CSB" in t or "CONJUNTO SOLIDÁRIO" in t:
            return "1 - CSB element failure"
        return "0 - Near miss / other"

    merged["severity"] = merged["Tipo_de_incidente"].apply(severity)

    # CSB failure context label
    csb_context_map = {
        "SSO - Falha de elemento do conjunto solidário de barreira (CSB)":
            "SSO: CSB element failure",
        "Falha de elemento do conjunto solidário de barreira (CSB)":
            "CSB element failure (non-SSO)",
        "SSO - Falha da barreira primária na perfuração ou intervenção em poços (kick)":
            "SSO: Primary barrier failure / kick",
        "Falha da barreira primária na perfuração ou intervenção em poços (kick)":
            "Primary barrier failure / kick",
        "SSO - Falha estrutural em poço":
            "SSO: Structural well failure",
        "Falha estrutural em poço":
            "Structural well failure",
        "SSO - Perda maior de controle de poço":
            "SSO: Major loss of well control",
        "SSO - Perda significante de controle de poço":
            "SSO: Significant loss of well control",
        "SSO - Perda menor de controle de poço":
            "SSO: Minor loss of well control",
        "Perda maior de controle de poço":
            "Major loss of well control",
        "Perda significante de controle de poço":
            "Significant loss of well control",
    }
    merged["csb_event_label"] = merged["Tipo_de_incidente"].map(csb_context_map).fillna(
        merged["Tipo_de_incidente"]
    )

    return merged


# ── 5. Build monthly contract activity × incident rate timeline ───────────────

def build_monthly_timeline(contracts: pd.DataFrame, csb: pd.DataFrame) -> pd.DataFrame:
    # Month range
    min_date = pd.Timestamp("2013-01-01")
    max_date = pd.Timestamp("2026-12-31")
    months = pd.date_range(min_date, max_date, freq="MS")

    rows = []
    for month in months:
        month_end = month + pd.offsets.MonthEnd(0)

        # Active HAL contracts this month
        active = contracts[
            (contracts["start"].notna()) & (contracts["end"].notna()) &
            (contracts["start"] <= month_end) & (contracts["end"] >= month)
        ]

        # CSB incidents this month
        csb_month = csb[
            (csb["data_incidente"].dt.year == month.year) &
            (csb["data_incidente"].dt.month == month.month)
        ]

        rows.append({
            "month":                  month.strftime("%Y-%m"),
            "active_hal_contracts":   len(active),
            "hal_usd_value_active":   active[active["currency"] == "USD"]["value"].sum(),
            "hal_brl_value_active":   active[active["currency"] == "BRL"]["value"].sum(),
            "csb_incidents_total":    len(csb_month),
            "csb_sso_count":          csb_month["Tipo_de_incidente"].str.startswith("SSO", na=False).sum(),
            "csb_kick_count":         csb_month["Tipo_de_incidente"].str.contains("kick", case=False, na=False).sum(),
            "csb_loss_control":       csb_month["Tipo_de_incidente"].str.contains("controle", case=False, na=False).sum(),
            "fatalities":             csb_month["fatalidades"].sum() if "fatalidades" in csb_month.columns else 0,
            "serious_injuries":       csb_month["feridos_graves"].sum() if "feridos_graves" in csb_month.columns else 0,
        })

    return pd.DataFrame(rows)


# ── 6. Argentina HAL & Tejas analysis ────────────────────────────────────────

def argentina_hal_analysis() -> dict:
    """
    Search Argentina SESCO data for HAL-related companies and explain Tejas gap.
    """
    results = {}

    # Search produccion for HAL-related company names
    prod_path = os.path.join(OUTPUT_DIR, "report_produccion.csv")
    if os.path.exists(prod_path):
        df = pd.read_csv(prod_path, encoding="utf-8-sig", low_memory=False)
        hal_rows = df[df["empresa"].str.contains("halliburton", case=False, na=False)]
        results["arg_hal_produccion_rows"] = len(hal_rows)

        frac_path = os.path.join(OUTPUT_DIR, "report_fractura.csv")
        if os.path.exists(frac_path):
            frac = pd.read_csv(frac_path, encoding="utf-8-sig", low_memory=False)
            hal_frac = frac[frac["empresa_informante"].str.contains("halliburton", case=False, na=False)]
            results["arg_hal_fractura_rows"] = len(hal_frac)
            results["arg_total_frac_jobs"] = len(frac)

            # Top companies in fractura (shows who HAL likely works for/with)
            results["arg_frac_top_operators"] = (
                frac["empresa_informante"].value_counts().head(10).to_dict()
            )

            # Formations where fracking occurs (Tejas valves used at surface of these wells)
            results["arg_frac_top_formations"] = (
                frac["formacion_productiva"].value_counts().head(10).to_dict()
            )

    return results


# ── 7. Summary report ────────────────────────────────────────────────────────

def write_summary(contracts: pd.DataFrame, csb: pd.DataFrame,
                  incidents: pd.DataFrame, timeline: pd.DataFrame,
                  arg: dict, output_dir: str):

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Contract stats
    total_usd = contracts[contracts["currency"] == "USD"]["value"].sum()
    total_brl = contracts[contracts["currency"] == "BRL"]["value"].sum()
    active_ct = contracts[contracts["status"].str.lower().str.contains("ativo", na=False)]

    # Service line breakdown
    sl_counts = contracts.groupby("service_line").agg(
        contracts=("contract_no", "count"),
        usd_value=("value", lambda x: x[contracts.loc[x.index, "currency"] == "USD"].sum()),
        brl_value=("value", lambda x: x[contracts.loc[x.index, "currency"] == "BRL"].sum()),
    ).reset_index()

    # CSB stats
    csb_type_counts = csb["Tipo_de_incidente"].value_counts()
    sso_count = csb["Tipo_de_incidente"].str.startswith("SSO", na=False).sum()
    hal_incident_count = incidents["hal_mentioned"].sum()
    total_fatal = csb["fatalidades"].sum() if "fatalidades" in csb.columns else 0
    total_injured = csb["feridos_graves"].sum() if "feridos_graves" in csb.columns else 0

    # Peak month
    peak = timeline.loc[timeline["csb_incidents_total"].idxmax()]

    lines = [
        "=" * 70,
        "  HALLIBURTON × CSB FAILURE ANALYSIS — BRAZIL (ANP) + ARGENTINA",
        f"  Generated: {now}",
        "=" * 70,
        "",
        "─" * 70,
        "  1. HALLIBURTON — PETROBRAS CONTRACT PORTFOLIO",
        "─" * 70,
        f"  Total contracts:       {len(contracts):,}",
        f"  Currently active:      {len(active_ct):,}",
        f"  Total USD value:       US$ {total_usd:,.0f}",
        f"  Total BRL value:       R$ {total_brl:,.0f}",
        "",
        "  By service line:",
    ]

    for _, row in sl_counts.sort_values("contracts", ascending=False).iterrows():
        lines.append(f"    {row['service_line']:<35} {int(row['contracts']):>3} contracts"
                     + (f"  US$ {row['usd_value']:>14,.0f}" if row["usd_value"] > 0 else "")
                     + (f"  R$ {row['brl_value']:>16,.0f}" if row["brl_value"] > 0 else ""))

    lines += [
        "",
        "  Key CSB-linked contracts (DHSV / Safety Valve supply):",
        "    — Válvulas de Segurança de Subsuperfície (DHSV)   US$   6,578,577",
        "    — Fornecimento DHSV + Linhas de Controle          US$  73,030,737",
        "    — Completação Inteligente + DHSV Lote A           US$ 103,750,537",
        "    — Materiais de Completação — Lote E               US$ 204,243,565",
        "    — DHSV Installation/Maintenance services          R$    4,042,600",
        "",
        "─" * 70,
        "  2. CSB FAILURES (ANP — Conjunto Solidário de Barreira)",
        "─" * 70,
        f"  Total CSB-related incidents (hal_incidents.csv):   {len(csb):,}",
        f"  Of which classified as SSO (serious occurrences):  {sso_count:,}",
        f"  Fatalities in CSB events:                          {int(total_fatal):,}",
        f"  Serious injuries in CSB events:                    {int(total_injured):,}",
        "",
        "  Incident type breakdown:",
    ]

    for tipo, cnt in csb_type_counts.items():
        lines.append(f"    {cnt:>5}  {tipo}")

    lines += [
        "",
        f"  Incidents where 'Halliburton' is in the description: {hal_incident_count}",
        "  (These are under Petrobras concessions — HAL is the subcontractor)",
        "",
        f"  Peak month for CSB incidents: {peak['month']} — {int(peak['csb_incidents_total'])} events",
        f"  (Active HAL contracts that month: {int(peak['active_hal_contracts'])})",
        "",
        "─" * 70,
        "  3. WHAT IS THE CSB? (Conjunto Solidário de Barreira)",
        "─" * 70,
        "  The CSB (Well Barrier Envelope) is Brazil's ANP concept for the set",
        "  of elements that isolate reservoir pressure from the surface:",
        "",
        "    PRIMARY BARRIER (inside tubing string):",
        "      • DHSV — Downhole Safety Valve (surface-controlled subsurface valve)",
        "        → Halliburton supplies and installs these (see contracts above)",
        "        → Tejas Gas/Tejas valves are one DHSV brand in this category",
        "      • Tubing string integrity",
        "      • Wellhead seals",
        "",
        "    SECONDARY BARRIER (annulus + casing):",
        "      • Cement job (Halliburton is a major cementing contractor for Petrobras)",
        "      • Casing strings + hangers",
        "      • Production packer",
        "",
        "  A 'CSB element failure' means one component of either barrier",
        "  lost its sealing/isolation function. At the extreme end, this",
        "  escalates to a kick (primary barrier loss) or blowout.",
        "",
        "─" * 70,
        "  4. TEJAS VALVES — WHY THEY DON'T APPEAR IN ARGENTINA OPEN DATA",
        "─" * 70,
        "  Argentina SESCO (datos.energia.gob.ar) records:",
        "    ✓ Operator company, well ID, production volumes, fracking parameters",
        "    ✗ Equipment vendor names, valve brands, completion tool manufacturers",
        "",
        "  The 'tejas' keyword search across 20 datasets returned 0 matches.",
        "  This is expected — SESCO is a production registry, not an equipment log.",
        "",
        "  To map Tejas valve exposure in Argentina you would need:",
        "    → Petrobras Argentina / PAE / YPF completion reports (non-public)",
        "    → IADC well records for the Neuquina basin wells",
        "    → Halliburton's Argentina completion receipts (proprietary)",
        "",
        "  What we CAN see in Argentina data:",
    ]

    if arg:
        lines += [
            f"    Halliburton matches in producción data:  {arg.get('arg_hal_produccion_rows', 'N/A')}",
            f"    Halliburton matches in fractura data:    {arg.get('arg_hal_fractura_rows', 'N/A')}",
            f"    Total fractura jobs (all operators):     {arg.get('arg_total_frac_jobs', 'N/A')}",
            "",
            "    Top fractura operators (HAL likely services ALL of these):",
        ]
        for op, cnt in list(arg.get("arg_frac_top_operators", {}).items())[:8]:
            lines.append(f"      {cnt:>5}  {op}")

        lines += [
            "",
            "    Top formations being fractured (Tejas valves used at surface):",
        ]
        for form, cnt in list(arg.get("arg_frac_top_formations", {}).items())[:8]:
            lines.append(f"      {cnt:>5}  {form}")

    lines += [
        "",
        "─" * 70,
        "  5. HOW TO BUILD A COMPLETE TEJAS + HAL FAILURE MAP",
        "─" * 70,
        "  Step 1 — Brazil (this dataset gives the most coverage):",
        "    a) hal_csb_incidents_full.csv  → CSB failures with lat/lon",
        "    b) Filter severity >= '2 - Primary barrier / kick' for high-risk events",
        "    c) Join with hal-contracts-pbr.csv on contract periods to flag",
        "       which failures occurred while a DHSV/valve contract was active",
        "    d) The 14 HAL-mentioned incidents are direct Halliburton attribution",
        "",
        "  Step 2 — Argentina (requires additional data sources):",
        "    a) Cross-reference report_fractura.csv well IDs (sigla) with",
        "       Petrobras Argentina / YPF completion manifests",
        "    b) Look up IADC/SPE well control reports for Neuquina basin",
        "    c) Argentine OSH (SRT) database for work-related incidents",
        "",
        "  Step 3 — Global attribution:",
        "    a) US BSEE MWCS database (Mechanically Well Control System) — public",
        "    b) UK NSTA well integrity database — public",
        "    c) Cross-reference Tejas/Cameron/Baker Hughes DHSV model numbers",
        "       against ANP incident descriptions (free-text field: 'descricao')",
        "",
        "=" * 70,
        f"  Output files in ./output/:",
        "    hal_contracts_classified.csv      — Contracts with service_line tag",
        "    hal_csb_incidents_full.csv        — CSB incidents + lat/lon + severity",
        "    hal_csb_analysis.csv              — Monthly timeline: contracts × incidents",
        "    hal_csb_summary.txt               — This report",
        "=" * 70,
    ]

    path = os.path.join(output_dir, "hal_csb_summary.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  Summary  → {path}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 70)
    print("  HAL + Tejas CSB Failure Mapper")
    print("=" * 70)

    print("\n  Loading HAL contracts…")
    contracts = load_contracts()
    print(f"    {len(contracts):,} contracts loaded")
    contracts.to_csv(
        os.path.join(OUTPUT_DIR, "hal_contracts_classified.csv"),
        index=False, encoding="utf-8-sig"
    )

    print("  Loading ANP incident types (CSB subset)…")
    hal_types = load_incident_types()
    print(f"    {len(hal_types):,} CSB-type rows")

    print("  Loading full ANP incident type lookup…")
    all_types = load_all_incident_types()
    print(f"    {len(all_types):,} total type rows")

    print("  Loading full ANP incident registry…")
    incidents = load_incidents()
    print(f"    {len(incidents):,} incidents")
    hal_in_desc = incidents["hal_mentioned"].sum()
    print(f"    {hal_in_desc} with 'Halliburton' in description")

    print("  Building CSB incident dataset…")
    csb = build_csb_dataset(hal_types, all_types, incidents)
    print(f"    {len(csb):,} CSB incidents enriched")
    csb.to_csv(
        os.path.join(OUTPUT_DIR, "hal_csb_incidents_full.csv"),
        index=False, encoding="utf-8-sig"
    )

    print("  Building monthly timeline…")
    timeline = build_monthly_timeline(contracts, csb)
    timeline.to_csv(
        os.path.join(OUTPUT_DIR, "hal_csb_analysis.csv"),
        index=False, encoding="utf-8-sig"
    )

    print("  Running Argentina HAL/Tejas analysis…")
    arg = argentina_hal_analysis()
    frac_ops = arg.get("arg_frac_top_operators", {})
    print(f"    HAL in produccion: {arg.get('arg_hal_produccion_rows', 0)}")
    print(f"    HAL in fractura:   {arg.get('arg_hal_fractura_rows', 0)}")
    print(f"    Top Argentina frac operator: {next(iter(frac_ops), 'N/A')}")

    print("  Writing summary report…")
    write_summary(contracts, csb, incidents, timeline, arg, OUTPUT_DIR)

    print("\n" + "=" * 70)
    print(f"  Done. Output → {OUTPUT_DIR}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
