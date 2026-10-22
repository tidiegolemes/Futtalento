// Public, source-attributed partial sports evidence for Ryan and Thalles.
// Does not approve private audience metrics or fabricate a full /100 score.
import {ATHLETE_SOURCES,extractSports} from './auto-sources.js';
import {calculateIndex} from './score.js';
import {getPage} from '../api/_indice-sources.js';

const ALLOWED=new Set(['ryan','thalles']);
const PREFIX='futtalento/indice/public/';
function cfgFor(athlete){
  if(!ALLOWED.has(athlete))throw new Error('Atleta não autorizado');
  return ATHLETE_SOURCES[athlete];
}
function storagePath(athlete){return PREFIX+athlete+'-sports-v1.json';}
export function parseOtherAthleteEvidence(athlete,html,checkedAt=new Date().toISOString()){
  const cfg=cfgFor(athlete);
  const sports=extractSports(athlete,html,checkedAt.slice(0,10));
  if(!sports.events.length)throw new Error('Nenhum marco documentado para '+athlete);
  const index=calculateIndex({metrics:sports.metrics,observedAt:checkedAt.slice(0,10)});
  return {
    athlete,checkedAt,source:cfg.url,sourceLabel:cfg.label,
    verification:'registro_publicado_em_fonte_vinculada',
    sports:{
      points:index.components.sports.score,maximum:25,
      titlesDocumented:sports.metrics.titlesVerified??null,
      competitionsDocumented:sports.metrics.competitionsVerified??null,
      clubMonthsDocumented:sports.metrics.clubMonths??null
    },
    events:sports.events.map(e=>({id:e.id,label:e.label,year:e.year,title:e.title}))
  };
}
function safeEvidence(athlete,evidence){
  const cfg=cfgFor(athlete);
  if(!evidence||evidence.athlete!==athlete||evidence.source!==cfg.url||
    !Number.isFinite(Date.parse(evidence.checkedAt))||
    !Number.isInteger(evidence.sports?.points)||
    evidence.sports.points<0||evidence.sports.points>25||
    !Array.isArray(evidence.events)||evidence.events.length>30)return null;
  return {...evidence,stale:Date.now()-Date.parse(evidence.checkedAt)>7*86400000};
}
export async function retrieveOtherAthleteEvidence(athlete){
  const cfg=cfgFor(athlete);
  return parseOtherAthleteEvidence(athlete,await getPage(cfg.url));
}
export async function getOtherAthleteEvidence(athlete){
  cfgFor(athlete);
  try{
    const {get}=await import('@vercel/blob');
    const blob=await get(storagePath(athlete),{access:'private'});
    if(blob?.stream){
      const cached=safeEvidence(athlete,JSON.parse(await new Response(blob.stream).text()));
      if(cached)return cached;
    }
  }catch(e){/* Missing private snapshot; try the public source. */}
  try{return safeEvidence(athlete,await retrieveOtherAthleteEvidence(athlete))}
  catch(e){return null}
}
export async function storeOtherAthleteEvidence(athlete){
  const evidence=await retrieveOtherAthleteEvidence(athlete);
  const {put}=await import('@vercel/blob');
  await put(storagePath(athlete),JSON.stringify(evidence),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});
  return evidence;
}
