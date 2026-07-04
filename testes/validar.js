/* Validador de CONTEÚDO da análise — roda os PDFs de teste pelo pipeline REAL de
   api/analisar.js (mockando só a auth) e confere se a IA apontou as nulidades esperadas
   de cada gabarito. Valida o "cérebro" (o que aparece na tela e vira a peça).

   Uso:  node testes/validar.js            (roda todos os 14 — ~9 min, custo OpenAI)
         node testes/validar.js 01 09 14   (roda só esses casos)

   Requer: pdftotext (poppler) e a OPENAI key em dados/.env.production. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');

process.env.OPENAI_API_KEY = fs.readFileSync(path.join(ROOT,'dados','.env.production'),'utf8')
  .split('\n').find(l=>l.startsWith('OPENAI_API_KEY=')).split('=').slice(1).join('=').trim().replace(/^"|"$/g,'');

const realFetch = global.fetch;
global.fetch = async (url, opts) => String(url).includes('/auth/v1/user')
  ? { ok:true, json: async()=>({ email:'pedro.escritorioadv@outlook.com' }) }
  : realFetch(url, opts);

const handler = require(path.join(ROOT,'api','analisar.js'));

/* categoria esperada + tokens que DEVEM aparecer na peça (lei/súmula da nulidade central) */
const ESPERADO = {
  '01-crim-trafico':   { cat:'crim-trafico',    tokens:['244'], obs:'busca pessoal s/ fundada suspeita; laudo definitivo' },
  '02-crim-furto':     { cat:'crim-furto',      tokens:['226','insignific'], obs:'insignificância + reconhecimento' },
  '03-crim-roubo':     { cat:'crim-roubo',      tokens:['226'], obs:'reconhecimento fora do art. 226' },
  '04-crim-homicidio': { cat:'crim-homicidio',  tokens:['155','414'], obs:'pronúncia só com inquérito' },
  '05-crim-estelionato':{cat:'crim-estelionato',tokens:['171'], obs:'falta de representação (§5º)' },
  '06-crim-armas':     { cat:'crim-armas',      tokens:['domic','5º','245'], obs:'busca domiciliar sem mandado' },
  '07-crim-vd':        { cat:'crim-vd',         tokens:['16','11.340','represent'], obs:'ameaça: ação condicionada / art. 16' },
  '08-crim-ctb':       { cat:'crim-ctb',        tokens:['306','nemo','etil'], obs:'recusa etilômetro / prova objetiva' },
  '09-civ-consumidor': { cat:'civ-consumidor',  tokens:['385'], obs:'Súmula 385 (negativação preexistente)' },
  '10-civ-cobranca':   { cat:'civ-cobranca',    tokens:['prescri','206'], obs:'prescrição quinquenal' },
  '11-civ-familia':    { cat:'civ-familia',     tokens:['1.694','1694','1.584','1584'], obs:'binômio alimentos / guarda' },
  '12-civ-locacao':    { cat:'civ-locacao',     tokens:['62','purg'], obs:'purgação da mora' },
  '13-civ-execucao':   { cat:'civ-execucao',    tokens:['bem de família','8.009','833','364'], obs:'impenhorabilidade' },
  '14-civ-danos':      { cat:'civ-danos',       tokens:['aborrecimento'], obs:'ISCA: deve evitar inventar nulidade', isca:true },
};

const KB_ID = { 'crim-trafico':1,'crim-furto':1,'crim-roubo':1,'crim-homicidio':1,'crim-estelionato':1,'crim-armas':1,'crim-vd':1,'crim-ctb':1,'civ-consumidor':1,'civ-cobranca':1,'civ-familia':1,'civ-locacao':1,'civ-execucao':1,'civ-danos':1 };

function analisar(texto, categoriaId){
  return new Promise((resolve)=>{
    const req = { method:'POST', headers:{authorization:'Bearer x'}, body:{ texto, categoriaId, dados:{} } };
    const res = { statusCode:200, status(c){this.statusCode=c;return this;}, json(o){ resolve(o); } };
    handler(req,res).catch(e=>resolve({erro:String(e)}));
  });
}

(async()=>{
  const filtro = process.argv.slice(2);
  const casos = Object.keys(ESPERADO).filter(k => !filtro.length || filtro.some(f=>k.startsWith(f)));
  const linhas = [];
  for(const base of casos){
    const exp = ESPERADO[base];
    const pdf = path.join(__dirname,'processos',base+'.pdf');
    const texto = execFileSync('pdftotext',[pdf,'-'],{encoding:'utf8'});
    process.stdout.write(`\n▶ ${base} … `);
    const r = await analisar(texto, exp.cat);
    if(r.erro || !r.sucesso){ console.log('ERRO:', r.erro||'sem sucesso'); linhas.push([base,'—','ERRO','',r.erro||'']); continue; }
    const catDet = (r.categoriaCorrigida && r.categoriaCorrigida.id) || exp.cat;
    const corpo = JSON.stringify([r.preliminares,r.merito,r.pedidos,r.sumulas_rag,r.sintese]).toLowerCase();
    const hits = exp.tokens.filter(t => corpo.includes(t.toLowerCase()));
    const nPrel = (r.preliminares||[]).length;
    let veredito;
    if(exp.isca){ veredito = nPrel<=1 ? '✅ OK (cauteloso)' : '⚠️ inventou '+nPrel+' nulidade(s)?'; }
    else if(catDet!==exp.cat){ veredito = '⚠️ categoria '+catDet; }
    else if(hits.length===exp.tokens.length){ veredito = '✅ ACERTO PLENO'; }
    else if(hits.length>0){ veredito = '🟡 PARCIAL ('+hits.length+'/'+exp.tokens.length+')'; }
    else { veredito = '❌ NÃO ACHOU'; }
    console.log(veredito, '·', nPrel, 'prelim', '· súmulas:', (r.sumulas_rag||[]).map(s=>s.ref).join(', ')||'—');
    linhas.push([base, catDet, veredito, exp.tokens.filter(t=>!hits.includes(t)).join('|')||'—', exp.obs]);
  }
  console.log('\n\n================ RESUMO ================');
  linhas.forEach(l=> console.log(l[0].padEnd(20), (l[2]||'').padEnd(22), 'faltou:', l[3]));
  const ok = linhas.filter(l=>String(l[2]).startsWith('✅')).length;
  console.log(`\n${ok}/${linhas.length} com acerto pleno. Confira os 🟡/⚠️/❌ contra o gabarito .md correspondente.`);
})();
