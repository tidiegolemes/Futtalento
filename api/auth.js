// FutTalento CMS GitHub OAuth — only the verified FutTalento origins.
const ALLOWED = new Set(['https://www.futtalento.com.br','https://futtalento.com.br']);
function normalizeOrigin(input) {
  if (typeof input !== 'string' || input.length > 300) return null;
  try {
    const u = new URL(input.startsWith('https://') ? input : 'https://' + input);
    return u.protocol === 'https:' && ALLOWED.has(u.origin) ? u.origin : null;
  } catch (_) { return null; }
}
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Método não permitido.');
  const raw = req.query.origin || req.query.site_id;
  const origin = normalizeOrigin(raw);
  if (!origin) return res.status(400).send('Origem do painel administrativo inválida.');
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return res.status(503).send('Autenticação indisponível.');
  const params = new URLSearchParams({client_id:clientId,scope:'repo',state:origin});
  res.setHeader('Cache-Control','no-store');
  res.writeHead(302,{Location:'https://github.com/login/oauth/authorize?'+params.toString()});
  res.end();
}
