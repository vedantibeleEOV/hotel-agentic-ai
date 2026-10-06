import json
import gzip
import re
import base64

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
            if "Tasks" in decoded:
                print(f"Item {k} has Tasks ({len(decoded)} chars)")
                with open(f"scratch_prototype_{k[:8]}.jsx", "w", encoding="utf-8") as out:
                    out.write(decoded)
        except Exception as e:
            print(f"Error {k}: {e}")
