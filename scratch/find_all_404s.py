import requests
import re

file_path = 'public/dashboard.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

urls = re.findall(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s"\'<>]*', content)
urls = list(set(urls))

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}

broken_urls = []
for url in urls:
    if 'localhost' in url: continue
    try:
        # Using GET with stream=True and a small timeout to avoid heavy loads
        response = requests.get(url, headers=headers, allow_redirects=True, timeout=5, stream=True)
        if response.status_code == 404:
            broken_urls.append(url)
    except Exception:
        # Errors are not 404 per se, but likely broken for this check
        pass

print("Broken URLs (404):")
for url in broken_urls:
    print(url)
