/* POST /api/aprender — a partir da peça ORIGINAL e da VERSÃO EDITADA pelo advogado,
   propõe UMA regra curta e generalizável para a IA aplicar nas próximas peças da categoria.
   Não grava nada; só sugere. O front mostra a sugestão para o advogado revisar e salvar. */

const SUPA_URL = process.env.SUPABASE_URL || 'https://kxiwvwbqnmqlaldqsaod.supabase.co';
const SUPA_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_wEgwVgL23ImxCFoUNUUf8Q_1LQANyMX';

async function usuarioAutorizado(req){
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const r = await fetch(`${SUPA_URL}/auth/v1/user`, {headers: {apikey: SUPA_KEY, Authorization: `Bearer ${token}`}});
  if (!r.ok) return null;
  const user = await r.json();
  if (!user || !user.email) return null;
  const allow = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (allow.length && !allow.includes(user.email.toLowerCase())) return null;
  return user;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({sucesso: false, erro: 'Método não permitido'});
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({sucesso: false, erro: 'Servidor não configurado'});
  const user = await usuarioAutorizado(req).catch(() => null);
  if (!user) return res.status(401).json({sucesso: false, erro: 'Acesso restrito'});

  const {categoriaNome, original, editado} = req.body || {};
  if (!original || !editado) return res.status(400).json({sucesso: false, erro: 'Faltam textos'});
  if (String(original).trim() === String(editado).trim()) return res.status(200).json({sucesso: true, regra: ''});

  const prompt = `Um advogado ${categoriaNome ? `(área: ${categoriaNome}) ` : ''}editou uma peça de defesa gerada por IA. Compare a VERSÃO ORIGINAL (da IA) com a VERSÃO EDITADA (pelo advogado) e identifique o que ele mudou por PREFERÊNCIA ou por CORREÇÃO que se repetiria em outras peças.

Produza UMA regra curta (1-2 frases), imperativa e GENERALIZÁVEL — uma instrução que a IA deva seguir nas PRÓXIMAS peças desta área para já sair como o advogado quer. NÃO descreva o caso concreto; extraia o padrão. Se as mudanças forem apenas cosméticas, específicas deste caso (nomes, datas), ou irrelevantes, devolva regra vazia ("").

VERSÃO ORIGINAL (IA):
${String(original).slice(0, 8000)}

VERSÃO EDITADA (advogado):
${String(editado).slice(0, 8000)}

Responda APENAS em JSON: {"regra": "a regra generalizável, ou string vazia se não houver padrão útil"}`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`},
      body: JSON.stringify({model: 'gpt-4o-mini', messages: [{role: 'user', content: prompt}], temperature: 0.2, max_tokens: 300, response_format: {type: 'json_object'}})
    });
    if (!r.ok) return res.status(200).json({sucesso: true, regra: ''});
    const data = await r.json();
    let regra = '';
    try { regra = (JSON.parse(data.choices?.[0]?.message?.content || '{}').regra || '').trim(); } catch(_){}
    return res.status(200).json({sucesso: true, regra});
  } catch (e) {
    return res.status(200).json({sucesso: true, regra: ''});
  }
};
