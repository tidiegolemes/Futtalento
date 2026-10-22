import {authenticate} from './_sponsor-auth.js';
import {ATHLETES,FIELDS,calculateIndex} from '../indice/score.js';
const PREFIX='futtalento/indice/v1/';
const SOURCES=['instagram_insights','relatorio_autorizado','gestao_interna'];
const error=(res,code,msg)=>res.status(code).json({ok:false,error:msg});
async function read(id){
 try{
  const {get}=await import('@vercel/blob');
  const b=await get(PREFIX+id+'.json',{access:'private'});
  if(!b?.stream)return null;
  return JSON.parse(await new Response(b.stream).text());
 }catch(e){
  if(/not.found|404|does not exist/i.test(String(e?.message||'')))return null;
  throw e;
 }
}
function publicSnapshot(record,now){
 const score=calculateIndex(record,now);
 // Public metrics are rounded aggregates, never a token, raw source document or guardian data.
 const metrics=record?.publicApproved?score.metrics:null;
 return {athlete:record?.athlete||null,index:{version:score.version,value:record?.publicApproved?score.value:null,level:record?.publicApproved?score.level:'Em formação',coverage:record?.publicApproved?score.coverage:0,status:record?.publicApproved?score.status:'dados_em_formacao',observedAt:record?.publicApproved?score.observedAt:null,components:record?.publicApproved?score.components:null},metrics};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store,max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 const id=String(req.query?.atleta||'');
 if(req.method==='GET'){
  if(!ATHLETES.includes(id)&&id!=='todos')return error(res,400,'Atleta inválido');
  try{
   if(id==='todos'){
    const data=await Promise.all(ATHLETES.map(async athlete=>publicSnapshot((await read(athlete))||{athlete},Date.now())));
    return res.status(200).json({ok:true,athletes:data});
   }
   return res.status(200).json({ok:true,...publicSnapshot((await read(id))||{athlete:id},Date.now())});
  }catch(e){console.error('Indice fetch failed',e?.name);return error(res,503,'Índice temporariamente indisponível');}
 }
 if(req.method!=='POST')return error(res,405,'Método não permitido');
 const user=authenticate(req);
 if(!user||user.kind!=='sponsor')return error(res,401,'Acesso restrito à agência');
 const host=req.headers.host,origin=req.headers.origin;
 if(!['www.futtalento.com.br','futtalento.com.br'].includes(host)||origin!=='https://'+host)return error(res,403,'Origem inválida');
 if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return error(res,415,'Formato inválido');
 const body=req.body;
 if(!body||typeof body!=='object'||JSON.stringify(body).length>5000)return error(res,400,'Dados inválidos');
 if(!ATHLETES.includes(body.athlete)||!SOURCES.includes(body.source))return error(res,400,'Atleta ou origem inválidos');
 const date=Date.parse(body.observedAt);
 if(!Number.isFinite(date)||date>Date.now()+172800000||date<Date.now()-365*86400000)return error(res,400,'Data de referência inválida');
 if(typeof body.reference!=='string'||body.reference.trim().length<8||body.reference.length>160)return error(res,400,'Informe a referência do relatório ou registro de origem');
 if(body.publicApproved!==true||body.guardianOrAgentAuthorized!==true)return error(res,400,'A divulgação exige confirmação de autorização e conferência pela agência');
 const raw=body.metrics;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!FIELDS.includes(k)))return error(res,400,'Indicadores inválidos');
 const max={reach28d:500000000,followers:500000000,interactions28d:500000000,growth28dPct:500,
 titlesVerified:100,competitionsVerified:200,clubMonths:300,partnersActive:500,deliveriesCompleted:50000};
 const metrics={};
 for(const key of FIELDS){
  const v=raw[key];
  if(v===null||v===undefined||v===''){metrics[key]=null;continue}
  if(typeof v!=='number'||!Number.isFinite(v)||(key==='growth28dPct'?v< -100:v<0)||v>max[key]||(key!=='growth28dPct'&&!Number.isSafeInteger(v)))return error(res,400,'Valor inválido para '+key);
  metrics[key]=v;
 }
 if(FIELDS.every(key=>metrics[key]===null))return error(res,400,'Preencha pelo menos um indicador');
 if(metrics.interactions28d!==null&&metrics.reach28d!==null&&metrics.interactions28d>metrics.reach28d*12)return error(res,400,'Interações incompatíveis com alcance informado');
 try{
  const original=await read(body.athlete);
  const snapshot={athlete:body.athlete,metrics,observedAt:new Date(date).toISOString().slice(0,10),source:body.source,
   reference:body.reference.trim(),publicApproved:true,updatedAt:new Date().toISOString(),updatedBy:user.login,
   history:[...(original?.history||[]),...(original?[{observedAt:original.observedAt,metrics:original.metrics,updatedAt:original.updatedAt}]:[])].slice(-12)};
  const {put}=await import('@vercel/blob');
  await put(PREFIX+body.athlete+'.json',JSON.stringify(snapshot),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});
  return res.status(200).json({ok:true,...publicSnapshot(snapshot,Date.now())});
 }catch(e){console.error('Indice save failed',e?.name);return error(res,503,'Não foi possível gravar os indicadores');}
}
