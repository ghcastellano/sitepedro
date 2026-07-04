# Propostas de melhoria — /defesaprevia

Priorizado por **impacto × esforço**. Marque o que quer que eu implemente.

## 🥇 Alto impacto, baixo/médio esforço (recomendo começar por aqui)

1. **Streaming da peça (a maior melhoria de experiência).** Hoje o advogado espera ~40s
   olhando um spinner. Com streaming, a peça aparece **sendo escrita em tempo real** — a
   espera percebida cai muito. É a melhor melhoria de "performance sentida". Esforço: médio.

2. **Auto-aprendizado a partir das edições.** Já temos "editar peça" + "ensinar a IA".
   Fechar o ciclo: quando o advogado editar a peça e salvar, a IA compara o antes/depois e
   **oferece transformar a mudança numa regra** ("Você reescreveu o pedido — quer que eu
   sempre faça assim nesta categoria?"). Transforma o trabalho normal dele em aprendizado,
   sem esforço extra. Esforço: médio.

3. **Fixar a categoria quando o detector erra** (resolve o caso consumidor→cobrança). Um
   seletor "categoria correta" que **trava** a área e re-roda só a redação, e opcionalmente
   vira um aprendizado. Esforço: baixo.

4. **Reforço no rito do Júri** (resolve a variação do art. 155). Instruir a IA a SEMPRE citar
   o art. 155 do CPP junto do 414 nesses casos. Esforço: trivial (1 linha no prompt).

## 🥈 Alto impacto, médio esforço

5. **Exportar .docx de verdade** (hoje o "Word" é um .doc em HTML). Um .docx real abre
   perfeito no Word/Google Docs, com formatação de petição. Esforço: médio.

6. **Feedback 👍/👎 por nulidade → métrica de qualidade.** Um clique por item alimenta um
   painel simples ("taxa de aprovação por categoria") — vira dado para melhorar o prompt com
   base no uso real, não em testes. Esforço: médio.

7. **Cálculo de prazos + agenda.** A partir do tipo de peça e da data de intimação, calcular
   o prazo (ex.: resposta à acusação em 10 dias) e destacar/exportar para o calendário.
   Esforço: médio.

## 🚀 Performance

- **Streaming** (item 1) — principal ganho de latência percebida.
- **Carregar o OCR (Tesseract) sob demanda** — só baixar quando o PDF for escaneado (imagem);
  hoje pesa no carregamento mesmo quando o PDF já tem texto. Esforço: baixo.
- **Cache de análise por hash** — já existe (reabre sem reprocessar). Manter.
- Os dois passes da IA são inerentemente sequenciais (a redação depende da triagem), então o
  ganho real de tempo vem do streaming, não de paralelizar.

## 🔐 Segurança/LGPD que ainda faltam (ver SEGURANCA-LGPD.md)

- **DPA + Zero-Data-Retention com a OpenAI** e **DPA com o Supabase** — ação sua/jurídica.
- **Política de retenção** do texto integral dos autos (definir prazo → eu implemento o expurgo).
- **CSP + integridade (SRI)** dos scripts de CDN; **sanitizar a minuta** ao reabrir (DOMPurify).

## 📚 Qualidade do conteúdo (jurídico)

- **Importar as 59 Súmulas Vinculantes** de fonte oficial (hoje há 9 curadas).
- **Taggear a área** das súmulas no banco, para o retrieval poder priorizar por matéria.
- **Ampliar o KB curado** de precedentes por categoria conforme o Pedro for usando.
