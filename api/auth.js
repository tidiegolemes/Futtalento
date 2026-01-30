module.exports = async (req, res) => {
  const { scope, state } = req.query;
  const client_id = process.env.GITHUB_CLIENT_ID;
  
  // Redireciona para o GitHub para iniciar a autorização
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${client_id}&scope=repo,user&state=${state}`);
};
