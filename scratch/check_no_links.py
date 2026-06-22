import requests

urls = [
    "https://factpages.sodir.no",
    "https://lovdata.no",
    "https://lovdata.no/dokument/NL/lov/1996-11-29-72",
    "https://lovdata.no/dokument/SF/forskrift/2010-04-29-611",
    "https://lovdata.no/dokument/SF/forskrift/2010-04-29-613",
    "https://www.havtil.no/contentassets/91a4472cef014b2c92bbfbbd54d90b40/rnnp-2024-summary-report.pdf",
    "https://www.havtil.no/en/rnnp/",
    "https://www.havtil.no/globalassets/rnnp/2025/rnnp-sammendragsrapport-2025-rev.1.pdf",
    "https://www.norskpetroleum.no",
    "https://www.sodir.no"
]

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}

for url in urls:
    try:
        response = requests.head(url, headers=headers, allow_redirects=True, timeout=10)
        status = response.status_code
        if status >= 400:
            response = requests.get(url, headers=headers, allow_redirects=True, timeout=10)
            status = response.status_code
        print(f"{url}: {status}")
    except Exception as e:
        print(f"{url}: Error: {str(e)}")
