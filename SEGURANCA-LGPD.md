# Segurança & LGPD — /defesaprevia

Resumo da auditoria de 04/07/2026 e o que foi feito. O app trata **dados sensíveis** (processos
criminais, com nomes/CPF de clientes e terceiros), então isto importa de verdade.

## ✅ Já corrigido nesta sessão
1. **Vazamento entre contas (CRÍTICO) — FECHADO.** A tabela `processos` tinha proteção "ligada
   mas aberta": qualquer conta logada lia/editava/apagava os processos de TODOS. Foi demonstrado
   com os 2 usuários reais. Corrigido no banco: cada conta agora só acessa os próprios processos
   (`user_id = auth.uid()` em ler/inserir/editar/apagar).
2. **`ALLOWED_EMAILS` — CONFIGURADO** na Vercel (só `ghcastellano@gmail.com` e
   `pedro.escritorioadv@outlook.com` usam a IA). Camada extra além do cadastro já estar desativado.
3. **Nenhuma chave vazada no código.** Verificado: só a chave "publishable" do Supabase aparece no
   front (é pública por design). OpenAI key, secret do Supabase e token de acesso estão **fora do
   git** (`.gitignore` cobre `.env*`, `.mcp.json`, `/dados/`).

## ⚠️ Precisa da sua ação (não é código — é jurídico/operacional)
1. **DPA + "Zero Data Retention" com a OpenAI.** O texto do processo é enviado à OpenAI (EUA).
   Solicite o DPA e o modo *zero retention* (a OpenAI não treina nem guarda) na conta da API.
   Sem isso, a base legal LGPD para dado sensível fica frágil.
2. **DPA com o Supabase** e, se possível, **região no Brasil**. Hoje os dados ficam em us-west-2.
3. **Retenção/minimização.** Hoje guardamos o **texto integral dos autos** (até ~150 mil caracteres)
   indefinidamente. Definir: por quanto tempo guardar, rotina de expurgo, e avaliar guardar só o
   necessário (metadados + minuta) ou cifrar. Posso implementar quando você decidir a política.

## 🔧 Melhorias técnicas recomendadas (posso fazer quando quiser)
- **Limite de uso (rate limit) na API de IA.** Hoje uma conta válida pode disparar chamadas
  ilimitadas ao gpt-4o (custo). Sugiro N análises/hora por usuário. (Precisa de um contador —
  Vercel KV/Upstash.)
- **CSP + integridade dos scripts (SRI).** O app carrega bibliotecas de CDNs externos sem trava.
  Adicionar Content-Security-Policy e `integrity` nos scripts, ou auto-hospedar.
- **Sanitizar a minuta ao reabrir** (DOMPurify) — higiene contra HTML malicioso salvo (o risco
  já caiu bastante com o item 1 corrigido).
- **Escapar campos numéricos** em 2 pontos do front (baixo risco).

## Prioridade
1. (feito) RLS + ALLOWED_EMAILS.
2. DPA/ZDR OpenAI + DPA Supabase + política de retenção. ← **sua ação**
3. Rate limit + CSP/SRI. ← me peça quando quiser que eu implemente.
