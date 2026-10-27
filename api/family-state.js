import crypto from 'node:crypto';
import {authenticate,verify} from './_sponsor-auth.js';

const PATH='lucas/family-journey-v1.json';
const PARTNERS=['guimaraes','didi','oze','realgaucho'];
const MISSIONS=['confirm_partners','send_photo','review_benefits'];
const clip=(value,length=300)=>typeof value==='string'?value.trim().slice(0,length):'';
const isoDate=value=>/^20\d\d-\d\d-\d\d$/.test(value||'')?value:'';
const initial=()=>({version:1,revision:0,athlete:'Lucas Azambuja',missions:{},drafts:[],benefits:[],help:[],updatedAt:null});
const isStaff=user=>user.kind==='sponsor';
/* A gestão do perfil do Lucas permite acessar a jornada da família após aprovação humana.
   Não aceita apenas um cookie de inscrição: confere conta e propriedade atual no banco privado. */
async function approvedGuardian(req){
 const raw=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('ft_guardian='));
 const auth=verify(raw?.slice('ft_guardian='.length));
 if(!auth||auth.kind!=='ft-guardian'||!Number.isFinite(auth.exp)||auth.exp<Date.now()||
    !/^[a-f0-9]{64}$/.test(auth.emailHash||'')||typeof auth.id!=='string')return null;
 try{
  const {get}=await import('@vercel/blob');
  const parse=async path=>{
   const x=await get(path,{access:'private'});
   return x?.stream?JSON.parse(await new Response(x.stream).text()):null;
  };
  const [a,owner]=await Promise.all([
   parse('futtalento/onboarding/v1/accounts/'+auth.emailHash+'.json'),
   parse('futtalento/onboarding/v1/ownership/lucas.json')
  ]);
  if(!a||a.id!==auth.id||!a.guardianEmailVerified||a.managedAthlete!=='lucas'||
     a.claimStatus!=='approved'||a.guardianConsent!==true||
     a.publicationConsent!==true||owner?.id!==auth.id)return null;
  return {kind:'family-guardian',login:'responsavel-autorizado'};
 }catch(e){console.error('Guardian family authorization',e?.name);return null}
}

async function readState(){
  const {list,get}=await import('@vercel/blob');
  const listing=await list({prefix:PATH,limit:30});
  if(!listing.blobs?.some(x=>x.pathname===PATH))return initial();
  const doc=await get(PATH,{access:'private'});
  if(!doc?.stream)return initial();
  const obj=JSON.parse(await new Response(doc.stream).text());
  return {...initial(),...obj,missions:obj.missions||{},drafts:obj.drafts||[],benefits:obj.benefits||[],help:obj.help||[]};
}
async function saveState(data){
  const {put}=await import('@vercel/blob');
  await put(PATH,JSON.stringify(data),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});
}
async function readEditorialSchedule(){
  const path='lucas/sponsor-operations-v1.json';
  try{
    const {list,get}=await import('@vercel/blob');
    const listing=await list({prefix:path,limit:10});
    if(!listing.blobs?.some(x=>x.pathname===path))return [];
    const file=await get(path,{access:'private'});
    if(!file?.stream)return [];
    const record=JSON.parse(await new Response(file.stream).text());
    return (Array.isArray(record.activities)?record.activities:[])
      .filter(x=>['story','reel','post'].includes(x.type)&&PARTNERS.includes(x.partner)&&/^20\d{2}-\d{2}-\d{2}$/.test(x.date||''))
      .map(x=>({date:x.date,partner:x.partner,type:x.type,status:x.status||'planejado',collab:x.collab===true}))
      .sort((a,b)=>a.date.localeCompare(b.date)).slice(-180);
  }catch(err){console.error('Schedule unavailable',err?.message);return [];}
}
/* Somente agregados confirmados; nunca devolve nomes de compradores, pedidos, senhas ou fontes internas. */
async function readImpactSummary(){
 const {get}=await import('@vercel/blob');
 async function getPrivate(path,fallback){
  try{
   const item=await get(path,{access:'private'});
   return item?.stream?JSON.parse(await new Response(item.stream).text()):fallback;
  }catch(e){
   if(/not.found|404|does not exist/i.test(String(e?.message||'')))return fallback;
   throw e;
  }
 }
 const ops=await getPrivate('lucas/sponsor-operations-v1.json',{partners:{},activities:[],social:[]});
 const ids=['oze','didi','guimaraes','realgaucho'];
 const portals=await Promise.all(ids.map(id=>getPrivate('lucas/partner-portal-'+id+'-v1.json',{offer:null,results:[]})));
 const sum=(a,key)=>a.reduce((n,item)=>n+Math.max(0,Number(item[key])||0),0);
 const included=x=>['publicado','confirmado'].includes(x.status);
 return ids.map((id,i)=>{
  const events=(Array.isArray(ops.activities)?ops.activities:[]).filter(x=>x.partner===id);
  const media=events.filter(x=>['story','reel','post'].includes(x.type)&&included(x));
  const agencyCoupons=events.filter(x=>['cupom','resgate'].includes(x.type)&&x.status==='confirmado');
  const agencySales=events.filter(x=>x.type==='venda'&&x.status==='confirmado');
  const portal=portals[i];
  const verified=(Array.isArray(portal.results)?portal.results:[]).filter(x=>x.status==='verified');
  const verifiedSales=verified.filter(x=>x.type==='compra');
  const verifiedCoupons=verified.filter(x=>x.type==='cupom');
  const approval=(ops.partners||{})[id];
  const offer=portal.offer?.status==='approved'?portal.offer:approval?.approved?approval:null;
  const snapshots=(Array.isArray(ops.social)?ops.social:[]).filter(x=>x.partner===id&&x.source).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const latest=snapshots.at(-1)||null;
  return {
   id,approved:!!offer,coupon:offer&&typeof offer.coupon==='string'?offer.coupon.slice(0,60):'',
   published:sum(media,'qty')||media.length,
   couponsVerifiedByPartner:sum(verifiedCoupons,'qty'),couponsReportedByAgency:sum(agencyCoupons,'qty'),
   salesVerifiedByPartner:sum(verifiedSales,'qty'),salesReportedByAgency:sum(agencySales,'qty'),
   revenueVerifiedByPartner:sum(verifiedSales,'amount'),revenueReportedByAgency:sum(agencySales,'revenue'),
   hasPartnerVerification:verified.length>0,hasAgencySales:agencySales.length>0,
   reachSnapshot:latest?Math.max(0,Number(latest.reach)||0):null,
   reachDate:latest?.date||null,
   hasSource:!!latest,
   updatedAt:ops.updatedAt||null
  };
 });
}
function reject(res,status,message){return res.status(status).json({error:message})}
function verifyOrigin(req){
  const origin=req.headers.origin,host=req.headers.host;
  return typeof origin==='string'&&['www.futtalento.com.br','futtalento.com.br'].includes(host)&&origin==='https://'+host;
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  const user=authenticate(req)||await approvedGuardian(req);
  if(!user)return reject(res,401,'Entre com a senha temporária ou sua conta autorizada.');
  if(!['GET','POST'].includes(req.method))return reject(res,405,'Método não permitido.');
  if(req.method==='POST'&&!verifyOrigin(req))return reject(res,403,'Origem não autorizada.');
  if(req.method==='POST'&&!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return reject(res,415,'Envie dados JSON.');
  if(req.method==='POST'&&JSON.stringify(req.body||{}).length>12000)return reject(res,413,'Registro muito grande.');
  try{
    const data=await readState();
    if(req.method==='GET')return res.status(200).json({role:isStaff(user)?'agency':'family',user:user.login,data:{...data,schedule:await readEditorialSchedule(),impact:await readImpactSummary().catch(e=>{console.error('Impact summary unavailable',e?.name);return []})}});
    const body=req.body||{};
    if(!Number.isInteger(body.revision)||body.revision!==data.revision)return reject(res,409,'A jornada foi atualizada em outro dispositivo. Recarregue antes de continuar.');
    const action=clip(body.action,50);
    const now=new Date().toISOString();
    if(action==='complete_mission'){
      if(isStaff(user))return reject(res,403,'As missões da família são concluídas pela responsável.');
      const id=clip(body.missionId,60);
      if(!MISSIONS.includes(id))return reject(res,400,'Missão desconhecida.');
      data.missions[id]={done:body.done===true,updatedAt:now};
    }else if(action==='review_draft'){
      if(isStaff(user))return reject(res,403,'A aprovação da publicação cabe à família.');
      const draft=data.drafts.find(x=>x.id===body.draftId);
      if(!draft||draft.status!=='awaiting_review')return reject(res,409,'Publicação não disponível para aprovação.');
      if(body.decision==='approved'&&!draft.previewUrl)return reject(res,409,'A agência precisa anexar a prévia antes da aprovação.');
      if(!['approved','needs_changes'].includes(body.decision))return reject(res,400,'Escolha aprovar ou pedir ajuste.');
      draft.status=body.decision;
      draft.familyNote=clip(body.note,450);
      draft.reviewedAt=now;
    }else if(action==='confirm_benefit'){
      if(isStaff(user))return reject(res,403,'A família deve confirmar o recebimento.');
      const partner=clip(body.partner,60),label=clip(body.description,220),day=isoDate(body.date);
      if(!PARTNERS.includes(partner)||label.length<3||!day)return reject(res,400,'Confira o parceiro, benefício e data.');
      if(data.benefits.length>=150)return reject(res,409,'Limite de registros atingido.');
      data.benefits.push({id:crypto.randomUUID(),partner,description:label,date:day,reportedAt:now,verification:'family_reported'});
    }else if(action==='request_help'){
      if(isStaff(user))return reject(res,403,'Esta opção é destinada à família.');
      const message=clip(body.message,450);
      if(message.length<5)return reject(res,400,'Conte rapidamente do que precisa.');
      if(data.help.length>=100)return reject(res,409,'Limite de solicitações atingido.');
      data.help.push({id:crypto.randomUUID(),message,createdAt:now,status:'new'});
    }else if(action==='staff_draft'){
      if(!isStaff(user))return reject(res,403,'Somente a agência prepara conteúdos.');
      const title=clip(body.title,120),caption=clip(body.caption,1200),partner=clip(body.partner,60);
      const format=clip(body.format,25),date=isoDate(body.date);
      if(title.length<4||caption.length<8||!PARTNERS.includes(partner)||!['story','reel','carrossel'].includes(format)||!date)return reject(res,400,'Preencha o título, texto, parceiro, formato e data.');
      const preview=clip(body.previewUrl,500);
      if(!preview)return reject(res,400,'Inclua uma prévia visual antes de enviar para a família.');
      try{const url=new URL(preview);if(url.protocol!=='https:')throw Error('protocol');}catch{return reject(res,400,'Informe um link de prévia HTTPS válido.');}
      if(data.drafts.length>=100)return reject(res,409,'Limite de publicações atingido.');
      data.drafts.push({id:crypto.randomUUID(),title,caption,partner,format,date,previewUrl:preview,status:'awaiting_review',createdAt:now,familyNote:'',reviewedAt:null});
    }else if(action==='staff_edit_draft'){
      if(!isStaff(user))return reject(res,403,'Somente a agência pode alterar uma peça.');
      const draft=data.drafts.find(x=>x.id===body.draftId);
      if(!draft)return reject(res,404,'Publicação não encontrada.');
      const caption=clip(body.caption,1200),previewUrl=clip(body.previewUrl,500);
      if(caption.length<8||!previewUrl)return reject(res,400,'Informe legenda e link de prévia.');
      try{const url=new URL(previewUrl);if(url.protocol!=='https:')throw Error('protocol');}catch{return reject(res,400,'A prévia precisa usar HTTPS.');}
      draft.caption=caption;draft.previewUrl=previewUrl;
      draft.status='awaiting_review';draft.familyNote='';draft.reviewedAt=null;draft.updatedAt=now;
    }else if(action==='staff_reopen'){
      if(!isStaff(user))return reject(res,403,'Somente a agência pode editar esta etapa.');
      const draft=data.drafts.find(x=>x.id===body.draftId);
      if(!draft)return reject(res,404,'Publicação não encontrada.');
      draft.status='awaiting_review';draft.familyNote='';draft.reviewedAt=null;
    }else if(action==='staff_record_benefit'){
      if(!isStaff(user))return reject(res,403,'Somente a agência registra os apoios nesta etapa.');
      const partner=clip(body.partner,60),description=clip(body.description,220),day=isoDate(body.date);
      if(!PARTNERS.includes(partner)||description.length<3||!day)return reject(res,400,'Confira o apoiador, a descrição e a data.');
      if(data.benefits.length>=150)return reject(res,409,'Limite de registros atingido.');
      data.benefits.push({id:crypto.randomUUID(),partner,description,date:day,reportedAt:now,verification:'verified_by_agency',source:'agency_documented'});
    }else if(action==='staff_verify_benefit'){
      if(!isStaff(user))return reject(res,403,'A validação é exclusiva da agência.');
      const benefit=data.benefits.find(x=>x.id===body.benefitId);
      if(!benefit)return reject(res,404,'Benefício não encontrado.');
      benefit.verification=body.verified===true?'verified_by_agency':'family_reported';
    }else if(action==='staff_resolve_help'){
      if(!isStaff(user))return reject(res,403,'A operação pertence à agência.');
      const issue=data.help.find(x=>x.id===body.helpId);
      if(!issue)return reject(res,404,'Solicitação não encontrada.');
      issue.status='resolved';
    }else return reject(res,400,'Ação não reconhecida.');
    data.revision+=1;
    data.updatedAt=now;
    data.updatedBy=isStaff(user)?'agencia':'responsavel';
    await saveState(data);
    return res.status(200).json({ok:true,revision:data.revision,updatedAt:now});
  }catch(e){
    console.error('Family journey API',e?.message);
    return reject(res,503,'O painel não conseguiu acessar os registros. Tente novamente em instantes.');
  }
}
