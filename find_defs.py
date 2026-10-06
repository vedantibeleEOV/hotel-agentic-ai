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
        data = v.get("data")
        try:
            decoded = gzip.decompress(base64.b64decode(data)).decode("utf-8", errors="ignore")
            for term in ["TaskStatus", "AssignTag", "Prio(", "function SLA", "Pill tone"]:
                if term in decoded:
                    print(f"Found {term} in item {k}")
            with open(f"manifest_{k[:8]}.js", "w", encoding="utf-8") as out:
                out.write(decoded)
        except Exception as e:
            pass
