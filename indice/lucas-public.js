// Public, source-attributed sports evidence for Lucas. This never authorizes social metrics or a full /100 score.
import {ATHLETE_SOURCES,extractSports} from './auto-sources.js';
import {calculateIndex} from './score.js';
import {getPage} from '../api/_indice-sources.js';

const PATH='futtalento/indice/public/lucas-sports-v1.json';
const SOURCE=ATHLETE_SOURCES.lucas.url;
const EVIDENCE_VERSION=3;
// Contagem aproximada observada no Instagram público oficial em 26/10/2026.
// Não representa Meta Insights nem audiência engajada.
const SOCIAL_PUBLIC=Object.freeze({
 platform:'instagram',url:'https://www.instagram.com/lucasazambujaoficial/',
 approxFollowers:10700,observedAt:'2026-10-26',measurement:'contagem_publica_arredondada'
});

export function parseLucasEvidence(html, checkedAt=new Date().toISOString()){
  const sports=extractSports('lucas',html,checkedAt.slice(0,10));
  if(!sports.events.length)throw new Error('Nenhum marco esportivo identificado na fonte');
  const index=calculateIndex({metrics:sports.metrics,observedAt:checkedAt.slice(0,10),cohortYear:sports.cohortYear});
  return {
    athlete:'lucas',evidenceVersion:EVIDENCE_VERSION,checkedAt,source:SOURCE,sourceLabel:ATHLETE_SOURCES.lucas.label,
    cohortYear:sports.cohortYear,clubTenureReferenceMonths:index.clubTenureReferenceMonths,
    verification:'registro_publicado_pelo_atleta',
    sports:{
      points:index.components.sports.score,maximum:25,
      titlesDocumented:sports.metrics.titlesVerified??null,
      competitionsDocumented:sports.metrics.competitionsVerified??null,
      clubMonthsDocumented:sports.metrics.clubMonths??null,
      clubTenureReferenceMonths:index.clubTenureReferenceMonths
    },
    events:sports.events.map(e=>({id:e.id,label:e.label,year:e.year,title:e.title,basis:e.basis})),historicalArchiveUsed:sports.hasHistoricalArchive,publicSocial:SOCIAL_PUBLIC
  };
}
export async function retrieveLucasEvidence(){
  return parseLucasEvidence(await getPage(SOURCE));
}
function safeEvidence(value){
  if(!value||value.evidenceVersion!==EVIDENCE_VERSION||value.athlete!=='lucas'||value.source!==SOURCE||
    !Number.isFinite(Date.parse(value.checkedAt))||
    !Number.isInteger(value.sports?.points)||value.sports.points<0||value.sports.points>25||
    !Array.isArray(value.events)||value.events.length>30)return null;
  return {...value,stale:Date.now()-Date.parse(value.checkedAt)>7*86400000};
}
export async function getLucasEvidence(){
  try{
    const {get}=await import('@vercel/blob');
    const b=await get(PATH,{access:'private'});
    if(b?.stream){
      const saved=safeEvidence(JSON.parse(await new Response(b.stream).text()));
      if(saved)return saved;
    }
  }catch(e){/* No published snapshot yet; safe fallback to public original source. */}
  try{return safeEvidence(await retrieveLucasEvidence())}catch(e){return null}
}
export async function storeLucasEvidence(){
  const evidence=await retrieveLucasEvidence();
  const {put}=await import('@vercel/blob');
  await put(PATH,JSON.stringify(evidence),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});
  return evidence;
}
