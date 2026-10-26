import {authenticate} from './_sponsor-auth.js';
import {ATHLETES,FIELDS,calculateIndex} from '../indice/score.js';
import {calculateSponsorPotential,POTENTIAL_VERSION} from '../indice/sponsor-potential-v2.js';
import {fetchAuthorizedInstagram} from './_indice-sources.js';
import {buildAutoSuggestions} from './_indice-sources.js';
import {getLucasEvidence} from '../indice/lucas-public.js';
import {getOtherAthleteEvidence} from '../indice/other-athletes-public.js';
const PREFIX='futtalento/indice/v1/';
const V2_PREFIX='futtalento/indice/v2/';
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
async function readPotential(id){
 try{
  const {get}=await import('@vercel/blob');
  const blob=await get(V2_PREFIX+id+'.json',{access:'private'});
  if(!blob?.stream)return null;
  const value=JSON.parse(await new Response(blob.stream).text());
  return value?.athlete===id&&value?.schemaVersion===POTENTIAL_VERSION?value:null;
 }catch(e){
  if(/not.found|404|does not exist/i.test(String(e?.message||'')))return null;
  throw e;
 }
}
function approvedPotential(record,now){
 const isApproved=record?.publicApproved===true;
 const result=isApproved?calculateSponsorPotential(record,now):null;
 const show=result?.status==='validated'&&isApproved;
 return {version:POTENTIAL_VERSION,
  value:show?result.value:null,
  status:result?.status||'awaiting_verified_sources',
  coverage:isApproved?result.coverage:0,
  components:isApproved?result.components:null,
  observedAt:isApproved?record.observedAt:null,
  note:'Potencial de parceria; não é avaliação técnica ou promessa de resultado.'};
}
function publicSnapshot(record,now,evidence=null,potentialRecord=null){
 const score=calculateIndex(record,now);
 // Public metrics are rounded aggregates, never a token, raw source document or guardian data.
 const metrics=record?.publicApproved?score.metrics:null;
 return {athlete:record?.athlete||null,potential:approvedPotential(potentialRecord,now),index:{version:score.version,value:record?.publicApproved?score.value:null,level:record?.publicApproved?score.level:'Em formação',coverage:record?.publicApproved?score.coverage:0,status:record?.publicApproved?score.status:'dados_em_formacao',observedAt:record?.publicApproved?score.observedAt:null,components:record?.publicApproved?score.components:null},metrics,evidence};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store,max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 const id=String(req.query?.atleta||'');
 if(req.method==='GET'){
  if(req.query?.mode==='autofill'){
   const user=authenticate(req);
   if(!user||user.kind!=='sponsor')return error(res,401,'Acesso exclusivo da agência');
   if(!ATHLETES.includes(id))return error(res,400,'Atleta inválido');
   try{
    const suggestions=await buildAutoSuggestions(id);
    const current=await read(id);
    const currentMetrics=current?.metrics||{};
    let lastAutomation=null;
    try{
      const {get}=await import('@vercel/blob');
      const stored=await get('futtalento/indice/automation/v1/'+id+'.json',{access:'private'});
      if(stored?.stream)lastAutomation=JSON.parse(await new Response(stored.stream).text());
    }catch(e){
      if(!/not.found|404|does not exist/i.test(String(e?.message||'')))
       console.error('Index automation status unavailable',e?.name);
    }
    // Merging is preview-only. Existing validated numbers are never overwritten without authorization.
    const proposed={...currentMetrics};
    for(const [key,value] of Object.entries(suggestions.metrics))
     if(FIELDS.includes(key)&&value!==null&&value!==undefined)proposed[key]=value;
    return res.status(200).json({ok:true,suggestions,current:current?{metrics:current.metrics,observedAt:current.observedAt,source:current.source,reference:current.reference,publicApproved:!!current.publicApproved,
     automaticUpdatesAuthorized:current.automaticUpdatesAuthorized===true}:null,
     lastAutomation,preview:calculateIndex({metrics:proposed,observedAt:new Date().toISOString().slice(0,10)})});
   }catch(e){console.error('Index official source refresh failed',e?.name);return error(res,503,'Falha temporária na busca de fontes');}
  }
  if(!ATHLETES.includes(id)&&id!=='todos')return error(res,400,'Atleta inválido');
  try{
   if(id==='todos'){
    const snapshots=await Promise.all(ATHLETES.map(async athlete=>{
      const [record,evidence,potential]=await Promise.all([
        read(athlete),
        athlete==='lucas'?getLucasEvidence():getOtherAthleteEvidence(athlete),
        readPotential(athlete)
      ]);
      return publicSnapshot(record||{athlete},Date.now(),evidence,potential);
    }));
    const data=snapshots;
    return res.status(200).json({ok:true,athletes:data});
   }
   const [record,evidence,potential]=await Promise.all([
     read(id),
     id==='lucas'?getLucasEvidence():getOtherAthleteEvidence(id),
     readPotential(id)
   ]);
   return res.status(200).json({ok:true,...publicSnapshot(record||{athlete:id},Date.now(),evidence,potential)});
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
 // A versão 2.0 não reaproveita nem reinterpreta os registros v1. É opt-in,
 // exige verificação efetiva da API Meta e aprovação humana da agência.
 if(req.query?.mode==='potential-v2'){
  if(body.mode!=='potential-v2'||!ATHLETES.includes(body.athlete)||
    body.guardianOrAgentAuthorized!==true||body.publicApproved!==true||
    typeof body.reference!=='string'||body.reference.trim().length<12||body.reference.length>180)
   return error(res,400,'Índice 2.0 exige referência e autorização do responsável');
  const observed=Date.parse(body.observedAt);
  if(!Number.isFinite(observed)||observed>Date.now()||Date.now()-observed>35*86400000)
   return error(res,400,'Use medições recentes de até 35 dias');
  const names=['reach28d','followers','growth28dPct','interactions28d','posts28d','titlesVerified','competitionsVerified','clubMonths'];
  const metrics=body.metrics;
  if(!metrics||typeof metrics!=='object'||Array.isArray(metrics)||
     Object.keys(metrics).length!==names.length||
     names.some(k=>!Object.hasOwn(metrics,k)||typeof metrics[k]!=='number'||!Number.isFinite(metrics[k])))
   return error(res,400,'É necessário preencher os oito indicadores medidos sem estimativas');
  if(names.some(k=>k!=='growth28dPct'&&(!Number.isSafeInteger(metrics[k])||metrics[k]<0))||
    metrics.growth28dPct< -100||metrics.growth28dPct>500||
    metrics.reach28d>500000000||metrics.followers>500000000||
    metrics.interactions28d>500000000||metrics.posts28d>100||
    metrics.titlesVerified>100||metrics.competitionsVerified>200||metrics.clubMonths>300)
   return error(res,400,'Há valores fora dos limites permitidos');
  const activation=body.activation;
  if(!activation||['approvedProfile','guardianConsent','trackingReady'].some(k=>activation[k]!==true))
   return error(res,400,'Perfil, responsável e rastreamento devem estar revisados');
  // Impedir marcação manual de alcance, interações ou seguidores como autenticados.
  // A fonte real deve responder agora com os três valores idênticos.
  const ig=await fetchAuthorizedInstagram(body.athlete);
  if(ig.status!=='conectado'||['reach28d','followers','interactions28d'].some(k=>ig.metrics?.[k]!==metrics[k]))
   return error(res,409,'Conecte a conta Meta oficial e atualize as três métricas autenticadas');
  const sport=body.athlete==='lucas'?await getLucasEvidence():await getOtherAthleteEvidence(body.athlete);
  if(!sport||['titlesVerified','competitionsVerified','clubMonths'].some((key,i)=>
      sport.sports?.[['titlesDocumented','competitionsDocumented','clubMonthsDocumented'][i]]!==metrics[key]))
   return error(res,409,'Revise o histórico esportivo com fontes verificáveis antes de aprovar');
  const snapshot={schemaVersion:POTENTIAL_VERSION,athlete:body.athlete,
   metrics,activation:{approvedProfile:true,guardianConsent:true,trackingReady:true},
   cohortYear:sport.cohortYear??null,
   observedAt:new Date(observed).toISOString().slice(0,10),
   provenance:{audience:'meta_insights_authorized',sports:'athlete_records_reviewed',activation:'agency_checked'},
   reference:body.reference.trim(),publicApproved:true,
   guardianOrAgentAuthorized:true,updatedAt:new Date().toISOString(),updatedBy:user.login};
  const result=calculateSponsorPotential(snapshot,Date.now());
  if(result.status!=='validated'||result.value===null)return error(res,409,'Dados insuficientes para publicar Potencial 2.0');
  try{
   const {put}=await import('@vercel/blob');
   await put(V2_PREFIX+body.athlete+'.json',JSON.stringify(snapshot),{
    access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'
   });
   return res.status(200).json({ok:true,potential:approvedPotential(snapshot,Date.now())});
  }catch(e){console.error('Potential v2 save failed',e?.name);return error(res,503,'Não foi possível salvar o Índice 2.0');}
 }

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
   reference:body.reference.trim(),publicApproved:true,
   automaticUpdatesAuthorized:body.automaticUpdatesAuthorized===true,
   updatedAt:new Date().toISOString(),updatedBy:user.login,
   history:[...(original?.history||[]),...(original?[{observedAt:original.observedAt,metrics:original.metrics,updatedAt:original.updatedAt}]:[])].slice(-12)};
  const {put}=await import('@vercel/blob');
  await put(PREFIX+body.athlete+'.json',JSON.stringify(snapshot),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});
  return res.status(200).json({ok:true,...publicSnapshot(snapshot,Date.now())});
 }catch(e){console.error('Indice save failed',e?.name);return error(res,503,'Não foi possível gravar os indicadores');}
}
