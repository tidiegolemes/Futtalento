// api/auth.js

export default function handler(req, res) {
  // Escopo de permissões que sua aplicação precisa. 'repo' é comum.
  const scope = 'repo';
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=${scope}`;
  
  // Redireciona o pop-up para a página de autorização do GitHub
  res.writeHead(302, { Location: githubAuthUrl });
  res.end();
}
