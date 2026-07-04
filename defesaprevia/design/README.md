# Handoff: Autos — Análise de processos jurídicos (direção 1a)

## Visão geral
Ferramenta para um advogado (uso individual) **analisar processos** e **gerar defesa
prévia** com apoio de IA. O diferencial de produto: **toda análise é gravada no banco**,
para que o advogado **reabra na hora, sem reprocessar e sem custo**, e possa subir novos
PDFs quando quiser. Esta pasta documenta a direção visual escolhida (**1a — editorial
escuro**) e as 4 telas do fluxo.

## Sobre os arquivos deste pacote
`autos-1a-referencia.html` é uma **referência de design feita em HTML** — um protótipo do
visual e do comportamento pretendidos, **não é código de produção para copiar e colar**.
A tarefa é **recriar essas telas dentro do projeto que já está rodando**, usando o stack e
os padrões que ele já tem (React, Vue, etc.). Abra o arquivo em qualquer navegador para ver
as 4 telas empilhadas; inspecione o HTML para ler medidas e cores exatas.

## Fidelidade
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos e textos são finais. Reproduza
a UI com fidelidade usando as bibliotecas/componentes existentes do projeto.

---

## Design tokens

### Cores
- Fundo da página (canvas de apresentação): `#dcd8d0`
- Superfície principal (frame): `#14120d`
- Superfície secundária / cards: `#1a1712`
- Superfície de item de lista / chip: `#211d16`
- Bordas: `#2b271f` (frame), `#2e2a21` (card), `#322d23` (item), divisórias `#221f18` / `#1d1a14`
- Texto principal: `#ece6d8`
- Texto secundário: `#c3bcac`
- Texto atenuado (muted): `#a49c8c` / `#8f887a`
- Texto sutil / labels: `#6f695c` / `#7a756a`
- **Dourado (acento primário):** `#c9a76a` (variação clara em ícones/valores: `#e0b46a`)
- Verde (status positivo / "sigilo", "defesa pronta"): `#7fae7a`
- Vermelho (nulidade grave / severidade alta): `#d1544b`
- Bordô (badge de identificação de opção): `#7b2d2a`

### Tipografia
- **Newsreader** (serif) — títulos, headings, texto da minuta de defesa. Pesos 400/500/600;
  itálico usado para ênfase (ex.: "retome", "RESPOSTA À ACUSAÇÃO").
- **Public Sans** (sans) — corpo, UI, tabelas. Pesos 400/500/600/700.
- **IBM Plex Mono** (mono) — labels em caixa-alta, números de processo em metadados,
  tags/badges. Usa `letter-spacing` de .10–.22em em labels caixa-alta.

### Raio de borda
- Frames de tela: `18px`
- Cards: `14px`
- Itens de lista / painéis internos: `10px`
- Chips/tags: `6px`; pílulas de status/filtro: `20px`

### Sombra
- Frame: `0 40px 70px -40px rgba(0,0,0,.65)`

---

## Telas

### 1. Tela inicial
- **Propósito:** ponto de partida — reabrir análise salva OU subir novo processo.
- **Layout:** header (marca "Autos" + status de conexão à direita); hero com eyebrow
  "FLUXO DE TRABALHO", título serif grande (52px) e subtítulo; abaixo, grid de 2 colunas.
- **Coluna esquerda — "Reabrir análise salva":** contador ("14 salvos"), lista de
  processos recentes; cada item mostra nº do processo, réu/posição + área, e um badge de
  status (ex.: "3 nulidades" em dourado, "defesa pronta" em verde) com seta. Link "Ver
  todos os N processos".
- **Coluna direita — "Analisar novo processo":** dropzone tracejada com ícone de upload,
  instrução ("Arraste o PDF aqui ou clique para selecionar") e selo "sigilo profissional
  preservado". Extração/OCR rodam no navegador do cliente.

### 2. Histórico de processos
- **Propósito:** encontrar e reabrir qualquer análise salva.
- **Layout:** header (título + resumo "14 processos · 3 aguardando revisão" + campo de
  busca); linha de filtros em pílulas (Todos / Aguardando revisão / Com nulidades / Defesa
  concluída), com o ativo em dourado; tabela de 5 colunas.
- **Colunas:** Número do processo · Cliente/posição · Área · Analisado em · Status.
  Cada linha é clicável e abre o Resultado. Status usa as mesmas cores de badge da home.

### 3. Resultado da análise
- **Propósito:** ler o que a IA extraiu; ponto de partida para gerar a defesa.
- **Layout:** barra superior (voltar ao histórico + nº/cliente + ações "Exportar" e
  **"Gerar defesa prévia"** em dourado); grid de 2 colunas: navegação lateral (230px) +
  conteúdo.
- **Nav lateral:** âncoras (Resumo do caso / Partes e fatos / Nulidades [contador] /
  Jurisprudência [contador]) + card **"Salvo automaticamente"** reforçando que a análise
  fica no banco e reabre sem reprocessar.
- **Conteúdo:** "Resumo do caso" (parágrafo); "Nulidades identificadas" (cards com barra
  lateral colorida por severidade — vermelho=alta, dourado=média — título, badge de
  severidade e descrição com o artigo do CPP); "Jurisprudência prioritária" (cards em
  grid 2-col: tribunal+nº do julgado em mono, % de aderência em verde, ementa curta).

### 4. Defesa prévia gerada
- **Propósito:** minuta editável da defesa, rastreável às fontes.
- **Layout:** barra superior (título + "Gerada com base em N nulidades e N julgados" +
  ações Copiar / Editar / **Exportar PDF**); grid 2-col: documento + rail direito.
- **Documento (Newsreader):** endereçamento ao juízo, nº dos autos, preâmbulo (art. 396-A
  do CPP), seções numeradas em dourado (I — DAS PRELIMINARES, II — DA CADEIA DE CUSTÓDIA…).
- **Rail direito "Fundamentada em":** chips ligando a minuta às nulidades e à
  jurisprudência usadas; aviso de que a minuta e as edições ficam salvas no processo.

---

## Interações e comportamento
- **Reabrir (item da lista / linha da tabela):** carrega a análise gravada, sem reprocessar
  o PDF. Deve ser instantâneo — os resultados vêm do banco.
- **Upload:** aceita PDF; extração/OCR no cliente; texto segue para a análise por IA.
  Estados a prever: arrastando-sobre, enviando, extraindo/OCR, analisando, concluído, erro.
- **Gerar defesa prévia:** a partir do resultado, produz a minuta e leva à tela 4.
- **Editar minuta:** edições do advogado são salvas e registradas para a revisão.
- **Exportar:** Resultado e Defesa exportáveis (PDF).
- **Busca/filtros no histórico:** filtram a tabela por nº, cliente, área e status.
- Estados de hover em itens de lista, linhas da tabela e botões (sutil clareamento de fundo).

## Persistência / banco de dados (essência do produto)
Modelar de forma que reabrir nunca exija reprocessamento. Sugestão de entidades:
- **Processo:** id, número CNJ, cliente, posição (réu/autor/executado…), área, datas,
  status, referência ao PDF/hash.
- **Análise:** processo_id, resumo, partes/fatos, criada_em, versão.
- **Nulidade:** análise_id, título, severidade (alta/média/baixa), fundamento (artigo),
  descrição.
- **Jurisprudência:** análise_id, tribunal, identificador do julgado, aderência (%), ementa.
- **DefesaPrevia:** análise_id, corpo (minuta), fontes vinculadas (nulidades + julgados),
  editada_em, editada_por.
Guardar o **resultado processado**, não só o PDF — é o que permite reabrir sem custo.

## Assets
- Fontes: Google Fonts (Newsreader, Public Sans, IBM Plex Mono).
- Ícones: SVG inline simples (upload, busca). Substituir pela biblioteca de ícones do projeto.
- Sem imagens/logos proprietários. "Autos" é apenas uma sugestão de nome — troque à vontade.

## Arquivos
- `autos-1a-referencia.html` — as 4 telas da direção 1a (referência visual).
