import {ACTIONS,validId,validPartner,saveCampaignEvent} from './_campaign-events.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Metodo nao permitido'});
 const host=req.headers.host,origin=req.headers.origin;
 if(!['futtalento.com.br','www.futtalento.com.br'].includes(host)||origin!=='https://'+host)
  return res.status(403).json({error:'Origem nao autorizada'});
 if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))
  return res.status(415).json({error:'Envie JSON'});
 const body=req.body;
 if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>900)
  return res.status(400).json({error:'Evento invalido'});
 const {partner,action,campaign,creative,medium,consent}=body;
 if(consent!==true||!validPartner(partner)||!ACTIONS.has(action)||![campaign,creative,medium].every(validId))
  return res.status(400).json({error:'Evento nao autorizado'});
 try{
  if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({error:'Medicao indisponivel'});
  await saveCampaignEvent({partner,action,campaign,creative,medium});
  return res.status(202).json({ok:true});
 }catch(e){
  console.error('Campaign event unavailable',e?.name);
  return res.status(503).json({error:'Medicao temporariamente indisponivel'});
 }
}
