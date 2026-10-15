import {createHash,timingSafeEqual} from 'node:crypto';
import {signed,cookie,PARTNER_IDS,partnerHash} from './_sponsor-auth.js';

export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
  const host=req.headers.host,origin=req.headers.origin;
  if(!['www.futtalento.com.br','futtalento.com.br'].includes(host)||origin!=='https://'+host)
    return res.status(403).json({error:'Origem não autorizada'});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))
    return res.status(415).json({error:'Formato não aceito'});
  const partner=String(req.body?.partner||''),password=req.body?.password;
  if(!PARTNER_IDS.includes(partner)||typeof password!=='string'||password.length<18||password.length>128)
    return res.status(401).json({error:'Parceiro ou senha incorretos'});
  const hash=partnerHash(partner);
  if(!/^[0-9a-f]{64}$/.test(hash))return res.status(503).json({error:'Acesso deste parceiro ainda não configurado'});
  const supplied=createHash('sha256').update(password,'utf8').digest();
  const expected=Buffer.from(hash,'hex');
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))
    return res.status(401).json({error:'Parceiro ou senha incorretos'});
  const seconds=8*60*60;
  const session=signed({kind:'sponsor-partner',partner,ver:hash.slice(0,16),exp:Date.now()+seconds*1000});
  res.setHeader('Set-Cookie',cookie('ft_partner_session',session,seconds));
  return res.status(200).json({ok:true,partner});
}
