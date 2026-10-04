import urllib.request, json, os

# Load API key from environment variable (never hardcode secrets)
key = os.environ.get("GEMINI_API_KEY", "")
prompt = "What is 2+2? Answer ONLY in JSON: {\"answers\":{\"1\":\"B\"}}"
body = json.dumps({"contents":[{"parts":[{"text":prompt}]}]}).encode("utf-8")

for m in ["gemini-3.8-flash","gemini-3.1-pro-preview","gemini-2.5-flash-preview-04-17"]:
    url = "https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent"
    try:
        req = urllib.request.Request(url, data=body,
              headers={"Content-Type":"application/json","x-goog-api-key":key}, method="POST")
        with urllib.request.urlopen(req, timeout=20) as r:
            d = json.loads(r.read().decode())
            txt = d["candidates"][0]["content"]["parts"][0]["text"]
            print("OK", m, "->", txt[:80])
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, m, "->", e.read().decode("utf-8")[:200])
    except Exception as ex:
        print("ERR", m, "->", str(ex)[:150])
