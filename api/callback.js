// api/callback.js

import axios from 'axios';

export default async function handler(req, res) {
  const code = req.query.code;
  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  try {
    // 1. Trocar o código pelo token de acesso
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

    // 2. Criar a resposta HTML com o script postMessage
    // Esta é a parte mais importante para o Decap CMS
    const script = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Autenticando...</title>
      </head>
      <body>
        <script>
          // O "opener" é a janela principal do painel do CMS que abriu este pop-up.
          // Verificamos se ele existe para evitar erros.
          if (window.opener) {
            // Este é o formato de mensagem que o Decap CMS espera.
            // Formato: "authorization:<provider>:<status>:<data>"
            const message = "authorization:github:success:${JSON.stringify({
              token: "${accessToken}",
              provider: "github"
            })}";
            
            // ATENÇÃO: A ORIGEM DE DESTINO DEVE SER SEU DOMÍNIO PRINCIPAL!
            // Isso garante que a mensagem só possa ser enviada para o seu site,
            // o que é uma medida de segurança crucial (CORS).
            const targetOrigin = "https://futtalento.com.br";

            window.opener.postMessage(message, targetOrigin);
          } else {
            console.error("A janela 'opener' não foi encontrada. O pop-up não foi aberto corretamente.");
          }
        </script>
        <p>Autenticação concluída. Esta janela deve fechar em breve.</p>
      </body>
      </html>
    `;

    // 3. Enviar a página HTML como resposta
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(script);

  } catch (error) {
    console.error('Erro no fluxo de callback do OAuth:', error.message);
    res.status(500).send(`<html><body>Erro durante a autenticação: ${error.message}</body></html>`);
  }
}
