import crypto from 'node:crypto';
import {signed,cookie} from './_sponsor-auth.js';
export default function handler(req,res){
if(req.method!=='GET')return res.status(405).end();
if(!['www.futtalento.com.br','futtalento.com.br'].includes(req.headers.host))return res.status(403).end();
if(!process.env.GITHUB_CLIENT_ID||!process.env.SPONSOR_SESSION_SECRET)return res.status(503).send('Autenticação não configurada');
const nonce=crypto.randomBytes(24).toString('hex');
const state=signed({kind:'sponsor-login',nonce,exp:Date.now()+600000});
res.setHeader('Set-Cookie',cookie('ft_oauth_nonce',nonce,600));res.setHeader('Cache-Control','no-store');
return res.redirect(302,'https://github.com/login/oauth/authorize?'+new URLSearchParams({client_id:process.env.GITHUB_CLIENT_ID,scope:'read:user',state}));
}