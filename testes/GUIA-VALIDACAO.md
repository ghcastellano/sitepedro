# Guia de validação — como saber se a análise está certa

Este pacote existe para **testar se a IA acerta** — no que aparece na tela e na peça (Word).
Você não precisa saber programar; siga os passos.

## O que tem aqui
- `processos/NN-categoria.pdf` — **14 processos de teste fictícios** (8 criminais, 6 cíveis),
  um por área que o Pedro atende. São PDFs de verdade — anexe direto no sistema.
- `processos/NN-categoria.gabarito.md` — o **GABARITO** de cada um: quais nulidades/teses uma
  análise correta DEVE apontar (com artigo de lei e súmula). É o "que era pra dar".
- `processos/README.md` — explica cada caso e as "pegadinhas" plantadas.
- `validar.js` — teste **automático do conteúdo** (o "cérebro").
- `playwright/` — teste **da tela e do Word** (o "visual"), ponta a ponta.

## Como cada teste ajuda

### 1) Teste manual (o mais importante para você) — anexar o PDF no sistema
1. Entre em `https://pedrohenrikadv.com.br/defesaprevia` e faça login.
2. Anexe um PDF de `processos/` (ex.: `01-crim-trafico.pdf`).
3. Espere a análise. Abra o gabarito de mesmo número (`01-crim-trafico.gabarito.md`).
4. Confira, item a item: **a IA apontou as nulidades que o gabarito diz?** As súmulas
   recuperadas fazem sentido? A peça (Word) saiu formatada e coerente?
5. Repita com outras categorias. O caso **14 é uma "isca"**: é um dano moral fraco (mero
   aborrecimento) — a IA está CERTA se **não** inventar nulidade.

### 2) Teste automático de conteúdo — `validar.js`
Roda os PDFs pelo mesmo motor da IA e marca ✅ acerto / 🟡 parcial / ❌ falhou contra o gabarito.
```
node testes/validar.js            # todos os 14 (demora ~9 min, usa a OpenAI)
node testes/validar.js 01 09 14   # só alguns
```
Exemplo real já rodado: `01-tráfico` deu ✅ ACERTO PLENO; `14-danos(isca)` ✅ cauteloso;
`09-consumidor` a IA classificou como "cobrança" (fronteira fuzzy) mas achou a Súmula 385 certa
— esse tipo de sinal é o que você leva para o Pedro revisar.

### 3) Teste de tela + Word — Playwright (`playwright/`)
Abre o site como um usuário, sobe cada PDF, e **salva screenshots da tela, da peça e o Word**
em `playwright/resultados/`, para você comparar sem clicar 14 vezes.
```
cd testes/playwright
npm install && npx playwright install chromium
cp .env.example .env      # edite com e-mail e senha do app
node run.mjs 01 09 14      # ou: node run.mjs (todos) · HEADFUL=1 para ver o navegador
```

## Como ler o resultado (critério simples)
- **Acerto pleno** — apontou a nulidade central do gabarito, com a lei certa, e (quando há)
  a súmula esperada. Peça coerente.
- **Parcial** — pegou parte; anote o que faltou para ajustar o prompt/checklist.
- **Erro** — não achou a nulidade central, ou inventou uma sem base, ou errou a categoria.

> Importante: a ferramenta é **apoio**. A conferência final é sempre do advogado — o Pedro
> valida se cada tese cabe no caso concreto antes de protocolar.
