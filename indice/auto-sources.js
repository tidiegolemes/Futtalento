// Conservative, source-traced sports prefill from official owned athlete pages.
export const ATHLETE_SOURCES=Object.freeze({
 lucas:{url:'https://www.lucasazambuja.com.br/',label:'Site oficial de Lucas Azambuja',events:[
  {id:'copa-base-baby-2026',name:'Final da Copa Base Baby 2026',year:2026,competition:true,title:true,anchor:'copa base baby',radius:440,checks:['copa base baby','final','gol','assistência','grêmio']}
 ]},
 ryan:{url:'https://www.futtalento.com.br/atletas/ryan/',label:'Acervo FutTalento · Ryan',events:[
  {id:'copa-maravilha-2026',name:'Copa Maravilha 2026',year:2026,competition:true,title:false,anchor:'copa maravilha',radius:145,checks:['copa maravilha','2026','cruzeiro']}
 ]},
 thalles:{url:'https://thallessilvino.com.br/',label:'Site oficial de Thalles Silvino',events:[
  {id:'encantado-safergs-2025',name:'Título na Copa Encantado / SAFERGS 2025',year:2025,competition:true,title:true,anchor:'encantado',radius:95,pattern:'2025\\s+campeao\\W+copa\\s+encantado\\W+safergs',checks:['2025','campeão','encantado','safergs']},
  {id:'sarandi-2024',name:'Título na Copa Sarandi 2024',year:2024,competition:true,title:true,anchor:'sarandi',radius:95,pattern:'2024\\s+campeao\\W+copa\\s+sarandi',checks:['2024','campeão','sarandi']},
  {id:'liga-serrana-conda-2023',name:'Tríplice coroa 2023 (registro)',year:2023,competition:true,title:true,anchor:'ligaserrana',radius:95,pattern:'2023\\s+triplice\\s+coroa\\W+ligaserrana\\W+condacup',checks:['2023','tríplice coroa','ligaserrana','condacup']},
  {id:'liga-serrana-encosta-2022',name:'Bicampeonato 2022 (registro)',year:2022,competition:true,title:true,anchor:'encosta',radius:95,pattern:'2022\\s+bicampeao\\W+ligaserrana\\W+encosta',checks:['2022','bicampeão','ligaserrana','encosta']}
 ]}
});
// Histórico nomeado em versão anterior do site oficial de Lucas, encontrada no
// índice público em 26/10/2026. Fonte do atleta, sem chancela da organização.
const LUCAS_HISTORIC_EVENTS=[
 {id:'new-cup-chopinzinho-2026',name:'New Cup Chopinzinho 2026 — campeão',year:2026,competition:true,title:true,basis:'versao_anterior_site_oficial'},
 {id:'iberleague-rs-2025',name:'IberLeague RS 2025 — campeão',year:2025,competition:true,title:true,basis:'versao_anterior_site_oficial'},
 {id:'liga-canoense-2025',name:'Liga Canoense Série Ouro 2025 — campeão',year:2025,competition:true,title:true,basis:'versao_anterior_site_oficial'},
 {id:'torneio-linf-2025',name:'Torneio LINF 2025 — campeão',year:2025,competition:true,title:true,basis:'versao_anterior_site_oficial'}
];
const simplify=html=>String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:amp|nbsp|quot|lt|gt);/gi,' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[@®]/g,'').replace(/\s+/g,' ').toLowerCase();
const cleanWord=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[@®]/g,'').toLowerCase();
export function extractSports(athlete,html,asOf=new Date().toISOString().slice(0,10)){
 const cfg=ATHLETE_SOURCES[athlete];
 if(!cfg)throw new Error('Atleta inválido');
 const text=simplify(html);
 const currentEvents=cfg.events.filter(e=>{
  if(e.pattern)return new RegExp(e.pattern,'i').test(text);
  const anchor=cleanWord(e.anchor||e.checks.at(-1));
  let position=text.indexOf(anchor);
  const radius=e.radius||120;
  while(position!==-1){
   const passage=text.slice(Math.max(0,position-radius),position+anchor.length+radius);
   if(e.checks.every(word=>passage.includes(cleanWord(word))))return true;
   position=text.indexOf(anchor,position+anchor.length);
  }
  return false;
 });
 const recognizedLucas=athlete==='lucas'&&text.includes('lukinhas10')&&text.includes('gremio')&&
   text.includes('copa base baby')&&text.includes('1 gol + 1 assistencia');
 // Identidade e torneio atual devem estar presentes antes de unir documentos
 // históricos: nunca pontuar eventos de um homônimo ou de site redirecionado.
 const events=recognizedLucas?[...currentEvents,...LUCAS_HISTORIC_EVENTS]:currentEvents;
 const metrics={titlesVerified:events.some(e=>e.title)?events.filter(e=>e.title).length:null,competitionsVerified:events.some(e=>e.competition)?events.filter(e=>e.competition).length:null};
 // The Thalles profile says "2023 - ATUAL". Without a start month, use only a
 // conservative lower bound of complete years between 2023 and now.
 const currentYear=Number(String(asOf).slice(0,4));
 const clubDocumented=athlete==='thalles'&&/2023\s*[-–—]\s*atual/i.test(text)&&text.includes('juventude');
 if(clubDocumented&&Number.isInteger(currentYear)&&currentYear>=2024)
  metrics.clubMonths=Math.max(0,(currentYear-2023-1)*12);
 // Versão anterior do site: Grêmio 2024–atual; edição atual confirma Grêmio.
 // Início sem mês: apenas 12 meses completos conservadores em 2026.
 if(recognizedLucas&&Number.isInteger(currentYear)&&currentYear>=2025)
  metrics.clubMonths=Math.max(0,(currentYear-2024-1)*12);
 return {athlete,source:cfg.url,sourceLabel:cfg.label,checkedAt:asOf,metrics,
  events:events.map(e=>({id:e.id,label:e.name,year:e.year,title:e.title,source:cfg.url,basis:e.basis||'pagina_atual'})),hasHistoricalArchive:recognizedLucas,
  caveat:'Pré-preenchimento por marcos documentados. Tempo de clube, quando disponível, usa apenas um mínimo conservador — não um início contratual exato. Revise a fonte antes de publicar.'};
}