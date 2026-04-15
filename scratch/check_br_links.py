import requests

urls = [
    "https://atosoficiais.com.br/anp",
    "https://dados.gov.br/dados/conjuntos-dados/dados-de-incidentes-de-e",
    "https://dados.gov.br/dados/conjuntos-dados/incidentes-em-instalacoes-de-e-p",
    "https://petrobras.com.br/",
    "https://www.gov.br/compras/pt-br/acesso-a-informacao/consultas/contratos",
    "https://www.gov.br/trabalho-e-emprego",
    "https://www.marinha.mil.br/dpc/node/6109",
    "https://www.planalto.gov.br/ccivil_03/_ato"
]

results = {}
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}

for url in urls:
    try:
        response = requests.head(url, headers=headers, allow_redirects=True, timeout=10)
        status = response.status_code
        if status >= 400:
            # Try GET if HEAD fails (some servers block HEAD)
            response = requests.get(url, headers=headers, allow_redirects=True, timeout=10)
            status = response.status_code
        results[url] = status
    except Exception as e:
        results[url] = f"Error: {str(e)}"

for url, status in results.items():
    print(f"{url}: {status}")
