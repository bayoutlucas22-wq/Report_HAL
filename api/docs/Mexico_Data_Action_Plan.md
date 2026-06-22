# Operation: "Harden HAL Mexico"
Here is exactly what I need you to do to transition the remaining "mocked" data into **100% empirical truth**:

### Target 1: The Drilling Data (To fix the Dashboard Mechanics)
Right now, the dashboard's PSI, Equipment HP, Lateral Lengths, and Stages are mocked because we only ingested *Production* data. We need the physical drilling metrics.

**Your Execution Steps:**
1. Go to the SIH Portal: [sih.hidrocarburos.gob.mx](https://sih.hidrocarburos.gob.mx)
2. Look for the modules/reports relating to **Perforación y Terminación de Pozos** (Drilling & Completion).
3. Export the bulk historical data as a **CSV** or **ZIP**.
4. Rename that file to `mexico_perforacion.csv` (or `.zip` if it is compressed).
5. Drop it directly into the `data/` folder in your workspace.

### Target 2: The Incident Data (To trace failures like Brazil)
I discovered Mexico's ASEA uses the **SIIA** (Sistema de Información de Incidentes y Accidentes) to track barrier failures, just like Brazil's ANP!

**Your Execution Steps:**
1. Navigate to the **ASEA Open Data** portal: [datos.gob.mx/busca/organization/asea](https://datos.gob.mx/busca/organization/asea) or the main ASEA site.
2. Search for the *"Registro de Incidentes"* or *"SIIA"* dataset.
3. Export it as a **CSV**.
4. Rename it `mexico_asea_incidentes.csv` and drop it into the `data/` folder.

### Target 3: The Procurement Scraper (To link "Tejas" and "HAL")
While you hunt for those two CSVs above, **I will build a crawler script.**
You don't need to fetch the contracts manually. I will write `compranet_scraper.py` which will hook into Mexico's procurement portal (Compras MX), search for "Halliburton" and "Tejas Tubular," and map their specific contracts back to the SIH operators automatically.

### Summary
1. Bring me the **Drilling Data** from SIH.
2. Bring me the **Incident Data** from ASEA.
3. Tell me to *Build the Scraper* while you search!
