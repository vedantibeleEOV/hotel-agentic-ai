import json, gzip, re, base64

with open("Voyage_Ops_Prototype.html", "r", encoding="utf-8") as f:
    content = f.read()

start = content.find('<script type="__bundler/manifest">')
if start != -1:
    start += len('<script type="__bundler/manifest">')
    end = content.find("</script>", start)
    manifest_json = content[start:end].strip()
    manifest = json.loads(manifest_json)
    for k, v in manifest.items():
        if v.get("mime") == "text/css":
            data = v.get("data")
            try:
                decoded = gzip.decompress(base64.b64decode(data)).decode("utf-8", errors="ignore")
                with open(f"manifest_{k[:8]}.css", "w", encoding="utf-8") as out:
                    out.write(decoded)
                print(f"Extracted CSS item {k[:8]} ({len(decoded)} chars)")
            except Exception as e:
                print(f"CSS error {k}: {e}")
