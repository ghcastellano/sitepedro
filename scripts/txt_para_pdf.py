#!/usr/bin/env python3
"""Converte os processos de teste .txt em PDFs realistas (formato petição, texto selecionável)
via Chrome headless --print-to-pdf. Uso: python3 scripts/txt_para_pdf.py"""
import os, re, glob, subprocess, html

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
PASTA = os.path.join(ROOT, "testes", "processos")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS = """
@page { size: A4; margin: 2.5cm 2cm 2.5cm 3cm; }
* { box-sizing: border-box; }
body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.5;
       text-align: justify; color: #111; }
p { margin: 0 0 11pt; text-indent: 2.5em; }
p.ender { text-indent: 0; font-weight: bold; margin-bottom: 22pt; }
p.head { text-indent: 0; text-align: center; font-weight: bold; text-transform: uppercase; margin: 16pt 0 12pt; }
p.autos { text-indent: 0; text-align: right; margin-bottom: 18pt; }
p.flush { text-indent: 0; }
p.sign { text-indent: 0; text-align: center; margin-top: 8pt; }
"""

def classifica(bloco, idx):
    linhas = [l for l in bloco.split("\n") if l.strip()]
    txt = " ".join(l.strip() for l in linhas)
    if idx == 0:
        return "ender", txt
    if re.match(r"^Autos?\s+n[ºo]", txt, re.I):
        return "autos", txt
    # heading: bloco de 1 linha curta, toda em caixa alta
    letras = re.sub(r"[^A-Za-zÀ-ÿ]", "", txt)
    if len(linhas) == 1 and len(txt) < 55 and letras and letras.upper() == letras:
        return "head", txt
    if re.match(r"^(PROMOTOR|ADVOGAD|Ministério Público|OAB)", txt) or re.match(r"^[A-Za-zÀ-ÿ .]+/[A-Z]{2}$", txt):
        return "sign", txt
    # rol/pedido com alíneas ou lista → sem recuo
    if re.match(r"^([a-z]\)|\d+\.)\s", linhas[0].strip()):
        return "flush", "<br>".join(html.escape(l.strip()) for l in linhas)
    return "p", txt

def to_html(texto):
    blocos = re.split(r"\n\s*\n", texto.strip())
    out = []
    for i, b in enumerate(blocos):
        cls, txt = classifica(b, i)
        if cls == "flush":
            out.append(f'<p class="flush">{txt}</p>')  # já escapado
        else:
            out.append(f'<p class="{cls}">{html.escape(txt)}</p>')
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{''.join(out)}</body></html>"

feitos = []
for txtpath in sorted(glob.glob(os.path.join(PASTA, "*.txt"))):
    base = os.path.splitext(os.path.basename(txtpath))[0]
    htmlpath = os.path.join(PASTA, base + ".tmp.html")
    pdfpath = os.path.join(PASTA, base + ".pdf")
    open(htmlpath, "w", encoding="utf-8").write(to_html(open(txtpath, encoding="utf-8").read()))
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={pdfpath}", "file://" + htmlpath],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    os.remove(htmlpath)
    feitos.append(os.path.basename(pdfpath))
    print("PDF:", os.path.basename(pdfpath), f"({os.path.getsize(pdfpath)//1024} KB)")

print(f"\nOK — {len(feitos)} PDFs gerados em testes/processos/")
