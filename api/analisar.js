/* Gerador de Defesa Prévia/Preliminar — POST /api/analisar
   Entrada: {texto, categoriaId, dados}
   Saída:   {sucesso, tipo_peca, sintese, preliminares[], merito[], provas[], pedidos[],
             verificar_nos_autos[], avisos[], estrutura}

   Fluxo em 2 passes:
     A) gpt-4o-mini — extrai a estrutura do processo (partes, fatos, datas, provas, como a
        acusação/inicial descreve a conduta)
     B) gpt-4o — varre o checklist de nulidades da área, redige a peça completa no formato
        exigido pelo advogado (objetiva, lei seca em cada preliminar, no máx. 1 jurisprudência
        por tópico e só nos prioritários)

   Regras de segurança: jurisprudência só pode vir da base auditada abaixo (validação
   server-side); nulidade sem base concreta no texto vai para "verificar_nos_autos". */

const KB = [
  {id:'crim-trafico', area:'Criminal', peca:'DEFESA PRÉVIA (art. 55 da Lei nº 11.343/2006)', juris:[
    {ref:'STJ, RHC 158.580/BA, Rel. Min. Rogerio Schietti Cruz, 6ª Turma, j. 19/04/2022', tese:'Busca pessoal sem mandado exige fundada suspeita objetiva e verificável; nervosismo ou "atitude suspeita" não bastam (art. 244 CPP). Prova de abordagem ilegal é ilícita.'},
    {ref:'STF, HC 118.533/MS, Tribunal Pleno, Rel. Min. Cármen Lúcia, j. 23/06/2016', tese:'Tráfico privilegiado (art. 33, §4º) não é crime equiparado a hediondo.'},
    {ref:'STF, ARE 666.334-RG (Tema 712), Rel. Min. Gilmar Mendes', tese:'Natureza e quantidade da droga só podem ser valoradas em uma única fase da dosimetria — vedação de bis in idem.'},
    {ref:'STF, HC 97.256/RS, Tribunal Pleno, Rel. Min. Ayres Britto, j. 01/09/2010', tese:'Inconstitucional a vedação abstrata à substituição da pena por restritivas de direitos em tráfico.'},
    {ref:'STF, HC 104.339/SP, Tribunal Pleno, Rel. Min. Gilmar Mendes, j. 10/05/2012', tese:'Inconstitucional a vedação apriorística à liberdade provisória (art. 44 da Lei 11.343/06); prisão exige requisitos concretos do art. 312 CPP.'},
    {ref:'STF, RE 635.659 (Tema 506), Rel. Min. Gilmar Mendes, j. 26/06/2024', tese:'Porte de maconha para uso pessoal descriminalizado; presunção relativa de usuário até 40 g ou 6 plantas-fêmea.'}]},
  {id:'crim-furto', area:'Criminal', peca:'RESPOSTA À ACUSAÇÃO (arts. 396 e 396-A do CPP)', juris:[
    {ref:'STF, HC 84.412/SP, Rel. Min. Celso de Mello', tese:'Princípio da insignificância — vetores: mínima ofensividade, ausência de periculosidade social, reduzido grau de reprovabilidade e inexpressividade da lesão jurídica.'},
    {ref:'Súmula 511 do STJ', tese:'Cabe furto privilegiado-qualificado: primariedade + pequeno valor da coisa + qualificadora de ordem objetiva.'},
   {ref:'STJ, Súmula 442', tese:'É inadmissível aplicar ao furto qualificado pelo concurso de agentes (art. 155, §4º, IV) a majorante do roubo (art. 157, §2º) por analogia.'},
   {ref:'STJ/STF — insignificância e reincidência (linha reafirmada)', tese:'A reincidência ou a reiteração, por si sós, não afastam automaticamente a insignificância no furto — o afastamento exige análise do caso concreto e fundamentação específica.'},
   {ref:'STJ, Súmula 567', tese:'O sistema de vigilância/monitoramento, por si só, não torna impossível o furto (inidoneidade relativa do meio) — limite a considerar: a tese de crime impossível não prospera só por haver câmeras; buscar tentativa (art. 14, II) ou insignificância.'}]},
  {id:'crim-roubo', area:'Criminal', peca:'RESPOSTA À ACUSAÇÃO (arts. 396 e 396-A do CPP)', juris:[
    {ref:'STJ, HC 598.886/SC, Rel. Min. Rogerio Schietti Cruz, 6ª Turma', tese:'O reconhecimento de pessoas deve observar o art. 226 do CPP; reconhecimento (inclusive fotográfico) em desacordo é inválido e não sustenta condenação.'},
    {ref:'Súmula 443 do STJ', tese:'O aumento acima do mínimo no roubo circunstanciado exige fundamentação concreta — não basta o número de majorantes.'},
   {ref:'STJ, Súmula 582', tese:'O roubo consuma-se com a inversão da posse mediante violência/grave ameaça, ainda que por breve tempo e com recuperação da coisa — limite a considerar: a tese de tentativa por falta de posse tranquila não prospera.'},
   {ref:'STF, Súmula 610', tese:'Há latrocínio consumado quando o homicídio se consuma, ainda que não haja subtração dos bens — limite a considerar: atacar o nexo entre a morte e o intuito patrimonial.'},
   {ref:'STJ, Terceira Seção — majorante do emprego de arma de fogo (Tema afetado no REsp 2.222.524, 2026, pendente)', tese:'A exigência de apreensão e perícia da arma para a majorante do art. 157, §2º-A, I, foi afetada como repetitivo (pendente de tese) — a defesa pode suscitar a necessidade de perícia e questionar a idoneidade da prova enquanto não pacificado.'}]},
  {id:'crim-homicidio', area:'Criminal', peca:'RESPOSTA À ACUSAÇÃO (arts. 406 e 408 do CPP — rito do Júri)', juris:[
    {ref:'STF, ARE 1.067.392/CE, Rel. Min. Gilmar Mendes, 2ª Turma', tese:'A pronúncia não pode se fundamentar exclusivamente em elementos colhidos no inquérito policial.'},
   {ref:'STF, Súmula 156', tese:'É absoluta a nulidade do julgamento pelo Júri por falta de quesito obrigatório (notadamente o quesito genérico de absolvição — art. 483, III, CPP), reconhecível de ofício.'},
   {ref:'STF/STJ — jurisprudência consolidada (excesso de linguagem na pronúncia)', tese:'A pronúncia exige linguagem sóbria; adjetivação e juízo de certeza sobre autoria/prova configuram excesso de linguagem e geram nulidade absoluta, impondo nova decisão.'},
   {ref:'STF, Tema 1.087 (ARE 1.225.185, Rel. Min. Gilmar Mendes, j. 03/10/2024)', tese:'Havendo tese de clemência registrada em ata e acolhida pelos jurados, o tribunal não pode determinar novo júri por decisão contrária à prova — preserva-se a soberania dos veredictos na absolvição.'},
   {ref:'STF, Informativo 214 — homicídio privilegiado-qualificado', tese:'Admite-se o homicídio privilegiado-qualificado quando a qualificadora é objetiva (modo/meio de execução); qualificadoras subjetivas (motivo torpe/fútil) são incompatíveis com o privilégio e devem ser afastadas.'}]},
  {id:'crim-estelionato', area:'Criminal', peca:'RESPOSTA À ACUSAÇÃO (arts. 396 e 396-A do CPP)', juris:[
    {ref:'Art. 171, §5º, do CP (Lei 13.964/2019)', tese:'A ação penal depende de representação da vítima (salvo exceções legais) — condição de procedibilidade.'},
   {ref:'STJ, Súmula 17', tese:'Quando o falso se exaure no estelionato, sem potencialidade lesiva autônoma, é por este absorvido (consunção) — responde-se só pelo art. 171 do CP.'},
   {ref:'STF, Súmula Vinculante 24', tese:'Não se tipifica crime material contra a ordem tributária antes do lançamento definitivo do tributo — sem constituição definitiva do crédito não há justa causa nem prescrição.'},
   {ref:'STJ, Súmula 48', tese:'No estelionato mediante falsificação/cheque, a competência é do juízo do local da obtenção da vantagem ilícita (lugar da consumação) — base para arguir incompetência.'},
   {ref:'STJ, HC 610.201/SP, 3ª Seção, Rel. Min. Ribeiro Dantas (2021)', tese:'A exigência de representação do art. 171, §5º, do CP não retroage para extinguir a punibilidade quando a denúncia já havia sido oferecida antes da Lei 13.964/2019.'}]},
  {id:'crim-armas', area:'Criminal', peca:'RESPOSTA À ACUSAÇÃO (arts. 396 e 396-A do CPP)', juris:[
    {ref:'STJ, RHC 158.580/BA, Rel. Min. Rogerio Schietti Cruz, 6ª Turma', tese:'Busca pessoal exige fundada suspeita objetiva (art. 244 CPP).'},
    {ref:'STJ, HC 598.051/SP, Rel. Min. Rogerio Schietti Cruz, 6ª Turma', tese:'Ingresso em domicílio exige consentimento comprovado pelo Estado ou fundadas razões prévias, sob pena de ilicitude da prova.'}]},
  {id:'crim-vd', area:'Criminal', peca:'RESPOSTA À ACUSAÇÃO (arts. 396 e 396-A do CPP)', juris:[
    {ref:'Súmula 536 do STJ', tese:'Suspensão condicional do processo e transação penal não se aplicam aos crimes da Lei Maria da Penha.'},
    {ref:'Súmula 542 do STJ', tese:'Ação penal por lesão corporal em contexto doméstico é pública incondicionada.'},
    {ref:'Súmula 588 do STJ', tese:'Vedada a substituição por restritivas de direitos em crime com violência/grave ameaça no âmbito doméstico.'}]},
  {id:'crim-ctb', area:'Criminal', peca:'RESPOSTA À ACUSAÇÃO (arts. 396 e 396-A do CPP)', juris:[
    {ref:'Princípio nemo tenetur se detegere (art. 5º, LXIII, CF)', tese:'Ninguém é obrigado a produzir prova contra si — a recusa ao etilômetro não configura crime nem presume a embriaguez penal.'},
    {ref:'Art. 89 da Lei 9.099/95 e art. 28-A do CPP', tese:'Cabimento de suspensão condicional do processo e de ANPP conforme a pena mínima e os requisitos legais.'},
   {ref:'STF, Súmula 720', tese:'O art. 309 do CTB (dirigir sem habilitação) exige perigo concreto de dano; a mera condução sem CNH, sem risco demonstrado, é atípica.'},
   {ref:'STJ — jurisprudência consolidada (dolo eventual no trânsito)', tese:'Embriaguez somada a excesso de velocidade, por si só, não caracteriza dolo eventual; sem circunstâncias concretas adicionais a conduta é culposa — base para desclassificar do homicídio doloso para o art. 302 do CTB.'},
   {ref:'STJ, Súmula 575', tese:'O art. 310 do CTB (permitir/entregar a direção a inabilitado ou embriagado) é crime de perigo abstrato — limite a considerar: a defesa deve atacar a autoria e as condições, não a exigência de dano concreto.'}]},
  {id:'civ-consumidor', area:'Cível', peca:'CONTESTAÇÃO (arts. 335 a 342 do CPC)', juris:[
    {ref:'Súmula 297 do STJ', tese:'O CDC é aplicável às instituições financeiras.'},
    {ref:'Súmula 385 do STJ', tese:'Anotação irregular não gera dano moral quando preexiste inscrição legítima (cabível apenas o cancelamento).'},
    {ref:'Súmula 479 do STJ', tese:'Instituições financeiras respondem objetivamente por fortuito interno (fraudes de terceiros).'},
    {ref:'Súmulas 54 e 362 do STJ', tese:'Juros desde o evento danoso (extracontratual) e correção do dano moral desde o arbitramento.'}]},
  {id:'civ-cobranca', area:'Cível', peca:'CONTESTAÇÃO (arts. 335 a 342 do CPC)', juris:[
    {ref:'Art. 206 do Código Civil', tese:'Prazos prescricionais específicos (3 anos para enriquecimento sem causa e reparação civil; 5 anos para dívidas líquidas de instrumento particular).'},
   {ref:'STJ, Súmula 233', tese:'O contrato de abertura de crédito, mesmo com extrato, não é título executivo (documento unilateral quanto ao saldo) — cabe, no máximo, ação monitória.'},
   {ref:'STJ, Súmula 379', tese:'Nos contratos bancários não regidos por lei específica, os juros moratórios podem ser convencionados até o limite de 1% ao mês.'},
   {ref:'STJ, Súmula 472', tese:'A comissão de permanência não pode ultrapassar a soma dos encargos do contrato e exclui a cobrança de juros remuneratórios, moratórios e multa (vedada a cumulação).'}]},
  {id:'civ-familia', area:'Cível', peca:'CONTESTAÇÃO / DEFESA (conforme o rito)', juris:[
    {ref:'Súmula 309 do STJ', tese:'A prisão civil alcança as 3 prestações anteriores ao ajuizamento e as vincendas no curso do processo.'},
    {ref:'Súmula 596 do STJ', tese:'A obrigação alimentar dos avós é subsidiária e complementar — não substitui a dos pais.'},
   {ref:'STJ, Súmula 358', tese:'O cancelamento de pensão alimentícia ao filho que atingiu a maioridade exige decisão judicial com contraditório — a maioridade encerra o poder familiar, mas não revoga automaticamente o dever alimentar.'},
   {ref:'STJ, Súmula 301', tese:'Em investigação de paternidade, a recusa do suposto pai ao exame de DNA gera presunção relativa (juris tantum) de paternidade, apreciada com o conjunto probatório (reforçada pelo art. 2º-A, p.ú., da Lei 8.560/92).'},
   {ref:'STJ, Súmula 621', tese:'Os efeitos da sentença que reduz, majora ou exonera alimentos retroagem à data da citação, vedadas a compensação e a repetição — o débito até a citação subsiste.'},
   {ref:'Art. 1.584, §2º, do Código Civil (Lei 13.058/2014)', tese:'Sem acordo entre genitores aptos, a guarda compartilhada é a regra, aplicável de ofício e independente de consenso; a unilateral é exceção.'}]},
  {id:'civ-locacao', area:'Cível', peca:'CONTESTAÇÃO (arts. 335 a 342 do CPC)', juris:[
    {ref:'Art. 62, II, da Lei 8.245/91', tese:'Direito de purgar a mora no prazo de 15 dias, pagando o débito atualizado, evitando a rescisão.'},
   {ref:'STJ, Súmula 214', tese:'O fiador na locação não responde por obrigações resultantes de aditamento a que não anuiu — a fiança interpreta-se restritivamente.'},
   {ref:'STJ, Súmula 335', tese:'É válida, na locação, a cláusula de renúncia à indenização das benfeitorias e ao direito de retenção.'},
   {ref:'STJ, Súmula 268', tese:'O fiador que não integrou a ação de despejo (fase de conhecimento) não responde pela execução do julgado.'},
   {ref:'STJ, Súmula 549', tese:'É válida a penhora do bem de família do fiador de locação (art. 3º, VII, da Lei 8.009/90) — limite a considerar na estratégia do fiador.'}]},
  {id:'civ-execucao', area:'Cível', peca:'EMBARGOS À EXECUÇÃO / IMPUGNAÇÃO', juris:[
    {ref:'Súmula 364 do STJ', tese:'A impenhorabilidade do bem de família abrange o imóvel de pessoas solteiras, separadas e viúvas.'},
    {ref:'Art. 833 do CPC e Lei 8.009/90', tese:'Rol de impenhorabilidades: salários, bem de família, instrumentos de trabalho, entre outros.'},
   {ref:'STJ, Súmula 375', tese:'O reconhecimento da fraude à execução exige registro da penhora do bem alienado ou prova de má-fé do terceiro adquirente — sem registro, o ônus da prova é do credor e presume-se a boa-fé.'},
   {ref:'STJ, Súmula 486', tese:'É impenhorável o único imóvel residencial do devedor que esteja locado, se a renda do aluguel se destina à subsistência ou moradia da família (bem de família indireto).'},
   {ref:'STJ, Súmula 319', tese:'O encargo de depositário de bens penhorados pode ser recusado, sem condicionamento — ninguém é obrigado a assumir o múnus.'}]},
  {id:'civ-danos', area:'Cível', peca:'CONTESTAÇÃO (arts. 335 a 342 do CPC)', juris:[
    {ref:'Súmula 385 do STJ', tese:'Inscrição preexistente legítima afasta o dano moral por anotação irregular.'},
    {ref:'Súmula 387 do STJ', tese:'Dano estético é cumulável com dano moral.'},
    {ref:'Súmulas 54 e 362 do STJ', tese:'Juros desde o evento danoso (extracontratual); correção do dano moral desde o arbitramento.'}]}
];

const CHECKLIST_CRIMINAL = `
1. INÉPCIA DA DENÚNCIA (art. 41 c/c art. 395, I, CPP): a denúncia individualiza a conduta do acusado com circunstâncias concretas (dia, local, modo, participação)? Denúncia genérica/vaga é inepta.
2. FALTA DE JUSTA CAUSA (art. 395, III, CPP): há lastro probatório mínimo além da palavra isolada dos policiais? Há corroboração objetiva (câmeras, testemunha civil, perícia)?
3. CONDIÇÃO DE PROCEDIBILIDADE: o crime exige representação da vítima ou outra condição (ex.: art. 171, §5º, CP)? Ela consta dos autos?
4. PRESCRIÇÃO / EXTINÇÃO DA PUNIBILIDADE (arts. 107 e 109 CP): pela pena máxima em abstrato e datas dos fatos, há risco ou ocorrência de prescrição?
5. NULIDADE DA BUSCA PESSOAL (art. 244 CPP): a abordagem descreve fundada suspeita OBJETIVA e verificável, ou apenas "atitude suspeita"/denúncia anônima/nervosismo?
6. NULIDADE DA BUSCA DOMICILIAR (art. 5º, XI, CF; art. 245 CPP): houve ingresso em domicílio? Com mandado, consentimento comprovado ou fundadas razões prévias documentadas?
7. RECONHECIMENTO DE PESSOA (art. 226 CPP): houve reconhecimento pessoal/fotográfico? Seguiu o procedimento legal?
8. CADEIA DE CUSTÓDIA (arts. 158-A a 158-F CPP): a apreensão, acondicionamento e perícia da prova material estão documentados sem lacunas?
9. MATERIALIDADE (laudo): há laudo de constatação/definitivo ou exame de corpo de delito quando a infração deixa vestígios (art. 158 CPP)?
10. LEGALIDADE DA PRISÃO: flagrante regular? Audiência de custódia realizada no prazo? Nota de culpa e comunicações (art. 306 CPP)?
11. FUNDAMENTAÇÃO DA PREVENTIVA (arts. 312 e 315 CPP): a decisão aponta elementos CONCRETOS e contemporâneos ou usa gravidade abstrata/fórmulas genéricas?
12. COMPETÊNCIA DO JUÍZO e citação/intimações válidas.`;

const CHECKLIST_CIVEL = `
1. PRELIMINARES DO ART. 337 DO CPC: incompetência (absoluta/relativa), inépcia da inicial, litispendência, coisa julgada, conexão, incapacidade de parte/defeito de representação, convenção de arbitragem, ilegitimidade ativa/passiva, falta de interesse processual, indevida concessão de justiça gratuita.
2. INÉPCIA DA INICIAL (art. 330, §1º, CPC): falta pedido/causa de pedir, pedido genérico fora das hipóteses legais, narração da qual não decorre logicamente a conclusão, pedidos incompatíveis.
3. PRESCRIÇÃO E DECADÊNCIA (art. 487, II, CPC; arts. 205/206 CC): pelos prazos aplicáveis e datas narradas, a pretensão está prescrita?
4. DOCUMENTOS INDISPENSÁVEIS (arts. 320 e 434 CPC): a inicial veio instruída com os documentos essenciais (contrato, comprovantes)?
5. IMPUGNAÇÃO AO VALOR DA CAUSA (art. 293 CPC) e à justiça gratuita (art. 100 CPC), se houver base.
6. TUTELA PROVISÓRIA: se deferida, os requisitos do art. 300 CPC estão presentes? Cabe impugnação/revogação?
7. ÔNUS DA PROVA e fatos impeditivos, modificativos ou extintivos do direito do autor (art. 373 CPC).`;

/* nomes amigáveis das 14 categorias — para a IA escolher a área correta lendo o documento */
const NOMES = {
  'crim-trafico':'Criminal — Tráfico de drogas (Lei 11.343/06)',
  'crim-furto':'Criminal — Furto / Receptação (arts. 155 e 180 CP)',
  'crim-roubo':'Criminal — Roubo (art. 157 CP)',
  'crim-homicidio':'Criminal — Homicídio / Júri (art. 121 CP)',
  'crim-estelionato':'Criminal — Estelionato / Fraudes (art. 171 CP)',
  'crim-armas':'Criminal — Armas de fogo (Lei 10.826/03)',
  'crim-vd':'Criminal — Violência doméstica (Lei 11.340/06 — Maria da Penha)',
  'crim-ctb':'Criminal — Crimes de trânsito (CTB, Lei 9.503/97)',
  'civ-consumidor':'Cível — Direito do Consumidor (CDC)',
  'civ-cobranca':'Cível — Cobrança / Contratos / Dívidas',
  'civ-familia':'Cível — Família (alimentos, guarda, divórcio, união estável)',
  'civ-locacao':'Cível — Locação (Lei 8.245/91)',
  'civ-execucao':'Cível — Execução / Embargos / Impenhorabilidade',
  'civ-danos':'Cível — Responsabilidade civil / Danos morais e materiais'
};
const CAT_MENU = KB.map(c => `- ${c.id}: ${NOMES[c.id] || c.id}`).join('\n');

function extrairJson(s){
  try { return JSON.parse(s); } catch(e){ return null; }
}

async function chamarOpenAI(apiKey, model, prompt, maxTokens){
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`},
    body: JSON.stringify({
      model,
      messages: [{role: 'user', content: prompt}],
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: {type: 'json_object'}
    })
  });
  if(!r.ok){
    let msg = 'Erro da API OpenAI (' + r.status + ')';
    try { const e = await r.json(); msg = e.error?.message || msg; } catch(_){}
    const err = new Error(msg); err.status = r.status; throw err;
  }
  const data = await r.json();
  const obj = extrairJson(data.choices?.[0]?.message?.content || '');
  if(!obj) throw new Error('Resposta da IA não é JSON válido');
  return obj;
}

const SUPA_URL = process.env.SUPABASE_URL || 'https://kxiwvwbqnmqlaldqsaod.supabase.co';
const SUPA_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_wEgwVgL23ImxCFoUNUUf8Q_1LQANyMX';

async function usuarioAutorizado(req){
  /* exige JWT válido do Supabase Auth; se ALLOWED_EMAILS estiver definido, restringe também por e-mail */
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const r = await fetch(`${SUPA_URL}/auth/v1/user`, {headers: {apikey: SUPA_KEY, Authorization: `Bearer ${token}`}});
  if (!r.ok) return null;
  const user = await r.json();
  if (!user || !user.email) return null;
  const allow = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (allow.length && !allow.includes(user.email.toLowerCase())) return null;
  return user;
}

/* ── RAG: embedding da consulta + busca semântica de súmulas (pgvector/match_sumulas) ──
   Complementa o KB curado com súmulas STF/STJ recuperadas por similaridade para o caso.
   Tolerante a falha: qualquer erro devolve [] e a análise segue só com o KB. */
async function gerarEmbedding(apiKey, texto){
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`},
    body: JSON.stringify({model: 'text-embedding-3-small', input: String(texto || '').slice(0, 8000)})
  });
  if (!r.ok) throw new Error('embedding (' + r.status + ')');
  const d = await r.json();
  return d.data?.[0]?.embedding || null;
}

async function buscarSumulas(apiKey, consulta, opts){
  const {matchCount = 12, minSim = 0.38, limite = 6} = opts || {};
  try {
    const emb = await gerarEmbedding(apiKey, consulta);
    if (!emb) return [];
    const r = await fetch(`${SUPA_URL}/rest/v1/rpc/match_sumulas`, {
      method: 'POST',
      headers: {apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({query_embedding: emb, match_count: matchCount})
    });
    if (!r.ok) return [];
    const linhas = await r.json();
    return (Array.isArray(linhas) ? linhas : [])
      .filter(s => (s.similaridade || 0) >= minSim)
      .slice(0, limite)
      .map(s => ({ref: `${s.tribunal}, Súmula ${s.numero}`, tese: s.texto, sim: Number((s.similaridade || 0).toFixed(3))}));
  } catch (e) { return []; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({sucesso: false, erro: 'Método não permitido'});

  const {texto, categoriaId, dados} = req.body || {};
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return res.status(500).json({sucesso: false, erro: 'Servidor não configurado para análise por IA'});

  const user = await usuarioAutorizado(req).catch(() => null);
  if (!user) return res.status(401).json({sucesso: false, erro: 'Acesso restrito — faça login para usar a análise por IA'});

  if (!texto || !categoriaId) return res.status(400).json({sucesso: false, erro: 'Campos obrigatórios ausentes'});

  const catCliente = KB.find(c => c.id === categoriaId);
  if (!catCliente) return res.status(400).json({sucesso: false, erro: 'Categoria não reconhecida'});

  const textoA = String(texto).slice(0, 24000);
  const textoB = String(texto).slice(0, 60000);

  try {
    /* ── PASSE A: triagem + estrutura do processo (modelo econômico) ────────── */
    const promptA = `Você é assistente de um advogado. Primeiro CLASSIFIQUE o documento; depois, se for peça/processo judicial, extraia a estrutura fática. Devolva APENAS JSON. Se algo não constar do texto, use null ou [] — NUNCA invente.

TRIAGEM (obrigatória): o texto abaixo é uma peça ou documento de um PROCESSO JUDICIAL brasileiro que comporta defesa (ex.: denúncia, queixa-crime, petição inicial, boletim de ocorrência/inquérito, auto de prisão em flagrante, decisão/despacho, contestação, mandado, autos processuais)? Responda "ehProcessoJudicial": true. Se for OUTRA COISA (nota fiscal, recibo, boleto, contrato comum sem litígio, currículo, carta, e-mail, artigo, planilha, comprovante, folheto, documento pessoal, texto aleatório ou ilegível), responda "ehProcessoJudicial": false e descreva em "tipoDocumento" o que o documento realmente é. Na dúvida real entre os dois, considere true apenas se houver indícios processuais concretos (número de processo/CNJ, partes, juízo/vara, tipificação penal ou pedido cível, linguagem forense).

ÁREA/CATEGORIA (obrigatória se for processo): o processo pode ser de QUALQUER âmbito (criminal OU cível: família, consumidor, contratos, locação, execução, danos...). Lendo o documento, escolha em "categoriaSugerida" o id que MELHOR representa a matéria, desta lista fechada:
${CAT_MENU}
Escolha pela matéria real do documento (ex.: ação de alimentos/guarda/divórcio → civ-familia; cobrança/contrato → civ-cobranca). Só use uma categoria criminal se houver imputação penal. Se nenhuma encaixar perfeitamente, escolha a mais próxima da área correta.

TEXTO:
${textoA}

DADOS JÁ EXTRAÍDOS POR OUTRO SISTEMA (podem conter erros — confirme pelo texto):
${JSON.stringify(dados || {}, null, 1).slice(0, 3000)}

Responda neste formato JSON (se ehProcessoJudicial for false, os demais campos podem vir null/[]):
{"ehProcessoJudicial": true/false,
 "tipoDocumento": "o que o documento é (ex.: 'nota fiscal eletrônica', 'denúncia criminal', 'petição inicial de alimentos')",
 "categoriaSugerida": "um id EXATO da lista acima",
 "parte_defendida": "...", "parte_adversa": "...", "num_processo": "...", "juizo": "...",
 "tipificacao_ou_pedido": "como a denúncia/inicial enquadra juridicamente",
 "conduta_narrada": "resumo fiel de COMO a acusação/inicial descreve a conduta/os fatos, com as circunstâncias que ela declina (ou omite)",
 "versao_defesa": "versão da parte defendida, se constar do texto (interrogatório, depoimento), senão null",
 "datas_relevantes": [{"data": "...", "evento": "..."}],
 "provas_mencionadas": ["cada prova/elemento citado nos autos: laudos, apreensões, depoimentos, câmeras..."],
 "prisao": {"situacao": "solto|flagrante|preventiva|null", "fundamentos_da_decisao": "se constar"},
 "observacoes": ["qualquer detalhe processualmente relevante: falta de laudo, palavra só dos policiais, denúncia vaga, datas que sugerem prescrição..."]}`;

    const estrutura = await chamarOpenAI(apiKey, 'gpt-4o-mini', promptA, 1500);

    /* ── GUARDRAIL: só gera defesa para peça/processo judicial ──────────────── */
    if (estrutura && estrutura.ehProcessoJudicial === false) {
      const tipo = estrutura.tipoDocumento || 'documento não jurídico';
      return res.status(200).json({
        sucesso: true,
        naoEhProcesso: true,
        tipoDocumento: tipo,
        aviso: `O arquivo enviado não parece ser um processo judicial — foi identificado como: ${tipo}. Nenhuma defesa foi gerada. Envie a denúncia, a petição inicial, o inquérito ou os autos do processo.`
      });
    }

    /* ── ÁREA: a IA (que leu o documento) manda na categoria; corrige o palpite do classificador local ── */
    const catSugerida = estrutura && KB.find(c => c.id === estrutura.categoriaSugerida);
    const cat = catSugerida || catCliente;
    const criminal = cat.area === 'Criminal';
    const categoriaCorrigida = (cat.id !== categoriaId) ? {id: cat.id, nome: NOMES[cat.id] || cat.id, area: cat.area, peca: cat.peca} : null;

    /* ── RAG: recupera súmulas por similaridade semântica ao caso (complementa o KB curado) ── */
    const consultaRag = `${cat.area}. ${[
      estrutura?.tipificacao_ou_pedido,
      estrutura?.conduta_narrada,
      Array.isArray(estrutura?.observacoes) ? estrutura.observacoes.join('; ') : ''
    ].filter(Boolean).join('. ')}`.slice(0, 3000);
    const sumulasRag = await buscarSumulas(apiKey, consultaRag, {minSim: 0.38, limite: 6});

    /* base de jurisprudência auditada para ESTE pedido = KB curado + súmulas recuperadas */
    const jurisPermitidas = new Set([...cat.juris.map(j => j.ref), ...sumulasRag.map(s => s.ref)]);

    /* ── PASSE B: nulidades + peça completa (modelo forte) ─────────────────── */
    const promptB = `Você é um advogado ${criminal ? 'criminalista' : 'civilista'} experiente redigindo uma ${cat.peca}. Seu cliente é a parte defendida. Trabalhe SOMENTE com o que consta do texto do processo — nada de fatos inventados.

TEXTO DO PROCESSO (fonte da verdade):
${textoB}

ESTRUTURA JÁ LEVANTADA:
${JSON.stringify(estrutura, null, 1).slice(0, 6000)}

CHECKLIST OBRIGATÓRIO DE NULIDADES/IRREGULARIDADES — examine item por item:
${criminal ? CHECKLIST_CRIMINAL : CHECKLIST_CIVEL}

JURISPRUDÊNCIA PERMITIDA (você SÓ pode citar estes precedentes/súmulas, copiando a referência EXATAMENTE como está — qualquer outro será descartado):
${cat.juris.map((j, i) => `${i+1}. ${j.ref} — ${j.tese}`).join('\n')}
${sumulasRag.length ? `\nSÚMULAS RECUPERADAS PARA ESTE CASO (por similaridade semântica — use SOMENTE as que realmente se aplicam ao fato concreto dos autos; copie a referência EXATAMENTE):\n${sumulasRag.map((s, i) => `${cat.juris.length + i + 1}. ${s.ref} — ${s.tese}`).join('\n')}\n` : ''}

${cat.id === 'crim-trafico' ? `ESTRATÉGIA ESPECÍFICA PARA TRÁFICO (obrigatória):
- Pedido principal: rejeição da denúncia/absolvição por falta de provas (conforme as nulidades encontradas).
- Pedido SUBSIDIÁRIO obrigatório quando o acusado for primário/sem antecedentes: reconhecimento do tráfico privilegiado (art. 33, §4º, da Lei 11.343/06) com redutor no grau máximo (2/3), regime aberto e substituição da pena — inclua também um tópico de mérito desenvolvendo esse ponto.
- Se houver prisão preventiva com fundamentação genérica (gravidade abstrata), inclua pedido de revogação/substituição pelas cautelares do art. 319 do CPP.
` : ''}REGRAS DE ESTILO DO ADVOGADO (obrigatórias):
- Peça OBJETIVA: no máximo 10 páginas no total. O juiz quer bater o olho e entender.
- Cada preliminar/nulidade DEVE citar a lei seca (artigo, parágrafo, inciso) e explicar em 1-3 parágrafos POR QUE se aplica a ESTE caso, referindo o fato concreto dos autos que a sustenta.
- Jurisprudência: NO MÁXIMO 1 por tópico, e SOMENTE nos 1-2 tópicos mais importantes (defina "prioritario": true neles). A MAIORIA dos tópicos fica SEM jurisprudência (jurisprudencia: null). O advogado detesta peça com muita jurisprudência.
- NUNCA repita o mesmo precedente em tópicos diferentes: cada referência da lista pode aparecer NO MÁXIMO UMA VEZ em TODA a peça. Coloque-a apenas no ÚNICO tópico onde ela é mais forte (ex.: a busca pessoal do RHC 158.580/BA vai só no tópico da nulidade da busca, não também no da justa causa).
- Nulidade só entra em "preliminares" se houver base CONCRETA no texto (cite o trecho em "trecho_base"). O que não der para verificar pelo documento vai para "verificar_nos_autos" (lista de conferências para o advogado).
- Tudo que for nulidade deve ser alegado AGORA (preclusão) — seja minucioso no checklist, não deixe passar nada que o texto sustente.
- Redija em português forense claro, sem retórica vazia, pronto para protocolar.

Responda APENAS neste formato JSON:
{"tipo_peca": "${cat.peca}",
 "sintese": "síntese dos fatos em 2-4 parágrafos, CONCRETA, com os fatos deste processo (nomes, datas, dinâmica) e já apontando as fragilidades da tese adversa",
 "preliminares": [{"titulo": "ex.: Inépcia da denúncia — ausência de individualização da conduta", "lei_seca": "art. 41 c/c art. 395, I, do CPP", "gravidade": "alta|media|baixa", "trecho_base": "trecho literal ou paráfrase fiel do documento que sustenta a alegação", "desenvolvimento": "1-3 parágrafos aplicando ao caso concreto", "jurisprudencia": "referência EXATA da lista ou null", "prioritario": true}],
 "merito": [{"titulo": "...", "lei_seca": "...", "desenvolvimento": "1-3 parágrafos aplicados ao caso", "jurisprudencia": "referência EXATA da lista ou null", "prioritario": false}],
 "provas": ["cada prova a requerer, específica para ESTE caso"],
 "pedidos": ["pedidos na ordem correta: preliminares primeiro, mérito, subsidiários"],
 "verificar_nos_autos": ["o que o advogado deve conferir no processo físico/eletrônico que o documento enviado não permite verificar"],
 "avisos": ["inconsistências, riscos, prazos, classificação possivelmente errada"]}`;

    const peca = await chamarOpenAI(apiKey, 'gpt-4o', promptB, 4000);

    /* ── Validação server-side: só jurisprudência auditada + SEM repetição ─────── */
    const avisos = Array.isArray(peca.avisos) ? peca.avisos : [];
    const jurisUsadas = new Set();
    ['preliminares', 'merito'].forEach(campo => {
      if (Array.isArray(peca[campo])) peca[campo].forEach(t => {
        if (!t.jurisprudencia) return;
        if (!jurisPermitidas.has(t.jurisprudencia)) {
          avisos.push(`⚠️ Jurisprudência fora da base auditada removida do tópico "${t.titulo}": ${t.jurisprudencia}`);
          t.jurisprudencia = null;
        } else if (jurisUsadas.has(t.jurisprudencia)) {
          t.jurisprudencia = null; /* dedup: o mesmo precedente não se repete em outro tópico */
        } else {
          jurisUsadas.add(t.jurisprudencia);
        }
      });
    });
    peca.avisos = avisos;

    return res.status(200).json({sucesso: true, estrutura, categoriaCorrigida, sumulas_rag: sumulasRag, ...peca});
  } catch (err) {
    console.error('Erro na análise:', err);
    return res.status(err.status === 429 ? 429 : 500).json({sucesso: false, erro: err.message});
  }
};
