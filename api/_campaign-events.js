import crypto from 'node:crypto';
import {list,put} from '@vercel/blob';

// Pilot: anonymous events after consent. No IP, phone, identity or buyer details.
export const PARTNERS=new Set(['oze','didi','guimaraes','realgaucho']);
export const ACTIONS=new Set(['landing_view','partner_click','whatsapp_click']);
export const SOURCES=new Set(['instagram-lucas','instagram-futtalento','parceiro']);
const PREFIX='futtalento/campaign-events/v1/';
export const validId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9_-]{0,59}$/.test(value);
export const validPartner=value=>PARTNERS.has(value);
export async function saveCampaignEvent({partner,action,campaign,creative,medium,source}){
 const date=new Date().toISOString().slice(0,10);
 const key=[PREFIX+partner,date,action,campaign,creative,medium,source,crypto.randomUUID()+'.txt'].join('/');
 await put(key,'1',{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'text/plain'});
}
export async function campaignSummary(partner){
 const dateFrom=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
 const counts={landing_view:0,partner_click:0,whatsapp_click:0};
 const groups=new Map();
 let cursor,examined=0,truncated=false;
 do{
  const result=await list({prefix:PREFIX+partner+'/',limit:1000,...(cursor?{cursor}:{})});
  for(const file of result.blobs||[]){
   examined++;
   const parts=String(file.pathname||'').split('/');
   if(parts.length!==11||parts[3]!==partner||parts[4]<dateFrom)continue;
   const [action,campaign,creative,medium,source]=parts.slice(5,10);
   if(!ACTIONS.has(action)||!SOURCES.has(source)||![campaign,creative,medium].every(validId))continue;
   counts[action]++;
   const key=campaign+'|'+creative+'|'+medium+'|'+source;
   if(!groups.has(key))groups.set(key,{campaign,creative,medium,source,landing_view:0,partner_click:0,whatsapp_click:0});
   groups.get(key)[action]++;
  }
  cursor=result.hasMore?result.cursor:null;
  if(examined>=4000&&cursor){truncated=true;break;}
 }while(cursor);
 return {periodDays:30,counts,byCreative:[...groups.values()].sort((a,b)=>b.partner_click-a.partner_click).slice(0,40),truncated,method:'consented-first-party-click-events',note:'Cliques nao comprovam conversas, seguidores ou vendas'};
}
