# Handoff — /defesaprevia + RAG de súmulas (sessão de 04/07/2026)

> Documento de continuidade. Se este chat sumir, cole este arquivo numa nova sessão do
> Claude Code que ele retoma daqui. O contexto durável também está salvo em
> `~/.claude/projects/-Users-gustavohenriquecastellano-Site-Pedro/memory/` (fora das duas
> pastas — não se perde ao apagar a MVP).

## Decisão central: FONTE ÚNICA = pasta **Site Pedro**
- O app de análise vive em **`Site Pedro/defesaprevia/`** (front) + **`Site Pedro/api/analisar.js`** (backend).
- Está no ar em **https://pedrohenrikadv.com.br/defesaprevia** (projeto Vercel `pedrohenrikadv`).
- A pasta **`MVP Pedro Adv`** era cópia legada (mesmo front, api SEM RAG, ligada a outro
  projeto Vercel `resultadospedro`). **Vai ser deletada.** Tudo que era único dela já foi
  copiado para cá (ver abaixo). **Não edite/deploye a partir da MVP.**

## O que foi feito nesta sessão (RAG de súmulas — no ar)
1. **Corpus**: tabela `public.sumulas` no Supabase populada com **1.318 súmulas** (STJ 647 +
   STF 671) e embeddings `text-embedding-3-small` (1536d). Índice **HNSW** (cosine) criado.
   Datasets públicos reaproveitados do GitHub:
   - STJ: `VictorManuelChang/RAG-sumulas-STJ` → `sumulas.json`
   - STF: `0rakul0/sumulas` → `data/sumulas.csv`
2. **Integração** em `api/analisar.js` (commit `73b6b00`, deployado):
   - `gerarEmbedding()` + `buscarSumulas()` (RPC `match_sumulas`, piso de similaridade 0.38, top 6);
   - no passe B (gpt-4o) as súmulas recuperadas entram na base de jurisprudência permitida
     JUNTO com o KB curado (guardrail agora valida por `Set`); resposta traz `sumulas_rag`;
   - tolerante a falha (erro → segue só com o KB curado); **sem variável de ambiente nova**.
3. **Testado** end-to-end no processo real de tráfico (90k chars): 6 súmulas on-topic
   recuperadas, guardrail passou, zero erros.

### Aprendizado de produto
Súmulas cobrem bem **cível/consumidor** (ex.: Súmula 385 STJ ~0.70). As teses **criminais**
mais fortes (busca pessoal, reconhecimento art. 226, cadeia de custódia) são **precedentes
(HCs), não súmulas** — já estão no KB curado. Por isso o RAG é **complementar**, não substituto.

## Infra Supabase (projeto `Pedro`, ref `kxiwvwbqnmqlaldqsaod`)
- Extensão `vector` on. Tabela `sumulas(id,tribunal,tipo,numero,texto,area,vigente,fonte,
  atualizado_em,embedding vector(1536))`. Índice `sumulas_embedding_hnsw`.
- Função `match_sumulas(query_embedding vector, match_count int=8)` → cosine, filtra
  `vigente=true`, `SECURITY DEFINER`, EXECUTE para `anon` (o front/api chama com a publishable key).
- Tabela `processos` guarda as análises salvas (reabrir sem reprocessar).
- **Chaves**: o projeto usa o NOVO sistema — a `service_role` JWT legada dá **401**; use a
  `sb_secret_...` (via Management API `?reveal=true`). Token de acesso (`sbp_...`) fica em
  `.mcp.json`. OpenAI key em `dados/.env.production` (e já configurada na Vercel prod).

## Onde ficaram os arquivos preservados da MVP (todos GITIGNORADOS)
- `dados/1509073-23.2026.8.26.0385 (1).pdf` — PDF do processo real (sigiloso).
- `dados/Nova Gravação 6.m4a` + `dados/transcricao_nova_gravacao_6.*` — áudio e transcrições.
- `dados/.env.production` — OPENAI_API_KEY (uso local/testes; prod usa env da Vercel).
- `.mcp.json` (raiz) — habilita o MCP do Supabase e guarda o token de acesso.
> `.gitignore` bloqueia `/dados/` e `.mcp.json` de propósito (repo tem remoto; dados de
> cliente real não podem ser versionados).

## Scripts reutilizáveis (commitados, sem segredos — leem credenciais dos arquivos acima)
- `scripts/seed_sumulas.py` — re-popula/expande o corpus de súmulas (idempotente, upsert por id).
- `scripts/db_query.sh` — roda SQL no Supabase: `echo "select ... ;" | scripts/db_query.sh`.

## Como testar o pipeline localmente (sem deploy)
Havia um harness que carrega o handler real interceptando só a auth. Reconstrução rápida:
`node` requer `api/analisar.js`, mocka `fetch` para `/auth/v1/user`, e passa
`{texto, categoriaId, dados}` de um processo (pegue `texto_extraido` da tabela `processos`).

## Pendências / próximas frentes
- [x] ~~Aposentar o projeto Vercel `resultadospedro`~~ — FEITO pelo Gustavo.
- [ ] Front `/defesaprevia` ainda **não exibe** `sumulas_rag` (mostrar as súmulas recuperadas na UI).
- [ ] **Enriquecer o corpus**: Súmulas Vinculantes do STF + taggear `area` das súmulas.
- [ ] **Redesign visual direção 1a** (editorial escuro) — referência em
      `defesaprevia/design/autos-1a-referencia.html` + `README.md` (Newsreader/Public Sans/IBM Plex Mono).
- [ ] Domínio/DNS e demais itens do site institucional: ver memória `site-pedro-henrik`.
