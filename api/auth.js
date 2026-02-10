// Futtalento-main/api/auth.js

export default function handler(req, res) {
  // Lógica inteligente para aceitar 'origin' ou 'site_id'
  let originUrl = req.query.origin;
  
  // Se 'origin' não veio, mas 'site_id' sim...
  if (!originUrl && req.query.site_id) {
    // ...nós o usamos para construir a URL de origem.
    originUrl = `https://${req.query.site_id}`;
  }

  // Agora validamos se temos a URL de origem.
  if (!originUrl) {
    const receivedParams = JSON.stringify(req.query);
    // Este é o erro que DEVERÍAMOS ver se algo desse errado agora.
    return res.status(400).send(`Erro: Parâmetro 'origin' ou 'site_id' é obrigatório. Parâmetros recebidos: ${receivedParams}`);
  }

  // O resto do código continua o mesmo.
  const scope = 'repo';
  const state = originUrl; 
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=${scope}&state=${state}`;
  
  res.writeHead(302, { Location: githubAuthUrl });
  res.end();
}
