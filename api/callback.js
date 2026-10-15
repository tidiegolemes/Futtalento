// FutTalento CMS OAuth callback: restricted postMessage target and HTML-safe payload.
import axios from 'axios';
import {verify,signed,cookie} from './_sponsor-auth.js';
const ALLOWED = new Set(['https://www.futtalento.com.br','https://futtalento.com.br']);
export default async function handler(req,res) {
 if (req.method !== 'GET') return res.status(405).send('Método não permitido.');
 const code = typeof req.query.code === 'string' ? req.query.code : '';
 const sponsor=verify(req.query.state);
 if(sponsor?.kind==='sponsor-login'){
   const nonce=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ft_oauth_nonce='))?.split('=')[1];
   if(!nonce||nonce!==sponsor.nonce||sponsor.exp<Date.now()||!code)return res.status(403).send('Login inválido ou expirado');
   try {
     const tokenRes=await axios.post('https://github.com/login/oauth/access_token',{client_id:process.env.GITHUB_CLIENT_ID,client_secret:process.env.GITHUB_CLIENT_SECRET,code},{headers:{Accept:'application/json'},timeout:12000});
     if(!tokenRes.data?.access_token)throw new Error('authorization denied');
     const account=await axios.get('https://api.github.com/user',{headers:{Authorization:'Bearer '+tokenRes.data.access_token},timeout:12000});
     const login=String(account.data?.login||'').toLowerCase();
     const allowed=(process.env.SPONSOR_ADMIN_GITHUB_USERS||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
     if(!allowed.includes(login))return res.status(403).send('Usuário sem permissão para este painel');
     res.setHeader('Set-Cookie',[cookie('ft_session',signed({kind:'sponsor',login,exp:Date.now()+86400000}),86400),cookie('ft_oauth_nonce','',0)]);
     res.setHeader('Cache-Control','no-store');
     return res.redirect(302,'/sponsor/lucas/gestao/');
   }catch(err){console.error('Sponsor login error',err?.message);return res.status(502).send('Não foi possível concluir o login');}
 }

 let targetOrigin;
 try { targetOrigin = new URL(req.query.state).origin; } catch (_) { targetOrigin = null; }
 if (!targetOrigin || !ALLOWED.has(targetOrigin) || !code) return res.status(400).send('Autenticação inválida.');
 const client_id=process.env.GITHUB_CLIENT_ID,client_secret=process.env.GITHUB_CLIENT_SECRET;
 if (!client_id || !client_secret) return res.status(503).send('Serviço temporariamente indisponível.');
 try {
   const response=await axios.post('https://github.com/login/oauth/access_token',{client_id,client_secret,code},{headers:{Accept:'application/json'},timeout:12000});
   const accessToken=response.data && response.data.access_token;
   if (typeof accessToken !== 'string' || !accessToken) throw new Error('OAuth unsuccessful');
   const message='authorization:github:success:'+JSON.stringify({token:accessToken,provider:'github'});
   // Encode JS string values and escape '<' to block script-tag termination.
   const jsMessage=JSON.stringify(message).replace(/</g,'\\u003c');
   const jsOrigin=JSON.stringify(targetOrigin);
   res.setHeader('Cache-Control','no-store');
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.setHeader('X-Content-Type-Options','nosniff');
   return res.status(200).send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Autenticação</title></head><body><p>Concluindo autorização...</p><script>if(window.opener){window.opener.postMessage(${jsMessage},${jsOrigin});window.close();}</script></body></html>`);
 } catch (err) {console.error('OAuth callback failed:',err?.response?.status||'unknown');return res.status(502).send('Não foi possível concluir a autenticação.');}
}
