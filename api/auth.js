module.exports = async (req, res) => {
  const { state } = req.query;
  // O nome aqui deve ser IGUAL ao da Vercel (Maiúsculas)
  const client_id = process.env.GITHUB_CLIENT_ID;

  if (!client_id) {
    return res.status(500).send("Erro: GITHUB_CLIENT_ID não encontrado.");
  }

  res.redirect(`https://github.com/login/oauth/authorize?client_id=${client_id}&scope=repo,user&state=${state}`);
};
