// Índice FutTalento v1. Pontuação proprietária; NÃO é alcance previsto, renda ou avaliação esportiva.
export const INDEX_VERSION='1.0';
export const WEIGHTS=Object.freeze({
 reach28d:25,followers:10,interactions28d:12,growth28dPct:8,
 titlesVerified:12,competitionsVerified:5,clubMonths:8,
 partnersActive:12,deliveriesCompleted:8
});
export const FIELDS=Object.freeze(Object.keys(WEIGHTS));
export const ATHLETES=Object.freeze(['lucas','ryan','thalles']);
const known=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const logFactor=(value,reference)=>clamp(Math.log1p(value)/Math.log1p(reference));
const metricsNumber=(m,key)=>known(m?.[key])?m[key]:null;
const ageDays=(iso,now)=>{const t=Date.parse(iso||'');return Number.isFinite(t)?Math.floor((now-t)/86400000):null};
/** Benchmark em meses pela categoria/geração publicada, sem data de nascimento.
 *  A referência histórica era 24 meses para geração de ~14 anos em 2026.
 *  Referências para gerações jovens são proporcionais, com piso de 12 meses.
 *  Sem geração pública, mantém-se o valor anterior (24 meses), não inferimos idade.
 */
export function clubTenureReferenceMonths(cohortYear,asOf){
 const year=typeof asOf==='number'?new Date(asOf).getUTCFullYear():
  Number(String(asOf??'').slice(0,4));
 if(!Number.isInteger(cohortYear)||!Number.isInteger(year)||
    cohortYear<1900||cohortYear>year)return 24;
 const categoryAge=year-cohortYear;
 if(categoryAge<6||categoryAge>18)return 24;
 return Math.max(12,Math.min(31,Math.round(24*categoryAge/14)));
}

export function calculateIndex(snapshot,now=Date.now()){
 const m=snapshot?.metrics||{};
 const clubReferenceMonths=clubTenureReferenceMonths(snapshot?.cohortYear,snapshot?.observedAt||now);
 const vals=Object.fromEntries(FIELDS.map(k=>[k,k==='growth28dPct'&&typeof m?.[k]==='number'&&Number.isFinite(m[k])&&m[k]>=-100?m[k]:metricsNumber(m,k)]));
 const available=FIELDS.filter(k=>vals[k]!==null);
 const coverage=available.reduce((sum,k)=>sum+WEIGHTS[k],0);
 const reach=vals.reach28d,followers=vals.followers,interactions=vals.interactions28d;
 const scores={
  reach28d:reach===null?null:25*logFactor(reach,100000),
  followers:followers===null?null:10*logFactor(followers,50000),
  interactions28d:reach===null||interactions===null?null:12*clamp((interactions/Math.max(reach,1))/.06),
  growth28dPct:vals.growth28dPct===null?null:8*clamp(vals.growth28dPct/20),
  titlesVerified:vals.titlesVerified===null?null:12*clamp(vals.titlesVerified/3),
  competitionsVerified:vals.competitionsVerified===null?null:5*clamp(vals.competitionsVerified/5),
  clubMonths:vals.clubMonths===null?null:8*clamp(vals.clubMonths/clubReferenceMonths),
  partnersActive:vals.partnersActive===null?null:12*clamp(vals.partnersActive/4),
  deliveriesCompleted:vals.deliveriesCompleted===null?null:8*clamp(vals.deliveriesCompleted/12)
 };
 // An engagement figure without reach is NOT scored, even if provided.
 const effective=Object.entries(scores).filter(([,v])=>v!==null);
 const effectiveCoverage=effective.reduce((sum,[k])=>sum+WEIGHTS[k],0);
 const days=ageDays(snapshot?.observedAt,now);
 const audienceReady=reach!==null&&followers!==null&&interactions!==null;
 const fresh=days!==null&&days>=0&&days<=45;
 const publishable=audienceReady&&fresh&&effectiveCoverage>=70;
 const value=publishable?Math.round(effective.reduce((sum,[,v])=>sum+v,0)*100/effectiveCoverage):null;
 const level=value===null?'Em formação':value>=80?'Referência':value>=60?'Destaque':value>=40?'Evolução':'Início';
 return {
  version:INDEX_VERSION,value,level,
  coverage:effectiveCoverage,fieldsCaptured:available.length,fieldsTotal:FIELDS.length,
  clubTenureReferenceMonths:clubReferenceMonths,
  source:snapshot?.source||null,observedAt:snapshot?.observedAt||null,
  status:publishable?'calculado':!fresh&&days!==null?'desatualizado':'dados_em_formacao',
  components:{
   audience:{score:Math.round([scores.reach28d,scores.followers,scores.interactions28d,scores.growth28dPct].reduce((a,v)=>a+(v||0),0)),maximum:55,complete:[scores.reach28d,scores.followers,scores.interactions28d,scores.growth28dPct].every(v=>v!==null)},
   sports:{score:Math.round([scores.titlesVerified,scores.competitionsVerified,scores.clubMonths].reduce((a,v)=>a+(v||0),0)),maximum:25,complete:[scores.titlesVerified,scores.competitionsVerified,scores.clubMonths].every(v=>v!==null)},
   partnership:{score:Math.round([scores.partnersActive,scores.deliveriesCompleted].reduce((a,v)=>a+(v||0),0)),maximum:20,complete:[scores.partnersActive,scores.deliveriesCompleted].every(v=>v!==null)}
  },
  metrics:vals
 };
}
