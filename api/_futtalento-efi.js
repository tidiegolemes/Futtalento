import https from 'node:https';
import crypto from 'node:crypto';
export const PLANS=Object.freeze({
  'primeiro-passe':{title:'Primeiro Passe',cents:9900,monthly:true},
  'time-titular':{title:'Time Titular',cents:24900,monthly:true},
  'camisa-10':{title:'Camisa 10',cents:49900,monthly:true}
});
export const ATHLETES=Object.freeze({lucas:'Lucas Azambuja',ryan:'Ryan Coelho',thalles:'Thalles Silvino'});
export const prefix='futtalento/pix-checkout/v1/';
export const operator='EyAgência';
export const paymentTenant='FutTalento';
export const registered=(req)=>['futtalento.com.br','www.futtalento.com.br'].includes(req.headers.host);
export const originOK=(req)=>registered(req)&&req.headers.origin==='https://'+req.headers.host;
export const text=(v,n)=>typeof v==='string'?v.trim().replace(/\s+/g,' ').slice(0,n):'';
export const secretDigest=(token)=>crypto.createHash('sha256').update(String(token)).digest('hex');
export const safeEqual=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function enabled(){
  return ['production','homologation'].includes(process.env.FUTTALENTO_EFI_ENV)
    &&process.env.FUTTALENTO_PIX_ENABLED==='true'
    &&!!process.env.FUTTALENTO_EFI_CLIENT_ID
    &&!!process.env.FUTTALENTO_EFI_CLIENT_SECRET
    &&!!process.env.FUTTALENTO_EFI_PIX_KEY
    &&!!process.env.FUTTALENTO_EFI_P12_BASE64
    &&!!process.env.BLOB_READ_WRITE_TOKEN;
}
export function formatAmount(cents){return (cents/100).toFixed(2);}
export function publicOrder(data){return {id:data.id,plan:data.plan,planTitle:PLANS[data.plan]?.title,athlete:ATHLETES[data.athlete],amount:formatAmount(data.cents),status:(data.status==='active'&&Date.parse(data.activeUntil)<=Date.now()?'expired':data.status),createdAt:data.createdAt,activeUntil:data.activeUntil||null,pix:data.pix||null,company:data.company};}
export async function load(id){
 const {get}=await import('@vercel/blob');
 const obj=await get(prefix+id+'.json',{access:'private'}).catch(()=>null);
 return obj?.stream?JSON.parse(await new Response(obj.stream).text()):null;
}
export async function save(order){
 const {put}=await import('@vercel/blob');
 await put(prefix+order.id+'.json',JSON.stringify(order),{access:'private',contentType:'application/json',allowOverwrite:true,addRandomSuffix:false});
}
function requestRaw(path,method,token,body){
 const cert=Buffer.from(process.env.FUTTALENTO_EFI_P12_BASE64||'','base64');
 const agent=new https.Agent({pfx:cert,passphrase:process.env.FUTTALENTO_EFI_P12_PASSWORD||'',keepAlive:false});
 const host=process.env.FUTTALENTO_EFI_ENV==='production'?'pix.api.efipay.com.br':'pix-h.api.efipay.com.br';
 const bytes=body===undefined?undefined:Buffer.from(JSON.stringify(body));
 return new Promise((resolve,reject)=>{
  const req=https.request({hostname:host,path,method,agent,timeout:14000,headers:{Authorization:token,'Content-Type':'application/json',Accept:'application/json',...(bytes?{'Content-Length':bytes.length}:{})}},res=>{
   let result='';res.on('data',d=>{result+=d;if(result.length>150000)req.destroy(new Error('Resposta excedeu limite'));});
   res.on('end',()=>{let parsed;try{parsed=JSON.parse(result)}catch{parsed={}};if(res.statusCode>=200&&res.statusCode<300)return resolve(parsed);reject(new Error('Efí retornou HTTP '+res.statusCode));});
  });req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('Timeout Efí')));if(bytes)req.write(bytes);req.end();
 });
}
export async function efi(path,method='GET',payload){
 if(!enabled())throw new Error('Pix ainda não está habilitado para esta loja');
 const auth='Basic '+Buffer.from(process.env.FUTTALENTO_EFI_CLIENT_ID+':'+process.env.FUTTALENTO_EFI_CLIENT_SECRET).toString('base64');
 const granted=await requestRaw('/oauth/token','POST',auth,{grant_type:'client_credentials'});
 if(!granted.access_token)throw new Error('Autorização Efí indisponível');
 return requestRaw(path,method,'Bearer '+granted.access_token,payload);
}
export async function refresh(order){
 if(order.status==='active')return order;
 const result=await efi('/v2/cob/'+order.txid,'GET');
 const pix=Array.isArray(result.pix)?result.pix:[];
 const verified=result.txid===order.txid&&result.status==='CONCLUIDA'
  &&result.valor?.original===formatAmount(order.cents)
  &&pix.some(x=>x.txid===order.txid&&x.valor===formatAmount(order.cents)&&typeof x.endToEndId==='string');
 if(verified){
  order.status='active';
  const payment=pix.find(x=>x.txid===order.txid&&x.valor===formatAmount(order.cents));
  const paidTime=Date.parse(payment?.horario||'');
  if(!Number.isFinite(paidTime))throw new Error('Efí não forneceu horário válido');
  order.paidAt=new Date(paidTime).toISOString();
  order.activeUntil=new Date(paidTime+30*86400000).toISOString();
  order.paymentId=payment.endToEndId;
  await save(order);
 }
 return order;
}
