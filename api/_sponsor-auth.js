import crypto from 'node:crypto';
const secret=process.env.SPONSOR_SESSION_SECRET||'';
export const sign=v=>crypto.createHmac('sha256',secret).update(v).digest('base64url');
export function signed(value){const v=Buffer.from(JSON.stringify(value)).toString('base64url');return v+'.'+sign(v)}
export function verify(value){if(!secret||typeof value!=='string')return null;const i=value.lastIndexOf('.');if(i<0)return null;const text=value.slice(0,i),mac=value.slice(i+1),expected=sign(text);if(mac.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return null;try{return JSON.parse(Buffer.from(text,'base64url').toString('utf8'))}catch{return null}}
export function authenticate(req){const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ft_session='));const payload=verify(raw?.slice(11));const users=(process.env.SPONSOR_ADMIN_GITHUB_USERS||'').toLowerCase().split(',').map(x=>x.trim());if(!payload||payload.exp<=Date.now())return null;
if(payload.kind==='sponsor'&&users.includes(String(payload.login||'').toLowerCase()))return payload;
const hash=process.env.SPONSOR_TEMP_PASSWORD_SHA256||'';
const until=Date.parse(process.env.SPONSOR_TEMP_PASSWORD_EXPIRES_AT||'');
if(payload.kind==='sponsor-temp'&&hash.length===64&&Number.isFinite(until)&&Date.now()<until&&payload.ver===hash.slice(0,16)&&payload.login==='lucas-temporario')return payload;
return null}
export function cookie(name,value,age){return name+'='+value+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='+age}

export const PARTNER_IDS=['oze','didi','guimaraes','realgaucho'];
export function partnerHash(id){
  if(!PARTNER_IDS.includes(id))return '';
  const key={oze:'SPONSOR_PARTNER_HASH_OZE',didi:'SPONSOR_PARTNER_HASH_DIDI',guimaraes:'SPONSOR_PARTNER_HASH_GUIMARAES',realgaucho:'SPONSOR_PARTNER_HASH_REALGAUCHO'}[id];
  return process.env[key]||'';
}
export function authenticatePartner(req){
  const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ft_partner_session='));
  const payload=verify(raw?.slice('ft_partner_session='.length));
  if(!payload||payload.kind!=='sponsor-partner'||!PARTNER_IDS.includes(payload.partner)||payload.exp<=Date.now())return null;
  const hash=partnerHash(payload.partner);
  if(!/^[0-9a-f]{64}$/.test(hash)||payload.ver!==hash.slice(0,16))return null;
  return payload;
}
