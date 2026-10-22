import {ATHLETE_SOURCES,extractSports} from '../indice/auto-sources.js';
const waitMs=6500;
async function getPage(url){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),waitMs);
 try{
  const r=await fetch(url,{redirect:'error',signal:controller.signal,headers:{Accept:'text/html','User-Agent':'FutTalento-Metrics/1.0 (+https://www.futtalento.com.br/metodologia.html)'}});
  if(!r.ok)throw new Error('Fonte retornou HTTP '+r.status);
  if(!String(r.headers.get('content-type')||'').includes('text/html'))throw new Error('Formato inesperado');
  const length=Number(r.headers.get('content-length')||0);
  if(length>650000)throw new Error('Página maior que o limite');
  const html=await r.text();
  if(html.length>650000)throw new Error('Página maior que o limite');
  return html;
 }finally{clearTimeout(timeout);}
}
const names={lucas:'LUCAS',ryan:'RYAN',thalles:'THALLES'};
const GRAPH_HOSTS=new Set(['graph.facebook.com','graph.instagram.com']);
async function graphRequest(host,path,token,query){
 const url=new URL('https://'+host+'/v24.0/'+path);
 for(const [k,v] of Object.entries(query||{}))url.searchParams.set(k,v);
 // Meta accepts access token as a request parameter; never include the token in returned diagnostics.
 url.searchParams.set('access_token',token);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5500);
 try{
  const r=await fetch(url.toString(),{signal:controller.signal,redirect:'error',headers:{Accept:'application/json'}});
  const json=await r.json();
  if(!r.ok||json?.error)throw Error('Graph API indisponível ou autorização insuficiente');
  return json;
 }finally{clearTimeout(timeout);}
}
function metricValue(json,name){
 const row=json?.data?.find?.(x=>x.name===name);
 const value=row?.total_value?.value ?? (Array.isArray(row?.values)?row.values.at(-1)?.value:null);
 return Number.isSafeInteger(value)&&value>=0?value:null;
}
export async function fetchAuthorizedInstagram(athlete){
 const id=names[athlete];if(!id)return {status:'nao_configurado',metrics:{},source:null};
 const user=process.env['FUTTALENTO_IG_'+id+'_USER_ID'];
 const token=process.env['FUTTALENTO_IG_'+id+'_ACCESS_TOKEN'];
 if(!user||!token)return {status:'nao_configurado',metrics:{},source:null};
 if(!/^[0-9]{5,35}$/.test(user))return {status:'configuracao_invalida',metrics:{},source:null};
 const host=GRAPH_HOSTS.has(process.env.FUTTALENTO_IG_GRAPH_HOST)?process.env.FUTTALENTO_IG_GRAPH_HOST:'graph.facebook.com';
 try{
  const account=await graphRequest(host,user,token,{fields:'id,username,followers_count'});
  const followers=Number.isSafeInteger(account.followers_count)&&account.followers_count>=0?account.followers_count:null;
  const metrics={followers};
  // Account-level Insights must be from the connected professional account, not a public scrape.
  const errors=[];
  for(const key of ['reach','total_interactions']){
   try{
    const to=Math.floor(Date.now()/1000),from=to-28*86400;
    const result=await graphRequest(host,user+'/insights',token,{metric:key,period:'day',metric_type:'total_value',since:String(from),until:String(to)});
    const v=metricValue(result,key);
    if(v!==null)metrics[key==='reach'?'reach28d':'interactions28d']=v;
   }catch{errors.push(key);}
  }
  return {status:errors.length?'conectado_parcial':'conectado',metrics,
   source:'Instagram Insights API · '+String(account.username||'conta autorizada').slice(0,45),
   checkedAt:new Date().toISOString(),unavailable:errors};
 }catch{
  return {status:'falha_permissao_ou_api',metrics:{},source:null};
 }
}
export async function buildAutoSuggestions(athlete){
 const cfg=ATHLETE_SOURCES[athlete];
 if(!cfg)throw Error('Atleta inválido');
 const [site,ig]=await Promise.allSettled([getPage(cfg.url),fetchAuthorizedInstagram(athlete)]);
 const report={athlete,checkedAt:new Date().toISOString(),source:cfg.url,sourceLabel:cfg.label,
  sports:null,instagram:null,metrics:{},provenance:{},warnings:[]};
 if(site.status==='fulfilled'){
  const parsed=extractSports(athlete,site.value,report.checkedAt.slice(0,10));
  report.sports=parsed;
  for(const [k,v] of Object.entries(parsed.metrics)){
   if(v!==null){report.metrics[k]=v;report.provenance[k]={url:cfg.url,label:cfg.label,checkedAt:report.checkedAt,events:parsed.events.filter(e=>k==='titlesVerified'?e.title:true).map(e=>e.id)};}
  }
 }else{report.warnings.push('Site oficial indisponível nesta consulta; nenhum dado esportivo foi inferido.');}
 if(ig.status==='fulfilled'){
  report.instagram=ig.value;
  for(const [k,v] of Object.entries(ig.value.metrics||{})){
   if(v!==null&&Number.isFinite(v)){report.metrics[k]=v;report.provenance[k]={label:ig.value.source,checkedAt:report.checkedAt,method:'Meta Graph API autorizada'};}
  }
 }else{report.instagram={status:'nao_configurado',metrics:{}};}
 return report;
}
