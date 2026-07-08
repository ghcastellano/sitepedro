---
name: run-defesaprevia
description: >
  Launch and drive the /defesaprevia app (Site Pedro) locally in a real browser to
  see a change working — renders the result screen (peça, prazo, súmulas, feedback,
  .docx) without needing the Supabase login or the Vercel serverless API. Use whenever
  asked to run, screenshot, or verify a change to defesaprevia/index.html end-to-end.
---

# Rodar e dirigir o /defesaprevia localmente

O app é **HTML/JS vanilla estático** (`defesaprevia/index.html`) + funções serverless na
Vercel (`api/*.js`) + Supabase (auth/RLS/pgvector). O usuário encontra primeiro um
**portão de login** (Supabase Auth), e a análise real depende da `/api/analisar` (só roda
na Vercel) e de credenciais. Para **ver a UI funcionando** sem isso, injeta-se um driver
que bypassa o login e monta uma análise realista chamando o próprio código do app.

## Deploy: sempre pelo git
A Vercel é conectada ao GitHub (`ghcastellano/defesa-previa`) e deploya da `main`. Um
`vercel deploy` via CLI é **sobrescrito pelo próximo push**. Regra: `git commit` + `git push
origin main` em tudo. Confirme no ar com `curl -s https://pedrohenrikadv.com.br/defesaprevia
| grep -c <marcador>`.

## Driver de UI (o jeito que funciona)
Use `driver.js` (nesta pasta) — hide `#loginGate`, mostra `#resultadoAnalise`, seta `AN`
com `cat = KB.find(id==='crim-furto')`, um `AN.analiseIA` realista, e chama
`preencherCatSelect(); renderAnalise(); renderIA(); atualizarPrazo()`.

### ⚠️ Gotcha que custou tempo: injete antes do ÚLTIMO `</body>`
O **primeiro** `</body>` do arquivo está **dentro de uma string JS** do `baixarDoc`
(`'…<body>'+conteudo+'</body></html>'`). Um `str.replace('</body>', …)` ingênuo corrompe o
script → "Uncaught SyntaxError" + a análise não popula (parece bug do app, mas é do harness).
Injete antes do **último** `</body>`:

```bash
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
D=".claude/skills/run-defesaprevia"; SCR="$TMPDIR/dp"; mkdir -p "$SCR"
cp "$D/driver.js" "$SCR/driver.js"
python3 - "$SCR" <<'PY'
import sys
raw=open('defesaprevia/index.html','rb').read()
i=raw.rfind(b'</body>')                       # ÚLTIMO </body> = o real da página
out=raw[:i]+b'<script src="driver.js"></script>'+raw[i:]
open(sys.argv[1]+'/drive.html','wb').write(out)
PY
"$CH" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --window-size=1280,5200 --virtual-time-budget=5000 \
  --enable-logging=stderr --v=0 \
  --screenshot="$SCR/drive.png" "file://$SCR/drive.html" 2>"$SCR/log.txt"
grep -c "SyntaxError" "$SCR/log.txt"     # DEVE ser 0
```

Então **OLHE** `$SCR/drive.png` (frame em branco = falha). Confirme: categoria+confiança,
cards, nulidades com 👍/👎 e "corrigir/ensinar", súmulas recuperadas (incl. Vinculantes),
box de aprendizado, **prazo** ("Vence em …"), e a peça na folha branca. A imagem é longa —
recorte faixas com PIL (`Image.crop`) para ler de perto.

## Validar o .docx real (baixarDocx)
`baixarDocx` gera OOXML vanilla. Para validar sem baixar pelo browser: neutralize o clique
(`HTMLAnchorElement.prototype.click=function(){}`), capture os bytes (`window.Blob` wrapper),
e imprima a base64 **em pedaços de ~300 chars** (o console do headless trunca linhas longas).
Remonte e `unzip -t` + `xmllint --noout word/document.xml`. Um docx válido dá ~5 KB, 4 partes OK.

## Testar a CSP localmente (antes de mexer no vercel.json)
Injete a policy como `<meta http-equiv="Content-Security-Policy" content="…">` numa cópia e
carregue no headless com `--enable-logging=stderr`; procure `Refused to (load|frame|connect)`.
`frame-ancestors` via meta é ignorado (só vale via header) — normal. Teste tanto o
`defesaprevia` quanto a landing `index.html` (esta embute um iframe do Google Maps →
precisa `frame-src https://www.google.com`).

## Checar sintaxe do JS sem browser
```bash
sed -n '413,656p' defesaprevia/index.html > /tmp/blk1.js && node --check /tmp/blk1.js
sed -n '662,2242p' defesaprevia/index.html > /tmp/blk2.js && node --check /tmp/blk2.js
```
(Ajuste os ranges aos `<script>`/`</script>` atuais.) `node --check` e o Chrome usam V8 — se
o node passa e o Chrome acusa erro, desconfie do **harness** (ver o gotcha do `</body>`).

## Banco / SQL
`scripts/db_query.sh` roda SQL via Management API (lê o token de `.mcp.json`, gitignored).
Ex.: `echo "select tipo,count(*) from public.sumulas group by 1;" | scripts/db_query.sh`.
