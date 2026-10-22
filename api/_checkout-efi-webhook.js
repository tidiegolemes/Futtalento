import {enabled,load,refresh,secretDigest,safeEqual} from './_futtalento-efi.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).end();
 const secret=process.env.FUTTALENTO_EFI_WEBHOOK_SECRET||'';
 const received=String(req.query.key||'');
 if(secret.length<32||received.length<32||!safeEqual(secretDigest(secret),secretDigest(received)))return res.status(403).end();
 if(!enabled())return res.status(503).end();
 const list=req.body?.pix;
 if(!Array.isArray(list)||list.length>40)return res.status(400).end();
 for(const item of list){
  const id=String(item?.txid||'');
  if(!/^[a-f0-9]{32}$/.test(id))continue;
  try{const order=await load(id);if(order&&order.status!=='active')await refresh(order);}
  catch(e){console.error('Efí webhook: status recheck failed',e.message);}
 }
 return res.status(200).json({ok:true});
}
