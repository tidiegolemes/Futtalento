// Only approved, source-attributed measurements appear in FutTalento's public Reel cards.
const KNOWN=Object.freeze({
 lucas:'https://www.lucasazambuja.com.br/',
 ryan:'https://www.futtalento.com.br/atletas/ryan/',
 thalles:'https://thallessilvino.com.br/'
});
const integer=(n,min=0,max=500000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;
const fmt=n=>n===null?'A validar':new Intl.NumberFormat('pt-BR').format(n);

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
 const titles=integer(sports.titlesDocumented,0,100)??integer(metrics.titlesVerified,0,100);
 const competitions=integer(sports.competitionsDocumented,0,200)??integer(metrics.competitionsVerified,0,200);
 const clubMonths=integer(sports.clubMonthsDocumented,0,300)??integer(metrics.clubMonths,0,300);
 const followers=integer(metrics.followers);
 const reach=integer(metrics.reach28d);
 const interactions=integer(metrics.interactions28d);
 return {
  rating:value,
  badgeLabel:value!==null?'FORÇA FUTTALENTO':sportsPoints!==null?'JORNADA ESPORTIVA':'ÍNDICE FUTTALENTO',
  badgeValue:value!==null?String(value):sportsPoints!==null?String(sportsPoints)+'/25':'—',
  badgeSub:value!==null?'Índice verificado':sportsPoints!==null?'Parcial documentada':'Em formação',
  titles,competitions,clubMonths,followers,reach,interactions,sportsPoints,
  verifiedSource:validEvidence?evidence.source:null,
  sourceLabel:athlete==='ryan'?'Acervo FutTalento':'Site do atleta',
  sportsStale:validEvidence&&evidence.stale===true,
  observedAt:typeof index.observedAt==='string'?index.observedAt:null,
  display:{titles:fmt(titles),competitions:fmt(competitions),
   clubMonths:clubMonths===null?'A validar':fmt(clubMonths)+' meses',
   followers:fmt(followers),reach:fmt(reach),interactions:fmt(interactions)}
 };
}
