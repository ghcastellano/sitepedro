#!/usr/bin/env python3
"""Insere um conjunto CURADO de Súmulas Vinculantes do STF (as mais relevantes p/ defesa
criminal/cível) na tabela public.sumulas, com embeddings. Texto canônico verificado.
Idempotente (upsert por id sv-N). Fonte oficial completa (59 SVs) pendente — estas são
curadas manualmente e devem ser conferidas pelo advogado."""
import json, os, urllib.request, subprocess

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
REF = "kxiwvwbqnmqlaldqsaod"; SUPA_URL = f"https://{REF}.supabase.co"

def openai_key():
    for l in open(os.path.join(ROOT, "dados", ".env.production")):
        if l.startswith("OPENAI_API_KEY="): return l.split("=",1)[1].strip().strip('"')
    raise SystemExit("sem OPENAI key")

def secret_key():
    tok = json.load(open(os.path.join(ROOT, ".mcp.json")))["mcpServers"]["supabase"]["env"]["SUPABASE_ACCESS_TOKEN"]
    out = subprocess.check_output(["curl","-s",f"https://api.supabase.com/v1/projects/{REF}/api-keys?reveal=true","-H",f"Authorization: Bearer {tok}"])
    return next(k["api_key"] for k in json.loads(out) if str(k.get("api_key","")).startswith("sb_secret"))

OPENAI_KEY = openai_key(); SECRET = secret_key()

SV = {
 5:"A falta de defesa técnica por advogado no processo administrativo disciplinar não ofende a Constituição.",
 8:"São inconstitucionais o parágrafo único do artigo 5º do Decreto-Lei nº 1.569/1977 e os artigos 45 e 46 da Lei nº 8.212/1991, que tratam da prescrição e decadência do crédito tributário.",
 9:"O disposto no artigo 127 da Lei nº 7.210/1984 (Lei de Execução Penal) foi recebido pela ordem constitucional vigente, e não se lhe aplica o limite temporal previsto no caput do artigo 58.",
 11:"Só é lícito o uso de algemas em casos de resistência e de fundado receio de fuga ou de perigo à integridade física própria ou alheia, por parte do preso ou de terceiros, justificada a excepcionalidade por escrito, sob pena de responsabilidade disciplinar, civil e penal do agente ou da autoridade e de nulidade da prisão ou do ato processual a que se refere, sem prejuízo da responsabilidade civil do Estado.",
 14:"É direito do defensor, no interesse do representado, ter acesso amplo aos elementos de prova que, já documentados em procedimento investigatório realizado por órgão com competência de polícia judiciária, digam respeito ao exercício do direito de defesa.",
 24:"Não se tipifica crime material contra a ordem tributária, previsto no art. 1º, incisos I a IV, da Lei nº 8.137/1990, antes do lançamento definitivo do tributo.",
 25:"É ilícita a prisão civil de depositário infiel, qualquer que seja a modalidade do depósito.",
 26:"Para efeito de progressão de regime no cumprimento de pena por crime hediondo ou equiparado, o juízo da execução observará a inconstitucionalidade do art. 2º da Lei nº 8.072, de 25 de julho de 1990, sem prejuízo de avaliar se o condenado preenche, ou não, os requisitos objetivos e subjetivos do benefício, podendo determinar, para tal fim, de modo fundamentado, a realização de exame criminológico.",
 56:"A falta de estabelecimento penal adequado não autoriza a manutenção do condenado em regime prisional mais gravoso, devendo-se observar, nessa hipótese, os parâmetros fixados no RE 641.320/RS.",
}

def embed(texts):
    body = json.dumps({"model":"text-embedding-3-small","input":texts}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/embeddings", data=body,
        headers={"Authorization":f"Bearer {OPENAI_KEY}","Content-Type":"application/json"})
    return [e["embedding"] for e in json.load(urllib.request.urlopen(req))["data"]]

nums = sorted(SV)
embs = embed([f"STF Súmula Vinculante {n}: {SV[n]}" for n in nums])
rows = [{"id":f"sv-{n}","tribunal":"STF","tipo":"súmula vinculante","numero":n,"texto":SV[n],
         "area":None,"vigente":True,"fonte":"STF — Súmula Vinculante (curadoria manual, conferir)",
         "atualizado_em":None,"embedding":"["+",".join(f"{x:.7f}" for x in e)+"]"}
        for n,e in zip(nums,embs)]

req = urllib.request.Request(f"{SUPA_URL}/rest/v1/sumulas", data=json.dumps(rows).encode(), method="POST",
    headers={"apikey":SECRET,"Authorization":f"Bearer {SECRET}","Content-Type":"application/json",
             "Prefer":"resolution=merge-duplicates,return=minimal"})
urllib.request.urlopen(req).read()
print(f"OK — {len(rows)} Súmulas Vinculantes inseridas:", ", ".join(f"SV {n}" for n in nums))
