import csv, re

CSB_KEYWORDS = {
    'Cementing':        ['ciment','cementi'],
    'Completion':       ['completaci','completion','dhsv','tuberia de produccion','tubing'],
    'Stimulation':      ['estimulaci','fractur','acidiz','stimul'],
    'Fluids':           ['fluido de perforaci','lodo de perforaci','mud ','barita','inhibidor de corrosi'],
    'MPD':              ['mpd','managed pressure','control de presion managido'],
    'Well Construction':['perforaci','drilling','brocas','sarta de perforaci','casing','revestimiento','columna de perforaci','perforacion'],
    'Workover':         ['workover','reparaci de pozo','intervencion de pozo','reacondicionamiento'],
    'G&G':              ['geologia','sismico','geofisica','geoquimica','estratigrafia','petrofisica'],
}

def classify(title, desc):
    text = (title + ' ' + desc).lower()
    # normalize accented chars for matching
    text = text.replace('\xf3','o').replace('\xe1','a').replace('\xe9','e').replace('\xed','i').replace('\xfa','u').replace('\xf1','n')
    for domain, kws in CSB_KEYWORDS.items():
        if any(k in text for k in kws):
            return domain
    return None

def parse_date(d):
    if not d: return ''
    s = d[:10].strip()
    if '-' in s:
        parts = s.split('-')
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
    return s

def clean(s):
    # Try to fix common mojibake patterns by re-encoding
    try:
        s = s.encode('latin-1').decode('utf-8')
    except Exception:
        pass
    # Strip remaining non-printable ASCII except common punctuation
    s = re.sub(r'[^\x20-\x7e\xc0-\xff]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

rows = []
with open('api/data/og_contracts_summary.csv', encoding='utf-8-sig', errors='replace') as f:
    for r in csv.DictReader(f):
        title = clean(r.get('titulo_contrato', ''))
        desc  = clean(r.get('descripcion_contrato', ''))
        domain = classify(title, desc)
        if not domain:
            continue

        importe = float(r.get('importe', '0') or 0)
        moneda = r.get('moneda', 'MXN').upper()
        usd = importe / 17.5 if moneda == 'MXN' else importe
        value_str = f"US$ {usd:,.0f}" if usd > 0 else "—"

        obj = f"{title} — {domain} Service"
        if len(obj) > 180:
            obj = obj[:177] + '...'

        rows.append({
            'idx': len(rows),
            'ano': r.get('ff_fecha_inicio', '')[:4] or '—',
            'mes': (r.get('ff_fecha_inicio', '')[5:7] or '01'),
            'numero': f"MEX-{r.get('codigo_contrato', '')}",
            'uf': 'MX',
            'modalidade': r.get('tipo_contratacion', 'LIC')[:30],
            'proc': 'PUBLIC',
            'tipo': 'SERVICE',
            'empresa': 'PEMEX / CNH',
            'obj': obj,
            'valor': f"{importe:,.0f} {moneda}",
            'inicio': parse_date(r.get('ff_fecha_inicio', '')),
            'fim': parse_date(r.get('ff_fecha_fin', '')),
            'value': value_str,
        })

print(f"Total CSB-relevant PEMEX contracts: {len(rows)}")
fieldnames = ['idx','ano','mes','numero','uf','modalidade','proc','tipo','empresa','obj','valor','inicio','fim','value']
with open('api/data/mex_contracts.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
    w.writeheader()
    w.writerows(rows)

print("Sample:")
for r in rows[:5]:
    print(f"  {r['numero']} | {r['obj'][:70]}")
