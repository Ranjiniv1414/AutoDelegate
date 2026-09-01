import os, json, requests, time
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
KEY = os.environ["EMERGENT_LLM_KEY"]
BASE = os.environ.get("INTEGRATION_PROXY_URL", "https://integrations.emergentagent.com").rstrip("/")
CTRL = f"{BASE}/api/v1/fal"
H = {"Authorization": f"Bearer {KEY}", "X-App-ID": os.environ.get("job_id",""), "X-Job-ID": os.environ.get("job_id",""), "X-Environment-ID": os.environ.get("run_id","")}

def query(q, tries=25):
    codes=[]
    for i in range(tries):
        try:
            r = requests.get(f"{CTRL}/catalog/models", headers=H, params={"q":q,"status":"active","limit":25}, timeout=30)
            codes.append(r.status_code)
            if r.status_code==200:
                return r.json().get("models", []), codes
        except Exception as e:
            codes.append("EX")
        time.sleep(1.0)
    return None, codes

for q in ["fal-ai/elevenlabs/speech-to-text","fal-ai/whisper","scribe"]:
    models, codes = query(q)
    print(f"=== q={q} codes={codes}")
    if models is not None:
        for m in models:
            print("   FOUND", m.get("endpoint_id"), "price=",m.get("priceable"),"denied=",m.get("denied"))
