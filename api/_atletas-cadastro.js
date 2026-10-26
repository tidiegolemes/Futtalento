import {createHash,createHmac,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {get,put,list} from '@vercel/blob';
import {authenticate} from './_sponsor-auth.js';

const PREFIX='futtalento/cadastros/v1/';
const ACCOUNT=PREFIX+'contas/';
const PROFILE=PREFIX+'perfis/';
const PUBLIC='futtalento/perfis-publicos/v1/';
const SESSION='ft_atleta_session';
const secret=()=>process.env.ATHLETE_SESSION_SECRET||process.env.SPONSOR_SESSION_SECRET;
const respond=(res,status,data)=>res.status(status).json(data);
const validStr=(value,max=250)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const clean=(value,max=250)=>String(value||'').trim().slice(0,max);
const hash=(text)=>createHash('sha256').update(text).digest('hex');
const accountPath=(email)=>ACCOUNT+hash(email)+'.json';
const slugOk=(s)=>/^at-[a-f0-9]{20}$/.test(s);
const profilePath=(slug)=>PROFILE+slug+'.json';
const publicPath=(slug)=>PUBLIC+slug+'.json';
async function read(path){
 try{const file=await get(path,{access:'private'});return file?.stream?JSON.parse(await new Response(file.stream).text()):null;}
 catch(e){if(/404|not.found|does not exist/i.test(String(e.message)))return null;throw e;}
}
const save=(path,obj)=>put(path,JSON.stringify(obj),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});
function passwordHash(password,salt=randomBytes(16).toString('hex')) {
 return salt+':'+scryptSync(password,salt,64,{maxmem:64*1024*1024}).toString('hex');
}
function comparePassword(password,digest){
 if(!digest||!digest.includes(':'))return false;
 const [salt,expected]=digest.split(':');
 if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(expected))return false;
 const a=scryptSync(password,salt,64,{maxmem:64*1024*1024}),b=Buffer.from(expected,'hex');
 return timingSafeEqual(a,b);
}
const normalizeEmail=e=>String(e||'').trim().toLowerCase();
const safeEmail=e=>/^[^\s@]{1,64}@[^\s@]{1,200}\.[^\s@]{2,24}$/.test(e)&&e.length<=254;
function makeSession(email){
 const body=Buffer.from(JSON.stringify({id:hash(email),expires:Date.now()+7*86400000,role:'guardian'})).toString('base64url');
 return body+'.'+createHmac('sha256',secret()).update('futtalento:athlete:'+body).digest('base64url');
}
function emailHashFromSession(req){
 const raw=req.headers.cookie?.split(';').map(t=>t.trim()).find(t=>t.startsWith(SESSION+'='))?.slice(SESSION.length+1);
 if(!raw||raw.length>900)return null;
 const parts=raw.split('.');if(parts.length!==2||!secret())return null;
 const expected=createHmac('sha256',secret()).update('futtalento:athlete:'+parts[0]).digest();
 const actual=Buffer.from(parts[1],'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(expected,actual))return null;
 try{const obj=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));return obj.role==='guardian'&&obj.expires>Date.now()&&/^[a-f0-9]{64}$/.test(obj.id)?obj.id:null}catch{return null;}
}
const cookie=(value,age=604800)=>`${SESSION}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
function allowedOrigin(req){
 const origin=req.headers.origin;const host=req.headers.host;
 if(!origin||!host)return false;
 try{return new URL(origin).host===host&&new URL(origin).protocol==='https:'}catch{return false}
}
const stripPublic=(p)=>({
 slug:p.slug,name:p.name,club:p.club||'Em definição',position:p.position||'Atleta em formação',
 titles:p.titles||'',networks:p.networks||{},photoUrl:p.photoUrl||null,
 highlights:p.highlights||'',journey:p.journey||[],createdAt:p.createdAt,
 clubColor:p.clubColor||'#c9fc54',status:'publicado'
});
function formatProfile(body,existing={}){
 const networks={};
 for(const key of ['instagram','tiktok','youtube','site']){
  const s=clean(body.networks?.[key],300);
  if(s){let u;try{u=new URL(s)}catch{throw Error('Link inválido: '+key)}
   if(u.protocol!=='https:'||u.username||u.password||['localhost','127.0.0.1'].includes(u.hostname))throw Error('Link inválido: '+key);
   networks[key]=u.href;
  }
 }
 const guardianName=clean(body.guardianName,110);
 const guardianPhone=clean(body.guardianPhone,26);
 if(!validStr(guardianName,110)||!/^[+()\d\s-]{10,26}$/.test(guardianPhone)||guardianPhone.replace(/\D/g,'').length<10)throw Error('Informe nome e telefone válidos do responsável');
 const name=clean(body.name,110);
 if(!validStr(name,110))throw Error('Informe o nome do atleta');
 const dob=clean(body.birthDate,10);
 if(dob&&(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||Number.isNaN(Date.parse(dob))||dob>new Date().toISOString().slice(0,10)))throw Error('Data de nascimento inválida');
 const titles=clean(body.titles,650);
 const photo=clean(body.photoUrl,1500);
 // Public images are only explicitly approved HTTPS resources. Do not accept arbitrary html/data URLs.
 if(photo&&(!photo.startsWith('https://')||/\s/.test(photo)))throw Error('URL de foto deve ser HTTPS');
 return {...existing,
  name,guardianName,guardianPhone,
  club:clean(body.club,110),position:clean(body.position,80),birthDate:dob,
  titles,photoUrl:photo,networks,
  highlights:clean(body.highlights,420),clubColor:existing.clubColor||'#c9fc54',
  guardianAttested:body.guardianAttested===true,
  consentToDisplay:body.consentToDisplay===true,
  updatedAt:new Date().toISOString()
 };
}
async function owner(req){
 const key=emailHashFromSession(req);if(!key)return null;
 const account=await read(ACCOUNT+key+'.json');
 return account&&account.id===key?account:null;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 if(!secret())return respond(res,503,{ok:false,error:'Cadastro temporariamente indisponível'});
 try{
  if(req.method==='GET'&&req.query?.public==='1'){
   if(req.query.slug){
    const slug=String(req.query.slug);
    if(!slugOk(slug))return respond(res,400,{ok:false,error:'Perfil inválido'});
    const p=await read(publicPath(slug));
    return p?respond(res,200,{ok:true,athlete:p}):respond(res,404,{ok:false,error:'Perfil não publicado'});
   }
   const collection=await list({prefix:PUBLIC,limit:100});
   const profiles=await Promise.all((collection.blobs||[]).filter(b=>b.pathname.endsWith('.json')).map(b=>read(b.pathname)));
   return respond(res,200,{ok:true,athletes:profiles.filter(Boolean).slice(0,100)});
  }
  if(req.method==='GET'&&req.query?.agency==='pending'){
   const admin=authenticate(req);
   if(!admin||admin.kind!=='sponsor')return respond(res,401,{ok:false,error:'Acesso restrito'});
   const results=await list({prefix:PROFILE,limit:100});
   const all=await Promise.all((results.blobs||[]).filter(x=>x.pathname.endsWith('.json')).map(x=>read(x.pathname)));
   return respond(res,200,{ok:true,profiles:all.filter(p=>p?.status==='revisao').map(p=>({...p,password:undefined}))});
  }
  if(req.method==='GET'){
   const account=await owner(req);
   if(!account)return respond(res,401,{ok:false,error:'Entre com sua conta'});
   const profile=account.slug?await read(profilePath(account.slug)):null;
   return respond(res,200,{ok:true,account:{email:account.email,slug:account.slug},profile});
  }
  if(req.method!=='POST')return respond(res,405,{ok:false,error:'Método não permitido'});
  if(!allowedOrigin(req))return respond(res,403,{ok:false,error:'Origem não autorizada'});
  const body=req.body&&typeof req.body==='object'?req.body:{};
  if(JSON.stringify(body).length>13000)return respond(res,413,{ok:false,error:'Cadastro muito grande'});
  const action=clean(body.action,25);
  if(action==='signup'){
   const email=normalizeEmail(body.email);
   const password=String(body.password||'');
   if(!safeEmail(email)||password.length<12||password.length>128)return respond(res,400,{ok:false,error:'Use e-mail válido e senha de pelo menos 12 caracteres'});
   if(!body.guardianAttested)return respond(res,400,{ok:false,error:'O responsável legal deve confirmar sua condição'});
   if(body.website)return respond(res,400,{ok:false,error:'Cadastro inválido'});
   if(await read(accountPath(email)))return respond(res,409,{ok:false,error:'Conta já cadastrada; faça login'});
   const slug='at-'+randomBytes(10).toString('hex');
   const profile={slug,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:'rascunho',
   name:'',guardianName:'',guardianPhone:'',club:'',position:'',titles:'',photoUrl:'',networks:{},
   guardianAttested:true,consentToDisplay:false};
   const account={id:hash(email),email,slug,passwordDigest:passwordHash(password),createdAt:new Date().toISOString()};
   await save(profilePath(slug),profile);
   await save(accountPath(email),account);
   res.setHeader('Set-Cookie',cookie(makeSession(email)));
   return respond(res,201,{ok:true,slug,status:'rascunho',profileUrl:'/atletas/perfil/?id='+slug});
  }
  if(action==='login'){
   const email=normalizeEmail(body.email),pw=String(body.password||'');
   if(!safeEmail(email)||pw.length>128)return respond(res,401,{ok:false,error:'E-mail ou senha inválidos'});
   const account=await read(accountPath(email));
   if(!account||!comparePassword(pw,account.passwordDigest))return respond(res,401,{ok:false,error:'E-mail ou senha inválidos'});
   res.setHeader('Set-Cookie',cookie(makeSession(email)));
   return respond(res,200,{ok:true,slug:account.slug,profileUrl:'/atletas/perfil/?id='+account.slug});
  }
  if(action==='logout'){
   res.setHeader('Set-Cookie',cookie('',0));return respond(res,200,{ok:true});
  }
  if(action==='approve'){
   const admin=authenticate(req);
   if(!admin||admin.kind!=='sponsor')return respond(res,401,{ok:false,error:'Acesso exclusivo da agência'});
   const slug=clean(body.slug,25);
   if(!slugOk(slug))return respond(res,400,{ok:false,error:'Perfil inválido'});
   const profile=await read(profilePath(slug));
   if(!profile||profile.status!=='revisao'||!profile.guardianAttested||!profile.consentToDisplay)
    return respond(res,409,{ok:false,error:'Perfil não está autorizado para publicação'});
   if(body.approved!==true)return respond(res,400,{ok:false,error:'Aprovação explícita necessária'});
   // Only the public allowlist is ever exposed; private birth date and guardian contact stay private.
   const safe=stripPublic(profile);
   await save(publicPath(slug),safe);
   await save(profilePath(slug),{...profile,status:'publicado',reviewedAt:new Date().toISOString(),reviewedBy:admin.login});
   return respond(res,200,{ok:true,slug,profileUrl:'/atletas/perfil/?id='+slug,status:'publicado'});
  }
  const account=await owner(req);
  if(!account)return respond(res,401,{ok:false,error:'Entre para editar'});
  if(!['save','submit'].includes(action))return respond(res,400,{ok:false,error:'Ação inválida'});
  const profile=await read(profilePath(account.slug));
  if(!profile)return respond(res,404,{ok:false,error:'Perfil não encontrado'});
  if(profile.status==='publicado')return respond(res,409,{ok:false,error:'Para alterar perfil publicado, solicite revisão à agência'});
  const updated=formatProfile(body,profile);
  if(action==='submit'&&(!updated.guardianAttested||!updated.consentToDisplay))
   return respond(res,400,{ok:false,error:'A publicação depende da autorização do responsável'});
  updated.status=action==='submit'?'revisao':'rascunho';
  await save(profilePath(account.slug),updated);
  return respond(res,200,{ok:true,slug:account.slug,status:updated.status,profileUrl:'/atletas/perfil/?id='+account.slug});
 }catch(e){
  if(e.message?.startsWith('Informe')||e.message?.startsWith('Link inválido')||e.message?.startsWith('Data de nascimento')||e.message?.startsWith('URL de foto'))return respond(res,400,{ok:false,error:e.message});
  console.error('FutTalento registration error:',e?.name);
  return respond(res,503,{ok:false,error:'Não foi possível concluir agora'});
 }
}
