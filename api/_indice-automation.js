// Atualizacao periodica do Indice FutTalento. Nao concede autorizacao nem gera dados estimados.
import {get,put} from '@vercel/blob';
import {buildAutoSuggestions} from './_indice-sources.js';
import {ATHLETES,FIELDS,calculateIndex} from '../indice/score.js';

const PREFIX='futtalento/indice/v1/';
const STATUS_PREFIX='futtalento/indice/automation/v1/';
const AUDIENCE=['followers','reach28d','interactions28d'];
const SPORT=['titlesVerified','competitionsVerified','clubMonths'];
const MAX={reach28d:500000000,followers:500000000,interactions28d:500000000,
 titlesVerified:100,competitionsVerified:200,clubMonths:300,partnersActive:500,deliveriesCompleted:50000};
const valid=(key,value)=>Number.isSafeInteger(value)&&value>=0&&value<=MAX[key];
const dateOnly=iso=>String(iso||'').slice(0,10);

async function readSnapshot(athlete){
 try{
  const blob=await get(PREFIX+athlete+'.json',{access:'private'});
  return blob?.stream?JSON.parse(await new Response(blob.stream).text()):null;
 }catch(e){
  if(/not.found|404|does not exist/i.test(String(e?.message||'')))return null;
  throw e;
 }
}

export function planAutomaticIndexRefresh(current,suggestions,checkedAt=new Date().toISOString()){
 if(!current?.publicApproved)return {status:'aguardando_aprovacao_inicial'};
 if(current.automaticUpdatesAuthorized!==true)return {status:'aguardando_autorizacao_continua'};
 const ig=suggestions?.instagram;
 if(!['conectado','conectado_parcial'].includes(ig?.status)||
    !AUDIENCE.every(key=>valid(key,ig?.metrics?.[key])))
  return {status:'aguardando_meta_insights'};
 const today=dateOnly(checkedAt);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today)||!Number.isFinite(Date.parse(today)))
  throw new Error('Data de sincronizacao invalida');
 const metrics=Object.fromEntries(FIELDS.map(key=>[key,current.metrics?.[key]??null]));
 for(const key of AUDIENCE)metrics[key]=ig.metrics[key];
 // Crescimento e uma janela movel: nunca reutilizar valor historico como atual.
 metrics.growth28dPct=null;
 const sport=suggestions?.sports?.metrics||{};
 for(const key of SPORT){
  if(!valid(key,sport[key]))continue;
  // Titulos e competicoes representam conquistas documentadas acumuladas.
  // Uma fonte temporariamente incompleta nao apaga marcos ja aprovados.
  metrics[key]=valid(key,metrics[key])?Math.max(metrics[key],sport[key]):sport[key];
 }
 const commercial=suggestions?.commercial;
 // "Apoiadores ativos" so e atual quando o registro operacional esta integrado.
 metrics.partnersActive=commercial?.status==='registros_agencia_aprovados'&&
  valid('partnersActive',commercial?.metrics?.partnersActive)?commercial.metrics.partnersActive:null;
 if(commercial?.status==='registros_agencia_aprovados'&&
    valid('deliveriesCompleted',commercial?.metrics?.deliveriesCompleted)){
  const n=commercial.metrics.deliveriesCompleted;
  metrics.deliveriesCompleted=valid('deliveriesCompleted',metrics.deliveriesCompleted)?
   Math.max(n,metrics.deliveriesCompleted):n;
 }
 const changedFields=FIELDS.filter(key=>metrics[key]!== (current.metrics?.[key]??null));
 if(!changedFields.length&&current.observedAt===today)return {status:'sem_alteracao'};
 const snapshot={
  ...current,metrics,observedAt:today,source:'instagram_insights',
  reference:'Sincronizacao autorizada Meta Graph API + fontes verificadas '+today,
  updatedAt:checkedAt,updatedBy:'automacao_futtalento',
  lastAutomaticUpdateAt:checkedAt,
  automaticUpdatesAuthorized:true,
  history:[...(current.history||[]),
   ...(changedFields.length?[{observedAt:current.observedAt,metrics:current.metrics,updatedAt:current.updatedAt}]:[])
  ].slice(-12)
 };
 // Evita publicar indices em base incoerente mesmo com metricas atuais.
 if(metrics.interactions28d>metrics.reach28d*12)return {status:'inconsistencia_metricas'};
 const index=calculateIndex(snapshot,Date.parse(checkedAt));
 if(index.status==='desatualizado')return {status:'inconsistencia_data'};
 return {status:'atualizado',snapshot,changedFields,indexStatus:index.status};
}

export async function runDailyIndexRefresh(athlete){
 if(!ATHLETES.includes(athlete))throw new Error('Atleta invalido');
 const checkedAt=new Date().toISOString();
 const [current,suggestions]=await Promise.all([readSnapshot(athlete),buildAutoSuggestions(athlete)]);
 const plan=planAutomaticIndexRefresh(current,suggestions,checkedAt);
 const report={
  athlete,checkedAt,status:plan.status,
  instagram:suggestions.instagram?.status||'indisponivel',
  sportEvents:suggestions.sports?.events?.length??0,
  commercial:suggestions.commercial?.status||'indisponivel',
  changedFields:plan.changedFields||[],
  indexStatus:plan.indexStatus||null
 };
 // Grava primeiro os indicadores e so depois marca a execucao como concluida.
 if(plan.snapshot){
  await put(PREFIX+athlete+'.json',JSON.stringify(plan.snapshot),{
   access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'
  });
 }
 await put(STATUS_PREFIX+athlete+'.json',JSON.stringify(report),{
  access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'
 });
 return report;
}
