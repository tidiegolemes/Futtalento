import crypto from 'node:crypto';
import {authenticate,authenticatePartner,PARTNER_IDS} from './_sponsor-auth.js';

const PARTNER_PATH=id=>'lucas/partner-portal-'+id+'-v1.json';
const OP_PATH='lucas/sponsor-operations-v1.json';
const FAMILY_PATH='lucas/family-journey-v1.json';
const safe=(v,max=300)=>typeof v==='string'?v.trim().slice(0,max):'';
const positive=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(Number(v),1000000)):0;
const isDate=v=>/^20\d\d-\d\d-\d\d$/.test(v||'');
const defaultData=()=>({revision:0,missions:{},offer:null,results:[],help:[],updatedAt:null});
async function readPrivate(path,fallback){
  const {list,get}=await import('@vercel/blob');
  const items=await list({prefix:path,limit:30});
  if(!items.blobs?.some(x=>x.pathname===path))return fallback;
  const item=await get(path,{access:'private'});
  if(!item?.stream)return fallback;
  return JSON.parse(await new Response(item.stream).text());
}
async function savePrivate(path,content){
  const {put}=await import('@vercel/blob');
  await put(path,JSON.stringify(content),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});
}
function forbidden(res,status,message){return res.status(status).json({error:message})}
function originValid(req){
  const origin=req.headers.origin,host=req.headers.host;
  return typeof origin==='string'&&['www.futtalento.com.br','futtalento.com.br'].includes(host)&&origin==='https://'+host;
}
function safePublicPostUrl(raw){
 try{
  const u=new URL(String(raw||''));
  return u.protocol==='https:'&&/(^|\.)instagram\.com$/.test(u.hostname)&&
   !u.username&&!u.password&&u.href.length<=300?u.href:null;
 }catch{return null}
}
function summarize(id,ops,family){
  const activities=(ops?.activities||[]).filter(a=>a.partner===id)
    .filter(a=>['story','reel','post','cupom','resgate','venda','entrega'].includes(a.type))
    .slice(-100)
    .map(a=>({date:safe(a.date,10),type:safe(a.type,16),status:safe(a.status,30),
      qty:positive(a.qty),channel:safe(a.channel,35),revenue:a.type==='venda'&&a.status==='confirmado'?positive(a.revenue):null,
      // Source and agency notes are not returned: may contain sensitive internal information.
      hasEvidence:!!a.source,postUrl:['story','reel','post'].includes(a.type)?safePublicPostUrl(a.source):null}));
  const confirmed=activities.filter(a=>a.status==='confirmado'||a.status==='publicado');
  const publications=confirmed.filter(a=>['story','reel','post'].includes(a.type)).reduce((s,a)=>s+(a.qty||1),0);
  const publicationsLucas=confirmed.filter(a=>['story','reel','post'].includes(a.type)&&a.channel==='instagram-lucas').reduce((s,a)=>s+(a.qty||1),0);
  const publicationsFutTalento=publications-publicationsLucas;
  const coupons=activities.filter(a=>['cupom','resgate'].includes(a.type)&&a.status==='confirmado').reduce((s,a)=>s+a.qty,0);
  const sales=activities.filter(a=>a.type==='venda'&&a.status==='confirmado').reduce((s,a)=>s+a.qty,0);
  const revenue=activities.filter(a=>a.type==='venda'&&a.status==='confirmado').reduce((s,a)=>s+(a.revenue||0),0);
  const social=(ops?.social||[]).filter(s=>s.partner===id).slice(-40).map(s=>({date:safe(s.date,10),followers:positive(s.followers),reach:positive(s.reach),visits:positive(s.visits),channel:safe(s.channel,35),scope:safe(s.scope,20),postUrl:safe(s.postUrl,300)}));
  const agreement=ops?.partners?.[id]||{};
  const benefits=(family?.benefits||[]).filter(b=>b.partner===id&&b.verification==='verified_by_agency')
    .map(b=>({date:safe(b.date,10),verified:true})).slice(-15);
  return {
    activities,metrics:{publications,publicationsLucas,publicationsFutTalento,coupons,sales,revenue,social,agencyUpdatedAt:ops?.updatedAt||null},
    agreement:agreement.approved?{
      approved:true,kind:safe(agreement.kind,90),offer:safe(agreement.offer,300),
      coupon:safe(agreement.coupon,60),validity:safe(agreement.validity,120),
      frequency:safe(agreement.frequency,200)
    }:{approved:false},
    confirmedBenefitsCount:benefits.length
  };
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  const session=authenticatePartner(req);
  const staff=authenticate(req);
  const agency=staff?.kind==='sponsor';
  if(!session&&!agency)return forbidden(res,401,'Entre com sua senha de apoiador para continuar.');
  if(!['GET','POST'].includes(req.method))return forbidden(res,405,'Método não permitido');
  if(req.method==='POST'&&!originValid(req))return forbidden(res,403,'Origem não autorizada');
  if(req.method==='POST'&&!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return forbidden(res,415,'Envie JSON');
  if(req.method==='POST'&&JSON.stringify(req.body||{}).length>8000)return forbidden(res,413,'Registro muito grande');
  // Partner session completely ignores any caller-supplied partner ID.
  const id=agency?safe(req.method==='GET'?req.query?.partner:req.body?.partner,40):(session?.partner||'');
  if(!PARTNER_IDS.includes(id))return forbidden(res,400,'Escolha um parceiro válido');
  try{
    const path=PARTNER_PATH(id);
    const portal={...defaultData(),...await readPrivate(path,defaultData())};
    if(req.method==='GET'){
      const ops=await readPrivate(OP_PATH,{partners:{},activities:[],social:[]});
      const family=await readPrivate(FAMILY_PATH,{benefits:[]});
      const summary=summarize(id,ops,family);
      return res.status(200).json({role:agency?'agency':'partner',partner:id,
        data:portal,summary});
    }
    const body=req.body||{};
    if(!Number.isInteger(body.revision)||body.revision!==portal.revision)
      return forbidden(res,409,'Os dados mudaram. Atualize a página e tente novamente.');
    const action=safe(body.action,40),now=new Date().toISOString();
    if(action==='acknowledge'){
      if(!session)return forbidden(res,403,'Missão do apoiador');
      portal.missions.acknowledged=body.done===true;
    }else if(action==='submit_offer'){
      if(!session)return forbidden(res,403,'Somente o apoiador propõe sua oferta');
      const offer=safe(body.offer,400),validity=safe(body.validity,160),
        coupon=safe(body.coupon,60),support=safe(body.support,220);
      if(offer.length<8||validity.length<5||support.length<4)
        return forbidden(res,400,'Descreva o benefício, a validade e como a empresa apoia o Lucas.');
      if(portal.offer){
        portal.offerHistory=Array.isArray(portal.offerHistory)?portal.offerHistory.slice(-18):[];
        portal.offerHistory.push(portal.offer);
      }
      portal.offer={offer,validity,coupon,support,status:'pending',reviewNote:'',
        submittedAt:now,reviewedAt:null};
    }else if(action==='report_result'){
      if(!session)return forbidden(res,403,'Somente o apoiador informa os resultados');
      const type=safe(body.type,30),reference=safe(body.reference,100),date=safe(body.date,10),
        qty=positive(body.qty),amount=positive(body.amount);
      if(!['cupom','compra','permuta'].includes(type)||!isDate(date)||!reference||!Number.isInteger(qty)||qty<1||qty>1000)
        return forbidden(res,400,'Confira o tipo, a data, a quantidade e a referência de comprovação.');
      if(type==='compra'&&amount<=0)return forbidden(res,400,'Informe o valor total confirmado das compras.');
      if(portal.results.length>=150)return forbidden(res,409,'Limite de registros alcançado.');
      if(portal.results.some(r=>r.reference===reference&&r.type===type))
        return forbidden(res,409,'Essa referência já foi registrada.');
      portal.results.push({id:crypto.randomUUID(),type,date,qty,amount:type==='compra'?amount:0,
        reference,status:'pending',reviewNote:'',createdAt:now,reviewedAt:null});
    }else if(action==='request_help'){
      if(!session)return forbidden(res,403,'Esta solicitação é do apoiador');
      const message=safe(body.message,350);
      if(message.length<5)return forbidden(res,400,'Explique brevemente o que precisa.');
      if(portal.help.length>=70)return forbidden(res,409,'Limite de mensagens atingido.');
      portal.help.push({id:crypto.randomUUID(),message,status:'new',createdAt:now});
    }else if(action==='agency_review_offer'){
      if(!agency)return forbidden(res,403,'Apenas a agência aprova uma oferta');
      if(!portal.offer)return forbidden(res,404,'Oferta inexistente');
      if(!['approved','needs_changes'].includes(body.decision))return forbidden(res,400,'Decisão inválida');
      portal.offer.status=body.decision;
      portal.offer.reviewNote=safe(body.reviewNote,350);
      portal.offer.reviewedAt=now;
    }else if(action==='agency_review_result'){
      if(!agency)return forbidden(res,403,'Apenas a agência valida resultados');
      const item=portal.results.find(x=>x.id===body.resultId);
      if(!item)return forbidden(res,404,'Registro não encontrado');
      if(!['verified','rejected'].includes(body.decision))return forbidden(res,400,'Decisão inválida');
      item.status=body.decision;item.reviewNote=safe(body.reviewNote,350);item.reviewedAt=now;
    }else if(action==='agency_resolve_help'){
      if(!agency)return forbidden(res,403,'Apenas a agência fecha solicitações');
      const item=portal.help.find(x=>x.id===body.helpId);
      if(!item)return forbidden(res,404,'Solicitação não encontrada');
      item.status='resolved';
    }else return forbidden(res,400,'Ação desconhecida');
    portal.revision++;
    portal.updatedAt=now;
    await savePrivate(path,portal);
    return res.status(200).json({ok:true,revision:portal.revision,updatedAt:now});
  }catch(e){console.error('Partner portal API',e?.message);return forbidden(res,503,'Os dados estão temporariamente indisponíveis. Tente novamente.')}
}
