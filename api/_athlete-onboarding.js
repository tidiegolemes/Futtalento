import crypto from 'node:crypto';
import {get,put,list} from '@vercel/blob';
import {signed,verify,authenticate} from './_sponsor-auth.js';

const BASE='futtalento/onboarding/v1/';
const EXISTING_ATHLETES={lucas:'Lucas Azambuja',ryan:'Ryan Coelho',thalles:'Thalles Silvino'};
// Valores públicos documentados nas páginas estáticas; usados apenas para predefinir o editor.
const EXISTING_DETAILS={
 lucas:{club:'Grêmio FBPA',position:'Meia canhoto',category:'Sub-8 (2018)',
  socials:{instagram:'https://www.instagram.com/lucasazambujaoficial/',tiktok:'https://www.tiktok.com/@lukinhas10_oficial',youtube:'https://www.youtube.com/@LucasAzambujaoficial'}},
 ryan:{club:'Cruzeiro-RS',position:'Meio-campo',category:'',
  socials:{instagram:'https://www.instagram.com/ryanzinho_8/',tiktok:'https://www.tiktok.com/@ryanzinho_8'}},
 thalles:{club:'E.C. Juventude',position:'Lateral e meia',category:'Geração 2012',
  socials:{instagram:'https://www.instagram.com/thalles_silvino012/',tiktok:'https://www.tiktok.com/@thallessilvinooficial',youtube:'https://www.youtube.com/@ThallesSilvino'}}
};
const athleteKey=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const existingAthlete=v=>Object.keys(EXISTING_ATHLETES).find(k=>athleteKey(EXISTING_ATHLETES[k])===athleteKey(v))||null;
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
 image:'/api/captacao-lead?onboarding=1&action=photo&slug='+encodeURIComponent(r.slug),
 page:'/atletas/perfil/?id='+encodeURIComponent(r.slug),
 joinedAt:r.updatedAt||r.publishedAt
});
function validAthlete(body){
 const athleteName=clean(body.athleteName,100),guardianName=clean(body.guardianName,100);
 const guardianPhone=String(body.guardianPhone||'').replace(/\D/g,'');
 const dob=String(body.birthDate||'');
 const club=clean(body.club,100)||'Sem clube',position=clean(body.position,60),category=clean(body.category,50),titles=clean(body.titles,450);
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
 if(club&&club.length<2)return {error:'Nome do clube inválido'};
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
 if(req.method==='GET'&&['list','profile','photo','sitemap','managed-profile','managed-photo'].includes(action)){
  publiclySafe(req,res);
  try{
   if(action==='list')return res.status(200).json({ok:true,athletes:await publishedList()});
   if(action==='sitemap'){
     const published=await publishedList();
     const urls=published.filter(p=>/^[a-z0-9-]{4,90}$/.test(p.slug)).map(p=>{
       const location='https://www.futtalento.com.br/atletas/perfil/?id='+encodeURIComponent(p.slug);
       const lastmod=/^\d{4}-\d{2}-\d{2}/.test(String(p.joinedAt||''))?
         '<lastmod>'+String(p.joinedAt).slice(0,10)+'</lastmod>':'';
       return '<url><loc>'+location+'</loc>'+lastmod+'</url>';
     });
     res.setHeader('Content-Type','application/xml; charset=utf-8');
     return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n'+
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
       urls.join('')+'</urlset>');
   }
   const slug=String(req.query.slug||'');
   if(!/^[a-z0-9-]{4,90}$/.test(slug))return err(res,400,'Identificador inválido');
   if(action==='managed-profile'||action==='managed-photo'){
    if(!EXISTING_ATHLETES[slug])return err(res,404,'Atleta não encontrado');
    const saved=await read(BASE+'managed/'+slug+'.json');
    if(!saved)return err(res,404,'Nenhuma alteração publicada');
    if(action==='managed-profile')return res.status(200).json({ok:true,profile:{
     name:saved.athleteName,club:saved.club,position:saved.position,
     category:saved.category,titles:saved.titles,socials:saved.socials,
     image:saved.photoExtension?'/api/captacao-lead?onboarding=1&action=managed-photo&slug='+slug:null
    }});
    if(!saved.photoExtension)return err(res,404,'Foto adicional indisponível');
    const managedPhoto=await get(BASE+'photos/'+slug+'-managed.'+saved.photoExtension,{access:'private'});
    if(!managedPhoto?.stream)return err(res,404,'Imagem indisponível');
    res.setHeader('Content-Type',saved.photoMime);
    res.setHeader('Content-Disposition','inline');
    return new Response(managedPhoto.stream).arrayBuffer().then(buffer=>res.status(200).send(Buffer.from(buffer)));
   }
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
 if(req.method==='GET'&&action==='admin-claims'){
  const staff=authenticate(req);
  if(!staff||staff.kind!=='sponsor')return err(res,403,'Acesso restrito à equipe autorizada');
  try{
   const claims=[];let cursor;
   for(let n=0;n<5;n++){
    const page=await list({prefix:BASE+'claims/',limit:100,cursor,access:'private'});
    for(const file of page.blobs||[]){const c=await read(file.pathname);if(c)claims.push(c);}
    if(!page.hasMore||!page.cursor)break;cursor=page.cursor;
   }
   return res.status(200).json({ok:true,claims});
  }catch(e){return err(res,503,'Falha na consulta de solicitações')}
 }
 if(req.method==='GET'&&action==='my-profile'){
  try{
   const a=await requireAccount(req);
   if(!a)return err(res,401,'Entre para gerenciar seu perfil');
   const managed=a.managedAthlete?await read(BASE+'managed/'+a.managedAthlete+'.json'):null;
   return res.status(200).json({ok:true,managedAthlete:a.managedAthlete||null,profile:a.slug?{
     athleteName:a.athleteName,guardianName:a.guardianName,guardianPhone:a.guardianPhone,
     club:a.club,position:a.position,category:a.category,titles:a.titles,birthDate:a.birthDate,
     socials:a.socials||{},page:toPublic(a).page
   }:a.managedAthlete?{
     athleteName:EXISTING_ATHLETES[a.managedAthlete],guardianName:a.guardianName,
     guardianPhone:a.guardianPhone,club:managed?.club||EXISTING_DETAILS[a.managedAthlete]?.club||'',
     position:managed?.position||EXISTING_DETAILS[a.managedAthlete]?.position||'',
     category:managed?.category||EXISTING_DETAILS[a.managedAthlete]?.category||'',
     titles:managed?.titles||'',socials:managed?.socials||EXISTING_DETAILS[a.managedAthlete]?.socials||{},
     page:'/atletas/'+a.managedAthlete+'/'
   }:null});
  }catch(e){return err(res,503,'Não foi possível carregar dados da conta')}
 }
 if(req.method==='GET'&&action==='admin-leads'){
  const staff=authenticate(req);
  if(!staff||staff.kind!=='sponsor')return err(res,403,'Acesso restrito à agência');
  try{
   const data=await list({prefix:BASE+'leads/',limit:100,access:'private'});
   const leads=await Promise.all((data.blobs||[]).map(x=>read(x.pathname)));
   return res.status(200).json({ok:true,leads:leads.filter(Boolean)});
  }catch(e){return err(res,503,'Não foi possível consultar os interessados')}
 }
 if(req.method==='GET'&&action==='google-config')return res.status(200).json({ok:true,clientId:process.env.FUTTALENTO_GOOGLE_CLIENT_ID||''});
 if(req.method==='GET'&&action==='session'){
  try{
   const a=await requireAccount(req);
   return res.status(200).json({ok:true,loggedIn:!!a,verified:!!a?.guardianEmailVerified,athlete:a?{name:a.athleteName,slug:a.slug,status:a.status}:null,
    emailVerificationConfigured:!!(process.env.FUTTALENTO_MAIL_API_KEY&&process.env.FUTTALENTO_MAIL_FROM),
    needsProfile:!!a&&!a.slug&&!a.claimAthlete,claimStatus:a?.claimStatus||null,
    claimAthlete:a?.claimAthlete||null,managedAthlete:a?.managedAthlete||null});
  }catch{return err(res,503,'Cadastro temporariamente indisponível')}
 }
 if(req.method!=='POST')return err(res,405,'Método não permitido');
 if(!originOK(req))return err(res,403,'Origem inválida');
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return err(res,415,'Formato inválido');
 const body=req.body;
 if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>510000)return err(res,400,'Dados inválidos');
 if(!process.env.BLOB_READ_WRITE_TOKEN||!process.env.SPONSOR_SESSION_SECRET)return err(res,503,'Serviço de cadastro não configurado');
 try{
  if(action==='interest'){
   const slug=String(body.slug||'');
   const target=/^[a-z0-9-]{4,90}$/.test(slug)?await read(BASE+'published/'+slug+'.json'):null;
   if(!target?.publishedAt)return err(res,404,'Atleta não encontrado');
   const contactName=clean(body.contactName,100),company=clean(body.company,100),phone=String(body.phone||'').replace(/\\D/g,'');
   if(!safeName(contactName)||company.length<2||phone.length<10||phone.length>13||body.consent!==true)
    return err(res,400,'Informe seu nome, empresa, telefone com DDD e autorização');
   const cd=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ft_athlete_interest='));
   const previous=verify(cd?.slice('ft_athlete_interest='.length));
   if(previous?.exp>Date.now())return err(res,429,'Recebemos um contato recente. Aguarde um pouco.');
   const lead={id:crypto.randomUUID(),slug,athlete:target.athleteName,
    contactName,company,phone,status:'novo_interesse',createdAt:new Date().toISOString(),
    consent:true,pixIssued:false};
   await write(BASE+'leads/'+Date.now()+'-'+lead.id+'.json',lead);
   res.setHeader('Set-Cookie','ft_athlete_interest='+signed({exp:Date.now()+90000})+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=90');
   return res.status(201).json({ok:true,message:'Interesse encaminhado à EyAgência para avaliar a contratação.'});
  }

  // Etapa 1: cria uma conta privada só com e-mail e senha, sem coletar dados de menores.
  if(action==='request-claim'){
   const a=await requireAccount(req);
   if(!a)return err(res,401,'Faça login para solicitar vínculo');
   if(a.slug||a.managedAthlete||a.claimStatus==='pending')return err(res,409,'Esta conta já está associada a um atleta ou solicitação');
   const athlete=String(body.athlete||'');
   if(!EXISTING_ATHLETES[athlete])return err(res,400,'Atleta existente inválido');
   const guardianName=clean(body.guardianName),guardianPhone=String(body.guardianPhone||'').replace(/\D/g,'');
   if(!safeName(guardianName)||guardianPhone.length<10||guardianPhone.length>13||
      body.adultGuardian!==true||body.guardianConsent!==true||body.publicationConsent!==true)
    return err(res,400,'Informe os dados do responsável e confirme a autorização');
   if(await read(BASE+'ownership/'+athlete+'.json'))
    return err(res,409,'Este atleta já possui responsável vinculado. Fale com a equipe.');
   a.guardianName=guardianName;a.guardianPhone=guardianPhone;a.guardianConsent=true;a.publicationConsent=true;
   a.claimAthlete=athlete;a.claimStatus='pending';
   const claim={id:a.id,emailHash:digest(a.email),athlete,athleteName:EXISTING_ATHLETES[athlete],
    guardianName,guardianPhone,status:'pending',createdAt:new Date().toISOString()};
   if(a.googleSubject){a.guardianEmailVerified=true;}
   else{
    const code=String(crypto.randomInt(100000,1000000));
    a.verifyCodeHash=hmac(a.id+':'+code);a.verifyExpiresAt=Date.now()+15*60000;a.verifyAttempts=0;
    try{claim.emailSent=await sendVerification(a.email,code)}catch(e){claim.emailSent=false;console.error('claim email',e.name)}
   }
   await write(pathFor(a.email),a);
   await write(BASE+'claims/'+athlete+'-'+a.id+'.json',claim);
   return res.status(201).json({ok:true,claimPending:true,
    requiresEmailVerification:!a.guardianEmailVerified,emailSent:claim.emailSent===true,
    message:'Solicitação registrada. Após a confirmação do e-mail, a equipe fará a verificação do vínculo.'});
  }
  if(action==='admin-claim-review'){
   const staff=authenticate(req);
   if(!staff||staff.kind!=='sponsor')return err(res,403,'Acesso restrito à equipe autorizada');
   const athlete=String(body.athlete||''),id=String(body.id||'');
   if(!EXISTING_ATHLETES[athlete]||!/^[a-f0-9-]{36}$/.test(id)||typeof body.approved!=='boolean')
    return err(res,400,'Solicitação inválida');
   const pathname=BASE+'claims/'+athlete+'-'+id+'.json',claim=await read(pathname);
   if(!claim||claim.status!=='pending')return err(res,404,'Solicitação pendente não encontrada');
   if(body.approved&&body.evidenceReviewed!==true)
    return err(res,400,'A aprovação exige conferência documentada da responsabilidade legal');
   const a=await read(BASE+'accounts/'+claim.emailHash+'.json');
   if(!a||a.id!==id||a.claimAthlete!==athlete||a.claimStatus!=='pending')
    return err(res,409,'Os dados da conta não conferem');
   if(body.approved&&!a.guardianEmailVerified)return err(res,409,'Confirmação de e-mail pendente');
   if(body.approved){
    const owner=await read(BASE+'ownership/'+athlete+'.json');
    if(owner&&owner.id!==id)return err(res,409,'Atleta já vinculado a outra conta');
    await write(BASE+'ownership/'+athlete+'.json',{id,emailHash:claim.emailHash,
     reviewer:staff.login,approvedAt:new Date().toISOString()});
    a.managedAthlete=athlete;a.guardianConsent=true;a.publicationConsent=true;a.claimStatus='approved';
   }else a.claimStatus='rejected';
   claim.status=body.approved?'approved':'rejected';claim.reviewedAt=new Date().toISOString();claim.reviewer=staff.login;
   await write(pathname,claim);await write(pathFor(a.email),a);
   return res.status(200).json({ok:true,status:claim.status});
  }
  if(action==='start'){
   const address=email(body.email),password=String(body.password||'');
   const repeat=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ft_signup_cooldown='));
   const cooldown=verify(repeat?.slice('ft_signup_cooldown='.length));
   if(cooldown?.exp>Date.now())return err(res,429,'Aguarde alguns minutos antes de criar outro cadastro');
   if(!address||password.length<12||password.length>128)return err(res,400,'Informe um e-mail válido e senha de pelo menos 12 caracteres');
   if(await read(pathFor(address)))return err(res,409,'Este e-mail já tem cadastro. Escolha entrar.');
   const id=crypto.randomUUID(),salt=crypto.randomBytes(16).toString('hex');
   const a={id,email:address,passwordSalt:salt,passwordHash:crypto.scryptSync(password,salt,64).toString('hex'),
    guardianEmailVerified:false,guardianConsent:false,publicationConsent:false,status:'rascunho',createdAt:new Date().toISOString()};
   await write(pathFor(address),a);
   res.setHeader('Set-Cookie',[
    sessionCookie({kind:'ft-guardian',id,emailHash:digest(address),exp:Date.now()+7*86400000},7*86400),
    'ft_signup_cooldown='+signed({exp:Date.now()+120000})+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=120'
   ]);
   return res.status(201).json({ok:true,needsProfile:true});
  }
  // Google Identity Services: o token é verificado no servidor, nunca apenas no navegador.
  if(action==='google'){
   const clientId=process.env.FUTTALENTO_GOOGLE_CLIENT_ID;
   const credential=String(body.credential||'');
   if(!clientId||credential.length<100||credential.length>6000)return err(res,503,'Entrar com Google indisponível');
   let identity;
   try{
    const {OAuth2Client}=await import('google-auth-library');
    const ticket=await new OAuth2Client(clientId).verifyIdToken({idToken:credential,audience:clientId});
    identity=ticket.getPayload();
   }catch(_){return err(res,401,'Não foi possível validar sua conta Google')}
   const address=email(identity?.email);
   if(!identity||identity.aud!==clientId||!['accounts.google.com','https://accounts.google.com'].includes(identity.iss)||
      !identity.sub||!address||identity.email_verified!==true)
     return err(res,401,'Identidade Google não verificada');
   // Google é autoridade pelo e-mail quando é Gmail ou uma conta Workspace identificada por hd.
   if(!address.endsWith('@gmail.com')&&!identity.hd)return err(res,403,'Para este e-mail, crie a conta com senha e confirme o endereço');
   let a=await read(pathFor(address));
   if(a?.googleSubject&&a.googleSubject!==identity.sub)return err(res,403,'Esta conta está vinculada a outro acesso Google');
   if(a&&!a.googleSubject)return err(res,409,'Este e-mail já possui cadastro por senha. Entre com e-mail e senha.');
   if(!a)a={id:crypto.randomUUID(),email:address,status:'rascunho',guardianConsent:false,publicationConsent:false,createdAt:new Date().toISOString()};
   a.googleSubject=identity.sub;
   a.googleLinkedAt=a.googleLinkedAt||new Date().toISOString();
   await write(pathFor(address),a);
   res.setHeader('Set-Cookie',sessionCookie({kind:'ft-guardian',id:a.id,emailHash:digest(address),exp:Date.now()+7*86400000},7*86400));
   return res.status(200).json({ok:true,needsProfile:!a.slug&&!a.claimAthlete,
     claimStatus:a.claimStatus||null,claimAthlete:a.claimAthlete||null,
     managedAthlete:a.managedAthlete||null,verified:!!a.guardianEmailVerified,
    page:a.slug?toPublic(a).page:null});
  }
  // Etapa 2: somente após a autenticação, pede dados do responsável e do atleta.
  if(action==='complete'){
   const a=await requireAccount(req);
   if(!a)return err(res,401,'Crie sua conta ou entre antes de preencher o perfil');
   if(a.slug||a.claimAthlete)return err(res,409,'Esta conta já possui um perfil ou vínculo em análise');
   const checked=validAthlete(body),photo=imageFrom(body);
   if(checked.error)return err(res,400,checked.error);
   if(existingAthlete(checked.value.athleteName))
    return err(res,409,'Este atleta já possui perfil oficial. Solicite o vínculo à equipe FutTalento, sem criar outra página.');
   if(!photo)return err(res,400,'Envie uma foto JPG, PNG ou WebP até 350 KB');
   const slug=checked.value.athleteName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,54)+'-'+crypto.randomBytes(4).toString('hex');
   Object.assign(a,checked.value,{slug,guardianConsent:true,publicationConsent:true,
    photoMime:photo.mime,photoExtension:photo.extension,profileCompletedAt:new Date().toISOString()});
   await put(BASE+'photos/'+slug+'.'+photo.extension,photo.bytes,{
    access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:photo.mime
   });
   if(a.googleSubject){
    // Login Google já prova a titularidade do e-mail; autorização explícita é colhida acima.
    a.guardianEmailVerified=true;a.publishedAt=new Date().toISOString();a.status='publicado';
    const publication={...toPublic(a),slug:a.slug,publishedAt:a.publishedAt,
     guardianConsent:true,publicationConsent:true,guardianEmailVerified:true,
     photoExtension:a.photoExtension,photoMime:a.photoMime,athleteName:a.athleteName,
     position:a.position,category:a.category,club:a.club,clubKey:a.clubKey,titles:a.titles,socials:a.socials};
    await write(BASE+'published/'+slug+'.json',publication);
    await write(pathFor(a.email),a);
    return res.status(201).json({ok:true,verified:true,profile:toPublic(a),message:'Página criada e publicada!'});
   }
   const code=String(crypto.randomInt(100000,1000000));
   a.guardianEmailVerified=false;a.status='aguardando_verificacao';
   a.verifyCodeHash=hmac(a.id+':'+code);a.verifyExpiresAt=Date.now()+15*60000;a.verifyAttempts=0;
   await write(pathFor(a.email),a);
   let sent=false;
   try{sent=await sendVerification(a.email,code)}catch(e){console.error('guardian email verification',e.name)}
   return res.status(201).json({ok:true,verified:false,emailSent:sent,
    message:sent?'Confira o código enviado ao seu e-mail.':'Perfil privado salvo. A publicação depende da ativação do envio de e-mail.'});
  }
  if(action==='register'){
   const address=email(body.email),password=String(body.password||'');
   const repeat=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ft_signup_cooldown='));
   const cooldown=verify(repeat?.slice('ft_signup_cooldown='.length));
   if(cooldown?.exp>Date.now())return err(res,429,'Aguarde alguns minutos antes de criar outro cadastro');

   const checked=validAthlete(body),photo=imageFrom(body);
   if(!address||password.length<12||password.length>128)return err(res,400,'Informe email válido e senha com pelo menos 12 caracteres');
   if(checked.error)return err(res,400,checked.error);
   if(existingAthlete(checked.value.athleteName))
    return err(res,409,'Este atleta já possui perfil oficial. Solicite vínculo à equipe FutTalento.');
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
   res.setHeader('Set-Cookie',[
    sessionCookie({kind:'ft-guardian',id,emailHash:digest(address),exp:Date.now()+7*86400000},7*86400),
    'ft_signup_cooldown='+signed({exp:Date.now()+120000})+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=120'
   ]);
   return res.status(201).json({ok:true,registered:true,verified:false,emailSent:sent,
    message:sent?'Confira o código enviado ao seu email.':'Cadastro privado criado. A publicação aguarda ativação da verificação por email.'});
  }
  if(action==='update-profile'){
   const a=await requireAccount(req);
   if(!a||(!a.slug&&!a.managedAthlete)||!a.guardianEmailVerified||!a.guardianConsent||!a.publicationConsent)
    return err(res,403,'Apenas o responsável autorizado pode editar este perfil');
   if(a.managedAthlete){
    const owned=await read(BASE+'ownership/'+a.managedAthlete+'.json');
    if(owned?.id!==a.id)return err(res,403,'Este perfil não está autorizado para sua conta');
   }
   const checked=validAthlete({...body,athleteName:a.managedAthlete?EXISTING_ATHLETES[a.managedAthlete]:a.athleteName,
     guardianName:a.guardianName,guardianPhone:a.guardianPhone,
     adultGuardian:true,guardianConsent:true,publicationConsent:true});
   if(checked.error)return err(res,400,checked.error);
   const photo=body.photo?imageFrom(body):null;
   if(body.photo&&!photo)return err(res,400,'Foto inválida. Envie JPG, PNG ou WebP até 350 KB');
   const now=new Date().toISOString();
   if(a.managedAthlete){
    const id=a.managedAthlete,previous=await read(BASE+'managed/'+id+'.json')||{};
    const record={...previous,athleteName:EXISTING_ATHLETES[id],slug:id,
      club:body.club?checked.value.club:previous.club||'',clubKey:body.club?checked.value.clubKey:previous.clubKey||'',
      position:checked.value.position,
      category:checked.value.category,titles:checked.value.titles,socials:checked.value.socials,updatedAt:now};
    if(photo){
     await put(BASE+'photos/'+id+'-managed.'+photo.extension,photo.bytes,{
       access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:photo.mime});
     record.photoExtension=photo.extension;record.photoMime=photo.mime;
    }
    await write(BASE+'managed/'+id+'.json',record);
    return res.status(200).json({ok:true,page:'/atletas/'+id+'/',message:'Alterações publicadas no perfil existente'});
   }
   Object.assign(a,{club:checked.value.club,clubKey:checked.value.clubKey,
     position:checked.value.position,category:checked.value.category,
     titles:checked.value.titles,socials:checked.value.socials,updatedAt:now});
   if(photo){
    const pathname=BASE+'photos/'+a.slug+'.'+photo.extension;
    await put(pathname,photo.bytes,{access:'private',allowOverwrite:true,
      addRandomSuffix:false,contentType:photo.mime});
    a.photoMime=photo.mime;a.photoExtension=photo.extension;
   }
   await write(pathFor(a.email),a);
   await write(BASE+'published/'+a.slug+'.json',{
     slug:a.slug,athleteName:a.athleteName,club:a.club,clubKey:a.clubKey,
     position:a.position,category:a.category,titles:a.titles,socials:a.socials,
     guardianConsent:true,publicationConsent:true,guardianEmailVerified:true,
     publishedAt:a.publishedAt,updatedAt:now,photoExtension:a.photoExtension,
     photoMime:a.photoMime
   });
   return res.status(200).json({ok:true,page:toPublic(a).page,message:'Perfil atualizado'});
  }
  if(action==='resend'){
   const a=await requireAccount(req);
   if(!a)return err(res,401,'Entre com email e senha para solicitar novo código');
   if(a.guardianEmailVerified)return res.status(200).json({ok:true,verified:true});
   if(!process.env.FUTTALENTO_MAIL_API_KEY||!process.env.FUTTALENTO_MAIL_FROM)
    return err(res,503,'Verificação por email ainda não habilitada pela equipe FutTalento.');
   if(a.lastVerifySentAt&&Date.now()-a.lastVerifySentAt<120000)
    return err(res,429,'Aguarde dois minutos antes de solicitar outro código');
   const code=String(crypto.randomInt(100000,1000000));
   // Fail closed: only persist the replacement code if delivery succeeds.
   await sendVerification(a.email,code);
   a.verifyCodeHash=hmac(a.id+':'+code);
   a.verifyExpiresAt=Date.now()+15*60000;
   a.verifyAttempts=0;a.lastVerifySentAt=Date.now();
   await write(pathFor(a.email),a);
   return res.status(200).json({ok:true,message:'Enviamos um novo código de seis números ao email cadastrado.'});
  }
  if(action==='login'){
   const address=email(body.email),a=address?await read(pathFor(address)):null;
   const password=String(body.password||'');
   if(!a||password.length>128||!a.passwordSalt)return err(res,401,'Credenciais inválidas');
   const hash=crypto.scryptSync(password,a.passwordSalt,64);
   if(!crypto.timingSafeEqual(hash,Buffer.from(a.passwordHash,'hex')))return err(res,401,'Credenciais inválidas');
   res.setHeader('Set-Cookie',sessionCookie({kind:'ft-guardian',id:a.id,emailHash:digest(address),exp:Date.now()+7*86400000},7*86400));
   return res.status(200).json({ok:true,verified:!!a.guardianEmailVerified,status:a.status,
     needsProfile:!a.slug&&!a.claimAthlete,claimStatus:a.claimStatus||null,
     claimAthlete:a.claimAthlete||null,managedAthlete:a.managedAthlete||null});
  }
  if(action==='verify'){
   const a=await requireAccount(req),code=String(body.code||'');
   if(!a)return err(res,401,'Faça login primeiro');
   if(!a.slug&&a.claimAthlete&&a.claimStatus==='pending'){
    if(!/^\d{6}$/.test(code)||Date.now()>a.verifyExpiresAt||a.verifyAttempts>=6)
     return err(res,400,'Código inválido ou expirado');
    a.verifyAttempts++;
    if(hmac(a.id+':'+code)!==a.verifyCodeHash){await write(pathFor(a.email),a);return err(res,400,'Código inválido');}
    a.guardianEmailVerified=true;
    delete a.verifyCodeHash;delete a.verifyExpiresAt;delete a.verifyAttempts;
    await write(pathFor(a.email),a);
    return res.status(200).json({ok:true,claimPending:true,message:'E-mail confirmado. Vínculo aguardando aprovação da equipe.'});
   }
   if(!a.slug||!a.guardianConsent||!a.publicationConsent)return err(res,409,'Finalize o perfil e as autorizações antes de publicar');
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
