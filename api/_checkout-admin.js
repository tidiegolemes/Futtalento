import crypto from 'node:crypto';
import {authenticate} from './_sponsor-auth.js';
import {prefix,PLANS,ATHLETES,enabled,refresh,registered,originOK,load,save,secretDigest} from './_futtalento-efi.js';
import {visiblePaymentStatus} from './_futtalento-payment.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const user=authenticate(req);
 if(!user||user.kind!=='sponsor')return res.status(403).json({error:'Acesso exclusivo da agência'});
 if(req.method==='POST'){
  if(!registered(req)||!originOK(req)||!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))
    return res.status(403).json({error:'Origem não autorizada'});
  const input=req.body||{};
  const id=String(input.id||'');
  if(input.action!=='issue_supporter_access'||!/^[a-f0-9]{32}$/.test(id))
    return res.status(400).json({error:'Solicitação inválida'});
  try{
    const order=await load(id);
    if(!order||visiblePaymentStatus(order)!=='active'||!order.paymentId||!order.paidAt||order.project!=='FutTalento')
      return res.status(409).json({error:'Apenas planos do FutTalento com pagamento confirmado podem receber acesso'});
    const token=crypto.randomBytes(32).toString('hex');
    order.agencyAccessTokenHash=secretDigest(token);
    order.agencyAccessIssuedAt=new Date().toISOString();
    await save(order);
    const url='/apoiador/assinatura/?pedido='+encodeURIComponent(id)+'&acesso='+token;
    return res.status(201).json({ok:true,url,company:order.company,validUntil:order.activeUntil});
  }catch(e){
    console.error('Supporter access issuance failed',{name:String(e?.name||'Error').slice(0,50)});
    return res.status(503).json({error:'Não foi possível criar o acesso privado'});
  }
 }
 if(req.method!=='GET')return res.status(405).end();
 try{
  const {list,get}=await import('@vercel/blob');
  const files=await list({prefix,limit:100});
  const records=await Promise.all((files.blobs||[]).map(async entry=>{
   try{const obj=await get(entry.pathname,{access:'private'});if(!obj?.stream)return null;
    const x=JSON.parse(await new Response(obj.stream).text());
    if(x.status==='pending'&&enabled()&&Date.now()-Date.parse(x.createdAt)<36*3600000){try{await refresh(x)}catch(e){console.error('Efí agency reconciliation:',e.message)}}
    return {id:x.id,name:x.name,company:x.company,phone:x.phone,athlete:ATHLETES[x.athlete],plan:PLANS[x.plan]?.title,amount:PLANS[x.plan]?.cents/100,status:visiblePaymentStatus(x),createdAt:x.createdAt,paidAt:x.paidAt||null,activeUntil:x.activeUntil||null};
   }catch{return null}
  }));
  return res.status(200).json({orders:records.filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),hasMore:!!files.cursor});
 }catch(e){console.error('Agency payments list',e.message);return res.status(503).json({error:'Não foi possível consultar os pagamentos'});}
}
