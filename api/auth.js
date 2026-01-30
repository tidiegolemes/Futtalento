module.exports = async (req, res) => {
  const { scope, state } = req.query;
  
  // GARANTA QUE O NOME ABAIXO SEJA IGUAL AO DA VERCEL (TUDO MAIÚSCULO)
  const client_id = process.env.GITHUB_CLIENT_ID;
  
  if (!client_id) {
    return res.status(500).send("Erro: GITHUB_CLIENT_ID não encontrado nas variáveis da Vercel.");
  }

  res.redirect(`https://github.com/login/oauth/authorize?client_id=${client_id}&scope=repo,user&state=${state}`);
};
