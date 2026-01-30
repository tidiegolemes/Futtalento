const axios = require('axios');

module.exports = async (req, res) => {
  const { code } = req.query;

  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' }
    });

    const token = response.data.access_token;
    
    // Script otimizado para fechar a janela e enviar o token
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <body>
          <script>
            (function() {
              const token = "${token}";
              const content = JSON.stringify({ token: token, provider: "github" });
              
              if (window.opener) {
                // Envia o token para a janela principal
                window.opener.postMessage("authorization:github:success:" + content, window.location.origin);
                // Fecha esta janela branca
                window.close();
              } else {
                document.body.innerHTML = "Autenticação concluída! Você já pode fechar esta aba e voltar ao painel.";
              }
            })();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send("Erro na autenticação: " + error.message);
  }
};
