// api/callback.js

import axios from 'axios';

export default async function handler(req, res) {
  const code = req.query.code;
  
  // Lendo a origem do parâmetro 'state' que o GitHub nos devolveu.
  const targetOrigin = req.query.state;

  if (!targetOrigin) {
    return res.status(400).send('<html><body>Erro: Parâmetro "state" (origem) não encontrado. O fluxo de autenticação foi interrompido.</body></html>');
  }

  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id,
        client_secret,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const accessToken = response.data.access_token;

    if (!accessToken) {
      throw new Error('Token de acesso não recebido do GitHub.');
    }

    const script = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Autenticando...</title></head>
      <body>
        <script>
          if (window.opener) {
            const message = "authorization:github:success:${JSON.stringify({
              token: "${accessToken}",
              provider: "github"
            })}";
            
            // Usando a origem dinâmica recebida pelo 'state'
            // Agora a mensagem será enviada para o lugar certo, seja .com.br ou .vercel.app
            window.opener.postMessage(message, "${targetOrigin}");
          }
        </script>
        <p>Autenticação concluída. Esta janela deve fechar em breve.</p>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(script);

  } catch (error) {
    console.error('Erro no fluxo de callback do OAuth:', error.response ? error.response.data : error.message);
    res.status(500).send(`<html><body>Erro durante a autenticação: ${error.message}</body></html>`);
  }
}
