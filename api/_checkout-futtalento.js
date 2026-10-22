import checkoutAdmin from './_checkout-admin.js';
import checkoutWebhook from './_checkout-efi-webhook.js';
import crypto from 'node:crypto';
import {signed,verify,cookie,authenticate} from './_sponsor-auth.js';
import {PLANS,ATHLETES,originOK,registered,text,enabled,efi,checkEfiConnectivity,save,load,refresh,publicOrder,secretDigest,safeEqual,formatAmount} from './_futtalento-efi.js';
export default async function handler(req,res){
 if(req.query.mode==='storage-health'){
  res.setHeader('Cache-Control','private,no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Método não permitido'});
  if(!registered(req))return res.status(403).json({ok:false,error:'Domínio não autorizado'});
  const user=authenticate(req);
  if(!user||user.kind!=='sponsor')return res.status(403).json({ok:false,error:'Acesso restrito à agência'});
  if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({ok:false,stage:'configuration',error:'Armazenamento privado não configurado'});
  const path='futtalento/health/temporary-'+crypto.randomBytes(12).toString('hex')+'.json';
  try{
   const {put,get,del}=await import('@vercel/blob');
   const expected=crypto.randomBytes(16).toString('hex');
   await put(path,JSON.stringify({check:expected}),{access:'private',contentType:'application/json',addRandomSuffix:false});
   const record=await get(path,{access:'private'});
   const value=record?.stream?JSON.parse(await new Response(record.stream).text()):null;
   const ok=value?.check===expected;
   await del(path).catch(()=>{});
   return res.status(ok?200:503).json(ok?{ok:true,storage:'private',read:'ok',write:'ok'}:{ok:false,stage:'read',error:'Falha na leitura de teste'});
  }catch(e){
   console.error('FutTalento private Blob check:',e?.name,e?.message);
   return res.status(503).json({ok:false,stage:'storage',error:'Armazenamento privado indisponível',category:String(e?.name||'BlobError').slice(0,45)});
  }
 }
 if(req.query.mode==='health'){
  res.setHeader('Cache-Control','private,no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Método não permitido'});
  if(!registered(req))return res.status(403).json({ok:false,error:'Domínio não autorizado'});
  const user=authenticate(req);
  if(!user||user.kind!=='sponsor')return res.status(403).json({ok:false,error:'Acesso reservado à agência'});
  const result=await checkEfiConnectivity();
  return res.status(result.ok?200:503).json(result);
 }

 if(req.query.mode==='admin')return checkoutAdmin(req,res);
 if(req.query.mode==='webhook')return checkoutWebhook(req,res);
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
   const summary=publicOrder(order);
   if(req.query.mode==='supporter'){
    if(summary.status!=='active')return res.status(402).json({ok:false,status:summary.status,error:summary.status==='expired'?'Seu plano venceu; renove o apoio para continuar.':'O painel só será liberado após a confirmação do Pix.'});
    const details={
      'primeiro-passe':['2 Stories mensais','Identificação como apoiador','Uma ação de cupom ou chamada promocional','Resumo mensal das entregas'],
      'time-titular':['4 Stories mensais','1 publicação no feed','Campanha de cupom/link identificado','Relatório mensal de entregas'],
      'camisa-10':['8 Stories mensais','2 publicações no feed','1 Reel mensal sujeito à aprovação de imagem','Campanha de cupom e relatório mensal']
    };
    return res.status(200).json({ok:true,plan:{name:summary.planTitle,athlete:summary.athlete,company:order.company,amount:summary.amount,startedAt:order.paidAt,activeUntil:order.activeUntil,operator:'EyAgência',deliverables:details[order.plan]||[],status:'active',isPublic:false}});
   }
   return res.status(200).json({ok:true,order:summary});
  }catch(e){console.error('checkout read',e.message);return res.status(503).json({error:'Não foi possível consultar o pedido'});}
 }
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 if(!originOK(req)||!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(403).json({error:'Origem inválida'});
 if(!enabled())return res.status(503).json({error:'Checkout Pix em configuração. Nenhuma cobrança foi criada.'});
 // Segurança de lançamento: enquanto o produto é homologado, somente a agência pode gerar cobranças.
 // A flag do banco sozinha NUNCA libera o checkout publicamente.
 if(process.env.FUTTALENTO_PIX_ACCESS_MODE!=='public'){
  const staff=authenticate(req);
  if(!staff||staff.kind!=='sponsor')return res.status(403).json({error:'Pix em validação. Apenas a agência pode emitir cobranças de teste por enquanto.'});
 }
 const d=req.body||{};if(JSON.stringify(d).length>4000)return res.status(400).json({error:'Dados inválidos'});
 const plan=PLANS[d.plan],athlete=ATHLETES[d.athlete],name=text(d.name,90),company=text(d.company,100),phone=text(d.phone,20).replace(/\D/g,'');
 if(!plan||!athlete||name.length<3||company.length<2||phone.length<10||phone.length>13||d.consent!==true)return res.status(400).json({error:'Confira plano, atleta, dados de contato e autorização de atendimento'});
 const rawCookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ft_support_checkout_cd='));
 const previous=verify(rawCookie?.slice('ft_support_checkout_cd='.length));
 if(previous?.kind==='futtalento-checkout'&&previous.expires>Date.now())return res.status(429).json({error:'Você já solicitou um Pix recentemente. Aguarde um minuto para gerar outro.'});
 if(!process.env.SPONSOR_SESSION_SECRET)return res.status(503).json({error:'Checkout indisponível; proteção antifraude não configurada.'});
 res.setHeader('Set-Cookie',cookie('ft_support_checkout_cd',signed({kind:'futtalento-checkout',expires:Date.now()+60000}),60));
 const id=crypto.randomBytes(16).toString('hex'),token=crypto.randomBytes(32).toString('hex');
 const order={id,txid:id,project:'FutTalento',operator:'EyAgencia',plan:d.plan,athlete:d.athlete,name,company,phone,cents:plan.cents,status:'pending',createdAt:new Date().toISOString(),tokenHash:secretDigest(token),pix:null,activeUntil:null};
 let phase='save-pending';
 try{
  await save(order);
  phase='efi-create-charge';
  const charge=await efi('/v2/cob/'+id,'PUT',{calendario:{expiracao:1800},valor:{original:formatAmount(plan.cents)},chave:process.env.FUTTALENTO_EFI_PIX_KEY,solicitacaoPagador:'FutTalento - '+plan.title+' - 30 dias',infoAdicionais:[{nome:'Projeto',valor:'FutTalento'},{nome:'Operacao',valor:'EyAgencia'}]});
  if(charge.txid!==id||!Number.isSafeInteger(Number(charge.loc?.id)))throw new Error('Efí não retornou localização válida');
  order.bankChargeLocationId=Number(charge.loc.id);
  phase='efi-generate-qrcode';
  const qr=await efi('/v2/loc/'+charge.loc.id+'/qrcode');
  if(typeof qr.qrcode!=='string'||qr.qrcode.length<50)throw new Error('Efí não retornou QR Code');
  let link=null;try{const u=new URL(qr.linkVisualizacao);if(u.protocol==='https:'&&u.hostname.endsWith('.sejaefi.com.br'))link=u.href;}catch{}
  order.pix={copyPaste:qr.qrcode,link,expiresAt:new Date(Date.now()+1800000).toISOString()};
  phase='save-pix';
  await save(order);
  return res.status(201).json({ok:true,token,order:publicOrder(order)});
 }catch(e){
  const providerStatus=(String(e?.message||'').match(/\bHTTP ([45]\d{2})\b/)||[])[1]||null;
  console.error('FutTalento checkout failure',{phase,providerStatus,errorCategory:String(e?.name||'Error').slice(0,60)});
  if(phase!=='save-pending'){
   order.lastFailure={phase,providerStatus,at:new Date().toISOString()};
   await save(order).catch(()=>{});
  }
  return res.status(503).json({error:'Não foi possível emitir o Pix. Nenhum plano foi ativado.',phase,providerStatus});
 }
}
