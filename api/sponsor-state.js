import {authenticate} from './_sponsor-auth.js';
const PATH='lucas/sponsor-operations-v1.json';
const allowed=['guimaraes','didi','oze','realgaucho'];
const clipped=(v,max=400)=>typeof v==='string'?v.slice(0,max):'';
const cleanNumber=v=>Number.isFinite(+v)?Math.max(0,Math.min(+v,10000000)):0;
const initial=()=>({partners:{},missions:{},activities:[],social:[],updatedAt:null});
async function load(){
const {list,get}=await import('@vercel/blob');
const p=await list({prefix:PATH,limit:10});
if(!(p.blobs||[]).some(x=>x.pathname===PATH))return initial();
const result=await get(PATH,{access:'private'});return result?.stream?JSON.parse(await new Response(result.stream).text()):initial();
}
export default async function handler(req,res){
res.setHeader('Cache-Control','private, no-store');
const user=authenticate(req);
if(!user||user.kind!=='sponsor')return res.status(403).json({error:'Área exclusiva da agência. A conta familiar não acessa registros comerciais administrativos.'});
if(req.method==='GET'){try{return res.status(200).json({data:await load(),user:user.login})}catch(e){console.error('sponsor store read',e?.message);return res.status(503).json({error:'Dados temporariamente indisponíveis'})}}
if(req.method!=='POST')return res.status(405).end();
const origin=req.headers.origin;
if(!origin||!['https://www.futtalento.com.br','https://futtalento.com.br'].includes(origin)||new URL(origin).host!==req.headers.host)return res.status(403).json({error:'Origem inválida'});
const raw=req.body;if(!raw||typeof raw!=='object'||JSON.stringify(raw).length>130000)return res.status(400).json({error:'Registros inválidos'});
const partners={},missions={};
for(const id of allowed){const p=raw.partners?.[id]||{};partners[id]={kind:clipped(p.kind,100),offer:clipped(p.offer,400),coupon:clipped(p.coupon,60),validity:clipped(p.validity,120),frequency:clipped(p.frequency,200),notes:clipped(p.notes,800),approved:!!p.approved};}
for(const [key,v] of Object.entries(raw.missions||{})){if(!/^[a-z0-9_-]{1,70}$/.test(key))continue;missions[key]={done:!!v.done,note:clipped(v.note,400)}}
const activities=Array.isArray(raw.activities)?raw.activities.slice(-220).map(a=>({id:clipped(a.id,80),date:clipped(a.date,10),partner:allowed.includes(a.partner)?a.partner:'',type:['story','reel','post','entrega','cupom','resgate','venda'].includes(a.type)?a.type:'post',status:['planejado','em_producao','aguardando_autorizacao','pronto','agendado','publicado','confirmado'].includes(a.status)?a.status:'planejado',channel:['instagram-lucas','instagram-futtalento'].includes(a.channel)?a.channel:'instagram-futtalento',collab:a.collab===true,material:['pendente','solicitado','recebido','aprovado'].includes(a.material)?a.material:'pendente',source:clipped(a.source,300),qty:cleanNumber(a.qty),revenue:cleanNumber(a.revenue),note:clipped(a.note,500)})):[];
const social=Array.isArray(raw.social)?raw.social.slice(-100).map(s=>({date:clipped(s.date,10),partner:allowed.includes(s.partner)?s.partner:'',followers:cleanNumber(s.followers),reach:cleanNumber(s.reach),visits:cleanNumber(s.visits),channel:['instagram-lucas','instagram-futtalento'].includes(s.channel)?s.channel:'historico-nao-classificado',scope:['post','periodo'].includes(s.scope)?s.scope:'periodo',postUrl:clipped(s.postUrl,300),source:clipped(s.source,300)})):[];
const data={version:1,partners,missions,activities,social,updatedAt:new Date().toISOString(),updatedBy:user.login};
try{const {put}=await import('@vercel/blob');await put(PATH,JSON.stringify(data),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});return res.status(200).json({ok:true,updatedAt:data.updatedAt})}catch(e){console.error('sponsor store write',e?.message);return res.status(503).json({error:'Não foi possível salvar'})}
}
