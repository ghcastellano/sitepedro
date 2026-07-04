#!/usr/bin/env python3
"""Popula/atualiza public.sumulas no Supabase (pgvector) com súmulas STF/STJ + embeddings.

Reutilizável para expandir o corpus RAG do /defesaprevia. Sem segredos hardcoded:
  - token de acesso Supabase (sbp_...) vem de ../.mcp.json  (env SUPABASE_ACCESS_TOKEN)
  - OPENAI_API_KEY vem de ../dados/.env.production
Datasets públicos do GitHub (reaproveitados):
  STJ: VictorManuelChang/RAG-sumulas-STJ/sumulas.json  (647)
  STF: 0rakul0/sumulas/data/sumulas.csv                (671)
Uso:  python3 scripts/seed_sumulas.py
Requer: gh CLI autenticado (para baixar os datasets). Idempotente (upsert por id).
"""
import json, os, re, sys, time, urllib.request, urllib.error, csv, io, base64, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REF = "kxiwvwbqnmqlaldqsaod"
SUPA_URL = f"https://{REF}.supabase.co"
MGMT = "https://api.supabase.com"

def access_token():
    mcp = json.load(open(os.path.join(ROOT, ".mcp.json")))
    return mcp["mcpServers"]["supabase"]["env"]["SUPABASE_ACCESS_TOKEN"]

def openai_key():
    for line in open(os.path.join(ROOT, "dados", ".env.production")):
        if line.startswith("OPENAI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("OPENAI_API_KEY não encontrada em dados/.env.production")

def secret_key(token):
    # busca a sb_secret_ (o service_role JWT legado dá 401 no novo sistema de chaves)
    out = subprocess.check_output(["curl", "-s", f"{MGMT}/v1/projects/{REF}/api-keys?reveal=true",
        "-H", f"Authorization: Bearer {token}"])
    for k in json.loads(out):
        if str(k.get("api_key", "")).startswith("sb_secret"):
            return k["api_key"]
    raise SystemExit("sb_secret não encontrada")

def gh_raw(repo, path):
    out = subprocess.check_output(["gh", "api", f"repos/{repo}/contents/{path}", "--jq", ".content"])
    return base64.b64decode(out).decode("utf-8", "replace")

TOKEN = access_token()
OPENAI_KEY = openai_key()
SECRET_KEY = secret_key(TOKEN)

# ---------- coleta ----------
rows = []
for it in json.loads(gh_raw("VictorManuelChang/RAG-sumulas-STJ", "sumulas.json")):
    m = re.search(r"(\d+)", it["id"])
    if not m: continue
    num = int(m.group(1))
    txt = re.sub(r"\s+", " ", it["texto"].replace("\n", " ")).strip()
    rows.append({"id": f"stj-{num}", "tribunal": "STJ", "tipo": "súmula", "numero": num,
                 "texto": txt, "area": None, "vigente": True,
                 "fonte": "STJ — RAG-sumulas-STJ (GitHub)", "atualizado_em": None})

reader = csv.reader(io.StringIO(gh_raw("0rakul0/sumulas", "data/sumulas.csv")))
next(reader, None)
for r in reader:
    if len(r) < 2: continue
    m = re.search(r"(\d+)", r[0])
    if not m: continue
    num = int(m.group(1))
    txt = re.sub(r"\s+", " ", r[1]).strip()
    data = r[2].strip() if len(r) > 2 and r[2].strip() else None
    vig = not re.search(r"\((cancelada|superada|prejudicada)\)", txt, re.I)
    rows.append({"id": f"stf-{num}", "tribunal": "STF", "tipo": "súmula", "numero": num,
                 "texto": txt, "area": None, "vigente": vig,
                 "fonte": "STF — 0rakul0/sumulas (GitHub)", "atualizado_em": data})

print(f"coletadas: {len(rows)} (STJ {sum(1 for x in rows if x['tribunal']=='STJ')}, "
      f"STF {sum(1 for x in rows if x['tribunal']=='STF')})")

# ---------- embeddings ----------
def embed_batch(texts):
    body = json.dumps({"model": "text-embedding-3-small", "input": texts}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/embeddings", data=body,
        headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"})
    for attempt in range(5):
        try:
            return [e["embedding"] for e in json.load(urllib.request.urlopen(req, timeout=120))["data"]]
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503): time.sleep(2 * (attempt + 1)); continue
            raise
    raise SystemExit("embeddings falharam")

for i in range(0, len(rows), 128):
    chunk = rows[i:i+128]
    embs = embed_batch([f"{r['tribunal']} Súmula {r['numero']}: {r['texto']}" for r in chunk])
    for r, e in zip(chunk, embs):
        r["embedding"] = "[" + ",".join(f"{x:.7f}" for x in e) + "]"
    print(f"  embeddings {i+len(chunk)}/{len(rows)}")

# ---------- upsert ----------
def upsert(batch):
    req = urllib.request.Request(f"{SUPA_URL}/rest/v1/sumulas", data=json.dumps(batch).encode(),
        method="POST", headers={"apikey": SECRET_KEY, "Authorization": f"Bearer {SECRET_KEY}",
        "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"})
    urllib.request.urlopen(req, timeout=120).read()

for i in range(0, len(rows), 100):
    upsert(rows[i:i+100])
    print(f"  upsert {min(i+100, len(rows))}/{len(rows)}")

print("OK — corpus de súmulas populado/atualizado.")
