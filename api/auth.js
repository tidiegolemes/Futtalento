// api/auth.js

export default function handler(req, res) {
  // Capturando a origem do CMS que iniciou o login (ex: https://futtalento.com.br)
  // O Decap CMS envia um parâmetro 'origin' por padrão quando configurado corretamente.
  const origin = req.query.origin;

  if (!origin) {
    return res.status(400).send('O parâmetro "origin" é obrigatório.');
  }

  const scope = 'repo';
  
  // Usando o parâmetro 'state' para passar a origem de forma segura através do fluxo OAuth
  const state = origin;
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=${scope}&state=${state}`;
  
  res.writeHead(302, { Location: githubAuthUrl });
  res.end();
}
