// FutTalento V2 pilot. Do not expose a comparative index without complete, reviewed metrics.
import {clubTenureReferenceMonths} from './score.js';
export const POTENTIAL_VERSION='2.0-pilot';
export const POTENTIAL_WEIGHTS=Object.freeze({
 reach28d:22,followers:8,growth28dPct:5,
 engagementRate:20,posts28d:10,
 titlesVerified:9,competitionsVerified:7,clubMonths:4,
 approvedProfile:5,guardianConsent:5,trackingReady:5
});
const TOTAL=Object.values(POTENTIAL_WEIGHTS).reduce((a,b)=>a+b,0);
const clamp=n=>Math.min(1,Math.max(0,n));
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;
const integer=n=>Number.isSafeInteger(n)&&n>=0?n:null;
const logScore=(v,goal)=>clamp(Math.log1p(v)/Math.log1p(goal));
const linear=(v,goal)=>clamp(v/goal);
const round=(n,p=1)=>Math.round(n*10**p)/10**p;
const bool=v=>typeof v==='boolean'?v:null;
const dateMs=iso=>{const d=Date.parse(iso||'');return Number.isFinite(d)?d:null};
// Input provenance must be validated in the server, not accepted from anonymous browser input.
export function calculateSponsorPotential(snapshot,now=Date.now()){
 const m=snapshot?.metrics||{},a=snapshot?.activation||{};
 const reach=integer(m.reach28d),followers=integer(m.followers),interactions=integer(m.interactions28d);
 const growth=typeof m.growth28dPct==='number'&&Number.isFinite(m.growth28dPct)&&m.growth28dPct>=-100?m.growth28dPct:null;
 const posts=integer(m.posts28d),titles=integer(m.titlesVerified),comps=integer(m.competitionsVerified),months=integer(m.clubMonths);
 const reference=clubTenureReferenceMonths(snapshot?.cohortYear,snapshot?.observedAt||now);
 // This is interaction events / unique reached accounts, not the fraction of distinct engaged people.
 const activityRatio=reach!==null&&reach>0&&interactions!==null?interactions/reach:null;
 const pieces={
  reach28d:reach===null?null:22*logScore(reach,100000),
  followers:followers===null?null:8*logScore(followers,50000),
  growth28dPct:growth===null?null:5*linear(Math.max(0,growth),15),
  engagementRate:activityRatio===null?null:20*linear(activityRatio,0.08),
  posts28d:posts===null?null:10*linear(posts,8),
  titlesVerified:titles===null?null:9*logScore(titles,8),
  competitionsVerified:comps===null?null:7*logScore(comps,10),
  clubMonths:months===null?null:4*linear(months,reference),
  approvedProfile:bool(a.approvedProfile)===null?null:(a.approvedProfile?5:0),
  guardianConsent:bool(a.guardianConsent)===null?null:(a.guardianConsent?5:0),
  trackingReady:bool(a.trackingReady)===null?null:(a.trackingReady?5:0)
 };
 const missing=Object.keys(pieces).filter(k=>pieces[k]===null);
 const coverage=Object.keys(pieces).reduce((sum,k)=>sum+(pieces[k]===null?0:POTENTIAL_WEIGHTS[k]),0);
 const knownPoints=Object.values(pieces).reduce((sum,v)=>sum+(v??0),0);
 const observed=dateMs(snapshot?.observedAt);
 const fresh=observed!==null&&observed<=now&&now-observed<=35*86400000;
 const source=snapshot?.provenance||{};
 const trusted=source.audience==='meta_insights_authorized'&&source.sports==='athlete_records_reviewed'&&source.activation==='agency_checked';
 const consent=a.guardianConsent===true&&a.approvedProfile===true;
 const complete=coverage===TOTAL;
 const status=!fresh?'stale_or_undated':!complete?'incomplete':!trusted||!consent?'sources_unverified':'validated';
 const groups={audience:['reach28d','followers','growth28dPct'],engagement:['engagementRate','posts28d'],sports:['titlesVerified','competitionsVerified','clubMonths'],activation:['approvedProfile','guardianConsent','trackingReady']};
 const components=Object.fromEntries(Object.entries(groups).map(([name,fields])=>[name,{
  score:round(fields.reduce((sum,k)=>sum+(pieces[k]??0),0)),
  maximum:fields.reduce((sum,k)=>sum+POTENTIAL_WEIGHTS[k],0),
  covered:fields.reduce((sum,k)=>sum+(pieces[k]===null?0:POTENTIAL_WEIGHTS[k]),0),
  complete:fields.every(k=>pieces[k]!==null)
 }]));
 return {version:POTENTIAL_VERSION,status,
  value:status==='validated'?Math.round(knownPoints):null,
  coverage,knownPoints:round(knownPoints),possibleRange:[round(knownPoints),round(knownPoints+TOTAL-coverage)],
  missing,clubTenureReferenceMonths:reference,components,
  note:'Pontuação de potencial de parceria, não avaliação técnica ou previsão de vendas.'};
}
// Outcomes are measured after a sponsorship and never added to the prospective score.
export function reportCampaignResults(c){
 const clicks=integer(c?.uniqueClicks),impressions=integer(c?.impressions),
  leads=integer(c?.qualifiedLeads),orders=integer(c?.attributedOrders),
  revenue=positive(c?.attributedRevenue),cost=positive(c?.campaignCost);
 return {uniqueClicks:clicks,impressions,qualifiedLeads:leads,attributedOrders:orders,
  attributedRevenue:revenue,campaignCost:cost,
  ctr:clicks!==null&&impressions>0?round(100*clicks/impressions,2):null,
  costPerLead:cost!==null&&leads>0?round(cost/leads,2):null,
  attributedRevenueToCost:cost>0&&revenue!==null?round(revenue/cost,2):null,
  incrementalRoi:null,
  note:'Vendas atribuídas e receita observada não demonstram incremento causal nem lucro.'};
}
