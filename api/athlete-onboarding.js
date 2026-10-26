import crypto from 'node:crypto';
import {get,put,list} from '@vercel/blob';
import {signed,verify} from './_sponsor-auth.js';

const BASE='futtalento/onboarding/v1/';
const NOT_FOUND=/not.found|404|does not exist/i;
const LIMIT=200;
const err=(res,n,msg)=>res.status(n).json({ok:false,error:msg});
const hostOK=req=>['www.futtalento.com.br','futtalento.com.br'].includes(String(req.headers.host||''));
const originOK=req=>hostOK(req)&&req.headers.origin==='https://'+req.headers.host;
const clean=(v,max=100)=>typeof v==='string'?v.trim().replace(/\s+/g,' ').slice(0,max):'';
const safeName=v=>/^[\p{L}\p{M}0-9 '\-\.]{3,100}$/u.test(v);
const email=v=>typeof v==='string'&&v.length<=150&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?v.toLowerCase().trim():'';
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
const hmac=(v)=>crypto.createHmac('sha256',process.env.SPONSOR_SESSION_SECRET||'').update(v).digest('hex');
const pathFor=e=>BASE+'accounts/'+digest(e)+'.json';
const session=(req)=>{
 const raw=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ft_guardian='));
 const payload=verify(raw?.slice('ft_guardian='.length));
 return payload?.kind==='ft-guardian'&&payload.exp>Date.now()&&/^[a-f0-9]{64}$/.test(payload.emailHash)?payload:null;
};
const sessionCookie=(payload,maxAge)=>'ft_guardian='+signed(payload)+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge;
async function read(path){
 try{
  const value=await get(path,{access:'private'});
  return value?.stream?JSON.parse(await new Response(value.stream).text()):null;
 }catch(e){if(NOT_FOUND.test(String(e?.message||'')))return null;throw e}
}
async function write(path,data){await put(path,JSON.stringify(data),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});}
const toPublic=r=>({
 slug:r.slug,name:r.athleteName,club:r.club,clubKey:r.clubKey,position:r.position||'Atleta de base',
 category:r.category||'Formação',titles:r.titles||'',socials:r.socials||{},
 image:'/api/athlete-onboarding?action=photo&slug='+encodeURIComponent(r.slug),
 page:'/atletas/perfil/?id='+encodeURIComponent(r.slug),
 joinedAt:r.publishedAt
});
function validAthlete(body){
 const athleteName=clean(body.athleteName,100),guardianName=clean(body.guardianName,100);
 const guardianPhone=String(body.guardianPhone||'').replace(/\D/g,'');
 const dob=String(body.birthDate||'');
 const club=clean(body.club,100),position=clean(body.position,60),category=clean(body.category,50),titles=clean(body.titles,450);
 const urls={};
 for(const key of ['instagram','tiktok','youtube','website']){
  const raw=clean(body[key],240);if(!raw)continue;
  let u;try{u=new URL(raw)}catch{return {error:'Confira o link de '+key}}
  if(u.protocol!=='https:'||u.username||u.password||u.href.length>240)return {error:'Link inválido de '+key};
  if(key==='instagram'&&!/(^|\.)instagram\.com$/.test(u.hostname))return {error:'Use o link oficial do Instagram'};
  if(key==='tiktok'&&!/(^|\.)tiktok\.com$/.test(u.hostname))return {error:'Use o link oficial do TikTok'};
  if(key==='youtube'&&!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname))return {error:'Use o link oficial do YouTube'};
  urls[key]=u.href;
 }
 if(!safeName(athleteName)||!safeName(guardianName))return {error:'Informe o nome completo do atleta e do responsável'};
 if(guardianPhone.length<10||guardianPhone.length>13)return {error:'Informe um telefone do responsável com DDD'};
 if(body.guardianConsent!==true||body.adultGuardian!==true||body.publicationConsent!==true)
  return {error:'O cadastro exige declaração do responsável adulto e autorização explícita de publicação'};
 if(dob&&!/^\d{4}-\d{2}-\d{2}$/.test(dob))return {error:'Data de nascimento inválida'};
 if(dob){
  const time=Date.parse(dob);
  if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==dob||time>Date.now()||time<Date.now()-100*365*86400000)
   return {error:'Data de nascimento inválida'};
 }
 if(!club||club.length<2)return {error:'Informe o clube atual ou escreva Sem clube'};
 return {value:{athleteName,guardianName,guardianPhone,birthDate:dob,club,
  clubKey:club.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').slice(0,52),
  position,category,titles,socials:urls}};
}
function imageFrom(body){
 const raw=String(body.photo||'');
 const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw);
 if(!match)return null;
 const b=Buffer.from(match[2],'base64');
 if(b.length<1000||b.length>350000)return null;
 const mime=match[1]==='jpeg'?'image/jpeg':match[1]==='png'?'image/png':'image/webp';
 const jpg=mime==='image/jpeg'&&b[0]===255&&b[1]===216;
 const png=mime==='image/png'&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71;
 const webp=mime==='image/webp'&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
 if(!jpg&&!png&&!webp)return null;
 return {bytes:b,mime,extension:match[1]==='jpeg'?'jpg':match[1]};
}
async function requireAccount(req){
 const s=session(req);if(!s)return null;
 const a=await read(BASE+'accounts/'+s.emailHash+'.json');
 return a&&a.id===s.id?a:null;
}
async function publishedList(){
 const items=[];let cursor;
 for(let n=0;n<5;n++){
  const page=await list({prefix:BASE+'published/',limit:100,cursor,access:'private'});
  for(const b of page.blobs||[]){
   const d=await read(b.pathname);
   if(d?.publishedAt&&d?.guardianEmailVerified&&d?.guardianConsent===true&&d?.publicationConsent===true)
    items.push(toPublic(d));
   if(items.length>=LIMIT)return items;
  }
  if(!page.hasMore||!page.cursor)break;cursor=page.cursor;
 }
 return items;
}
async function sendVerification(address,code){
 const key=process.env.FUTTALENTO_MAIL_API_KEY,from=process.env.FUTTALENTO_MAIL_FROM;
 if(!key||!from)return false;
 const response=await fetch('https://api.resend.com/emails',{
  method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({from,to:[address],subject:'Confirme seu cadastro no FutTalento',
   text:'Seu código de verificação FutTalento é '+code+'. Válido por 15 minutos. Nunca compartilhe sua senha.'})
 });
 if(!response.ok)throw new Error('Serviço de email indisponível');return true;
}
function publiclySafe(req,res){res.setHeader('Cache-Control','public, max-age=60, s-maxage=120');res.setHeader('X-Content-Type-Options','nosniff');}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 const action=String(req.query?.action||'');
 if(req.method==='GET'&&['list','profile','photo'].includes(action)){
  publiclySafe(req,res);
  try{
   if(action==='list')return res.status(200).json({ok:true,athletes:await publishedList()});
   const slug=String(req.query.slug||'');
   if(!/^[a-z0-9-]{4,90}$/.test(slug))return err(res,400,'Identificador inválido');
   const record=await read(BASE+'published/'+slug+'.json');
   if(!record?.publishedAt||!record.guardianEmailVerified)return err(res,404,'Perfil indisponível');
   if(action==='profile')return res.status(200).json({ok:true,profile:toPublic(record)});
   const photo=await get(BASE+'photos/'+slug+'.'+record.photoExtension,{access:'private'});
   if(!photo?.stream)return err(res,404,'Foto indisponível');
   res.setHeader('Content-Type',record.photoMime);
   res.setHeader('Content-Disposition','inline');
   return new Response(photo.stream).arrayBuffer().then(buffer=>res.status(200).send(Buffer.from(buffer)));
  }catch(e){console.error('athlete public read',e.name);return err(res,503,'Perfis temporariamente indisponíveis');}
 }
 if(!hostOK(req))return err(res,403,'Domínio não permitido');
 if(req.method==='GET'&&action==='session'){
  try{
   const a=await requireAccount(req);
   return res.status(200).json({ok:true,loggedIn:!!a,verified:!!a?.guardianEmailVerified,athlete:a?{name:a.athleteName,slug:a.slug,status:a.status}:null,
    emailVerificationConfigured:!!(process.env.FUTTALENTO_MAIL_API_KEY&&process.env.FUTTALENTO_MAIL_FROM)});
  }catch{return err(res,503,'Cadastro temporariamente indisponível')}
 }
 if(req.method!=='POST')return err(res,405,'Método não permitido');
 if(!originOK(req))return err(res,403,'Origem inválida');
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return err(res,415,'Formato inválido');
 const body=req.body;
 if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>510000)return err(res,400,'Dados inválidos');
 if(!process.env.BLOB_READ_WRITE_TOKEN||!process.env.SPONSOR_SESSION_SECRET)return err(res,503,'Serviço de cadastro não configurado');
 try{
  if(action==='register'){
   const address=email(body.email),password=String(body.password||'');
   const checked=validAthlete(body),photo=imageFrom(body);
   if(!address||password.length<12||password.length>128)return err(res,400,'Informe email válido e senha com pelo menos 12 caracteres');
   if(checked.error)return err(res,400,checked.error);
   if(!photo)return err(res,400,'Envie uma foto JPG, PNG ou WebP até 350 KB');
   if(await read(pathFor(address)))return err(res,409,'Este email já tem cadastro. Entre com sua senha.');
   const slug=checked.value.athleteName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,54)+'-'+crypto.randomBytes(4).toString('hex');
   const salt=crypto.randomBytes(16).toString('hex');
   const hash=crypto.scryptSync(password,salt,64).toString('hex');
   const code=String(crypto.randomInt(100000,1000000));
   const id=crypto.randomUUID();
   const record={...checked.value,slug,id,email:address,passwordSalt:salt,passwordHash:hash,
    guardianConsent:true,publicationConsent:true,guardianEmailVerified:false,status:'aguardando_verificacao',
    photoMime:photo.mime,photoExtension:photo.extension,createdAt:new Date().toISOString(),
    verifyCodeHash:hmac(id+':'+code),verifyExpiresAt:Date.now()+15*60000,verifyAttempts:0};
   await put(BASE+'photos/'+slug+'.'+photo.extension,photo.bytes,{
    access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:photo.mime
   });
   await write(pathFor(address),record);
   let sent=false;
   try{sent=await sendVerification(address,code)}catch(e){console.error('guardian email verification',e.name)}
   res.setHeader('Set-Cookie',sessionCookie({kind:'ft-guardian',id,emailHash:digest(address),exp:Date.now()+7*86400000},7*86400));
   return res.status(201).json({ok:true,registered:true,verified:false,emailSent:sent,
    message:sent?'Confira o código enviado ao seu email.':'Cadastro privado criado. A publicação aguarda ativação da verificação por email.'});
  }
  if(action==='login'){
   const address=email(body.email),a=address?await read(pathFor(address)):null;
   const password=String(body.password||'');
   if(!a||password.length>128||!a.passwordSalt)return err(res,401,'Credenciais inválidas');
   const hash=crypto.scryptSync(password,a.passwordSalt,64);
   if(!crypto.timingSafeEqual(hash,Buffer.from(a.passwordHash,'hex')))return err(res,401,'Credenciais inválidas');
   res.setHeader('Set-Cookie',sessionCookie({kind:'ft-guardian',id:a.id,emailHash:digest(address),exp:Date.now()+7*86400000},7*86400));
   return res.status(200).json({ok:true,verified:!!a.guardianEmailVerified,status:a.status});
  }
  if(action==='verify'){
   const a=await requireAccount(req),code=String(body.code||'');
   if(!a)return err(res,401,'Faça login primeiro');
   if(a.guardianEmailVerified)return res.status(200).json({ok:true,verified:true,profile:toPublic(a)});
   if(!/^\d{6}$/.test(code)||Date.now()>a.verifyExpiresAt||a.verifyAttempts>=6)return err(res,400,'Código inválido ou expirado');
   a.verifyAttempts++;
   if(hmac(a.id+':'+code)!==a.verifyCodeHash){await write(pathFor(a.email),a);return err(res,400,'Código inválido');}
   a.guardianEmailVerified=true;a.publishedAt=new Date().toISOString();a.status='publicado';
   delete a.verifyCodeHash;delete a.verifyExpiresAt;delete a.verifyAttempts;
   // Public catalog record intentionally excludes name, email, phone and full DOB of guardian.
   const publication={...toPublic(a),slug:a.slug,publishedAt:a.publishedAt,
    guardianConsent:true,publicationConsent:true,guardianEmailVerified:true,
    photoExtension:a.photoExtension,photoMime:a.photoMime,athleteName:a.athleteName,
    position:a.position,category:a.category,club:a.club,clubKey:a.clubKey,titles:a.titles,socials:a.socials};
   await write(BASE+'published/'+a.slug+'.json',publication);
   await write(pathFor(a.email),a);
   return res.status(200).json({ok:true,verified:true,profile:toPublic(a)});
  }
  return err(res,400,'Ação inválida');
 }catch(e){console.error('FutTalento onboarding',e.name);return err(res,503,'Não foi possível concluir agora. Tente novamente mais tarde.');}
}
