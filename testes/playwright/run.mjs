/* Harness Playwright — valida a TELA e o WORD do /defesaprevia ponta a ponta.
   Loga no app real, sobe cada PDF de teste, espera a IA, e salva por processo:
     - screenshot da tela de resultado (nulidades + súmulas recuperadas)
     - screenshot da peça (documento gerado)
     - o texto da peça (.txt) e o arquivo Word (.doc) baixado
   Assim você confere visualmente se bate com o gabarito.

   COMO USAR (uma vez):
     cd "testes/playwright"
     npm install
     npx playwright install chromium
     cp .env.example .env   &&   edite .env com e-mail e senha do app
   RODAR:
     node run.mjs            (todos os 14 — demora, cada um chama a IA)
     node run.mjs 01 09 14   (só esses)
     HEADFUL=1 node run.mjs 01   (abre o navegador visível para você acompanhar)
*/
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PROCESSOS = path.resolve(DIR, '..', 'processos');
const OUT = path.join(DIR, 'resultados');
const URL = process.env.APP_URL || 'https://pedrohenrikadv.com.br/defesaprevia';

// credenciais do .env
for (const line of fs.existsSync(path.join(DIR,'.env')) ? fs.readFileSync(path.join(DIR,'.env'),'utf8').split('\n') : []) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim();
}
const EMAIL = process.env.APP_EMAIL, SENHA = process.env.APP_SENHA;
if (!EMAIL || !SENHA) { console.error('Defina APP_EMAIL e APP_SENHA em testes/playwright/.env'); process.exit(1); }

const filtro = process.argv.slice(2);
const pdfs = fs.readdirSync(PROCESSOS).filter(f => f.endsWith('.pdf'))
  .filter(f => !filtro.length || filtro.some(x => f.startsWith(x))).sort();
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: !process.env.HEADFUL });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1600 }, acceptDownloads: true });
const page = await ctx.newPage();

console.log('→ login em', URL);
await page.goto(URL, { waitUntil: 'networkidle' });
await page.fill('#loginEmail', EMAIL);
await page.fill('#loginSenha', SENHA);
await page.click('#loginGate button[type=submit]');
await page.waitForSelector('#loginGate', { state: 'hidden', timeout: 20000 });
console.log('✓ logado\n');

for (const pdf of pdfs) {
  const base = pdf.replace('.pdf', '');
  process.stdout.write(`▶ ${base} … subindo PDF`);
  await page.setInputFiles('#pdfProcesso', path.join(PROCESSOS, pdf));
  // espera a IA concluir: o status vira "Análise minuciosa concluída"
  try {
    await page.waitForFunction(() => {
      const s = document.getElementById('statusIA');
      return s && /conclu[ií]da|recuperada/i.test(s.textContent || '');
    }, { timeout: 120000 });
  } catch { process.stdout.write(' (timeout na IA)'); }
  await page.waitForTimeout(1500);

  // screenshots
  const painel = await page.$('#painelIA');
  if (painel) await painel.screenshot({ path: path.join(OUT, base + '-tela.png') });
  const doc = await page.$('#documento-analise');
  if (doc) {
    await doc.screenshot({ path: path.join(OUT, base + '-peca.png') });
    const txt = await doc.innerText();
    fs.writeFileSync(path.join(OUT, base + '-peca.txt'), txt);
  }
  // baixa o Word
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('button:has-text("Baixar .doc")'),
    ]);
    await dl.saveAs(path.join(OUT, base + '.doc'));
    process.stdout.write(' · tela+peça+Word salvos\n');
  } catch { process.stdout.write(' · tela+peça salvos (Word: revise manual)\n'); }
}

await browser.close();
console.log(`\n✓ pronto. Veja os arquivos em testes/playwright/resultados/ e compare com os gabaritos.`);
