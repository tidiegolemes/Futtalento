import crypto from 'node:crypto';
import {PLANS,ATHLETES,originOK,registered,text,enabled,efi,save,load,refresh,publicOrder,secretDigest,safeEqual,formatAmount} from './_futtalento-efi.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 if(!registered(req))return res.status(403).json({error:'Domínio não autorizado'});
 if(req.method==='GET'){
  const id=text(req.query.id,35),token=text(req.query.token,130);
  if(!/^[a-f0-9]{32}$/.test(id)||!/^[a-f0-9]{64}$/.test(token))return res.status(400).json({error:'Pedido inválido'});
  try{
   const order=await load(id);
   if(!order||!safeEqual(order.tokenHash,secretDigest(token)))return res.status(404).json({error:'Pedido não encontrado'});
   if(order.status!=='active'&&enabled()){try{await refresh(order);}catch(e){console.error('Efí status:',e.message);}}
   return res.status(200).json({ok:true,order:publicOrder(order)});
  }catch(e){console.error('checkout read',e.message);return res.status(503).json({error:'Não foi possível consultar o pedido'});}
 }
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 if(!originOK(req)||!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(403).json({error:'Origem inválida'});
 if(!enabled())return res.status(503).json({error:'Checkout Pix em configuração. Nenhuma cobrança foi criada.'});
 const d=req.body||{};if(JSON.stringify(d).length>4000)return res.status(400).json({error:'Dados inválidos'});
 const plan=PLANS[d.plan],athlete=ATHLETES[d.athlete],name=text(d.name,90),company=text(d.company,100),phone=text(d.phone,20).replace(/\D/g,'');
 if(!plan||!athlete||name.length<3||company.length<2||phone.length<10||phone.length>13||d.consent!==true)return res.status(400).json({error:'Confira plano, atleta, dados de contato e autorização de atendimento'});
 const id=crypto.randomBytes(16).toString('hex'),token=crypto.randomBytes(32).toString('hex');
 const order={id,txid:id,plan:d.plan,athlete:d.athlete,name,company,phone,cents:plan.cents,status:'pending',createdAt:new Date().toISOString(),tokenHash:secretDigest(token),pix:null,activeUntil:null};
 try{
  await save(order);
  const charge=await efi('/v2/cob/'+id,'PUT',{calendario:{expiracao:1800},valor:{original:formatAmount(plan.cents)},chave:process.env.FUTTALENTO_EFI_PIX_KEY,solicitacaoPagador:'FutTalento - '+plan.title+' - 30 dias'});
  if(charge.txid!==id||!Number.isSafeInteger(Number(charge.loc?.id)))throw new Error('Efí não retornou localização válida');
  const qr=await efi('/v2/loc/'+charge.loc.id+'/qrcode');
  if(typeof qr.qrcode!=='string'||qr.qrcode.length<50)throw new Error('Efí não retornou QR Code');
  let link=null;try{const u=new URL(qr.linkVisualizacao);if(u.protocol==='https:'&&u.hostname.endsWith('.sejaefi.com.br'))link=u.href;}catch{}
  order.pix={copyPaste:qr.qrcode,link,expiresAt:new Date(Date.now()+1800000).toISOString()};
  await save(order);
  return res.status(201).json({ok:true,token,order:publicOrder(order)});
 }catch(e){console.error('Efí checkout:',e.message);return res.status(503).json({error:'Não foi possível emitir o Pix. Nenhuma assinatura foi ativada.'});}
}
