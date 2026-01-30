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
    
    // Este script devolve o token para a janela do seu Admin
    res.send(`
      <script>
        const content = { token: "${token}", provider: "github" };
        window.opener.postMessage('authorization:github:success:' + JSON.stringify(content), window.location.origin);
      </script>
    `);
  } catch (error) {
    res.status(500).send("Erro na autenticação: " + error.message);
  }
};
