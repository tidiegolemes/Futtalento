// Only approved, source-attributed measurements appear in FutTalento's public Reel cards.
const KNOWN=Object.freeze({
 lucas:'https://www.lucasazambuja.com.br/',
 ryan:'https://www.futtalento.com.br/atletas/ryan/',
 thalles:'https://thallessilvino.com.br/'
});
const integer=(n,min=0,max=500000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;
const fmt=n=>n===null?'A validar':new Intl.NumberFormat('pt-BR').format(n);
const points=(count,max,reference)=>count===null?null:Math.round(max*Math.min(1,count/reference)*10)/10;


export function getReelStats(record,athlete){
 const match=record?.athlete===athlete;
 const index=match?record.index||{}:{};
 const metrics=match?record.metrics||{}:{};
 const evidence=match?record.evidence:null;
 const validEvidence=evidence?.athlete===athlete&&evidence.source===KNOWN[athlete]&&
  integer(evidence?.sports?.points,0,25)!==null;
 const sports=validEvidence?evidence.sports:{};
 const value=integer(index.value,0,100);
 const sportsPoints=integer(sports.points,0,25);
 // Display-only normalization. It is NOT the overall FutTalento index.
 const sportsScore100=sportsPoints===null?null:Math.round(sportsPoints*100/25);
 const titles=integer(sports.titlesDocumented,0,100)??integer(metrics.titlesVerified,0,100);
 const competitions=integer(sports.competitionsDocumented,0,200)??integer(metrics.competitionsVerified,0,200);
 const clubMonths=integer(sports.clubMonthsDocumented,0,300)??integer(metrics.clubMonths,0,300);
 const sportsBreakdown=sportsPoints===null?null:{
  titles:{count:integer(sports.titlesDocumented,0,100),score:points(integer(sports.titlesDocumented,0,100),12,3),maximum:12},
  competitions:{count:integer(sports.competitionsDocumented,0,200),score:points(integer(sports.competitionsDocumented,0,200),5,5),maximum:5},
  clubMonths:{count:integer(sports.clubMonthsDocumented,0,300),score:points(integer(sports.clubMonthsDocumented,0,300),8,24),maximum:8}
 };
 const social=evidence?.publicSocial;
 const observed=Date.parse(social?.observedAt||'');
 const publicFollowers=validEvidence&&athlete==='lucas'&&
  social?.url==='https://www.instagram.com/lucasazambujaoficial/'&&
  social?.measurement==='contagem_publica_arredondada'&&
  Number.isSafeInteger(social?.approxFollowers)&&social.approxFollowers>=0&&
  Number.isFinite(observed)&&Date.now()>=observed&&Date.now()-observed<=30*86400000?
  social:null;
 const followers=integer(metrics.followers);
 const reach=integer(metrics.reach28d);
 const interactions=integer(metrics.interactions28d);
 return {
  rating:value,
  badgeLabel:value!==null?'ÍNDICE GERAL':sportsScore100!==null?'NOTA ESPORTIVA':'ÍNDICE FUTTALENTO',
  badgeValue:value!==null?String(value):sportsScore100!==null?String(sportsScore100):'—',
  badgeSub:value!==null?'de 100 · geral':sportsScore100!==null?'de 100 · acervo':'Em formação',
  titles,competitions,clubMonths,followers,reach,interactions,sportsPoints,sportsScore100,sportsBreakdown,
  publicFollowerDisplay:followers===null&&publicFollowers?'≈'+new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(publicFollowers.approxFollowers/1000)+' mil':null,
  publicFollowerSource:publicFollowers?.url||null,
  publicFollowerObservedAt:publicFollowers?.observedAt||null,
  verifiedSource:validEvidence?evidence.source:null,
  sourceLabel:athlete==='ryan'?'Acervo FutTalento':'Site do atleta',
  sportsStale:validEvidence&&evidence.stale===true,
  observedAt:typeof index.observedAt==='string'?index.observedAt:null,
  display:{titles:fmt(titles),competitions:fmt(competitions),
   clubMonths:clubMonths===null?'A validar':fmt(clubMonths)+' meses',
   followers:fmt(followers),reach:fmt(reach),interactions:fmt(interactions)}
 };
}
