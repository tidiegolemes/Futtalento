import {createHash,timingSafeEqual} from 'node:crypto';
import {signed,cookie} from './_sponsor-auth.js';

export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
  const host=req.headers.host;
  const origin=req.headers.origin;
  if(!['www.futtalento.com.br','futtalento.com.br'].includes(host)
      ||origin!=='https://'+host){
    return res.status(403).json({error:'Acesso não autorizado'});
  }
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))
    return res.status(415).json({error:'Formato não aceito'});
  const expiry=Date.parse(process.env.SPONSOR_TEMP_PASSWORD_EXPIRES_AT||'');
  const hash=process.env.SPONSOR_TEMP_PASSWORD_SHA256||'';
  if(!Number.isFinite(expiry)||Date.now()>=expiry||!/^[0-9a-f]{64}$/.test(hash)){
    return res.status(403).json({error:'Senha temporária expirada ou desativada'});
  }
  const input=req.body?.password;
  if(typeof input!=='string'||input.length<12||input.length>128){
    return res.status(401).json({error:'Senha incorreta'});
  }
  const supplied=createHash('sha256').update(input,'utf8').digest();
  const expected=Buffer.from(hash,'hex');
  if(expected.length!==supplied.length||!timingSafeEqual(supplied,expected)){
    return res.status(401).json({error:'Senha incorreta'});
  }
  const sessionExpiry=Math.min(Date.now()+8*60*60*1000,expiry);
  const payload={kind:'sponsor-temp',login:'lucas-temporario',ver:hash.slice(0,16),exp:sessionExpiry};
  res.setHeader('Set-Cookie',cookie('ft_session',signed(payload),Math.max(1,Math.floor((sessionExpiry-Date.now())/1000))));
  return res.status(200).json({ok:true,expiresAt:new Date(sessionExpiry).toISOString()});
}
