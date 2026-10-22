// Conservative, source-traced sports prefill from official owned athlete pages.
export const ATHLETE_SOURCES=Object.freeze({
 lucas:{url:'https://www.lucasazambuja.com.br/',label:'Site oficial de Lucas Azambuja',events:[
  {id:'copa-base-baby-2026',name:'Final da Copa Base Baby 2026',year:2026,competition:true,title:true,checks:['copa base baby','final','gol','assistência','grêmio']}
 ]},
 ryan:{url:'https://www.futtalento.com.br/atletas/ryan/',label:'Acervo FutTalento · Ryan',events:[
  {id:'copa-maravilha-2026',name:'Copa Maravilha 2026',year:2026,competition:true,title:false,checks:['copa maravilha','2026','cruzeiro']}
 ]},
 thalles:{url:'https://thallessilvino.com.br/',label:'Site oficial de Thalles Silvino',events:[
  {id:'encantado-safergs-2025',name:'Título na Copa Encantado / SAFERGS 2025',year:2025,competition:true,title:true,checks:['2025','campeão','encantado','safergs']},
  {id:'sarandi-2024',name:'Título na Copa Sarandi 2024',year:2024,competition:true,title:true,checks:['2024','campeão','sarandi']},
  {id:'liga-serrana-conda-2023',name:'Tríplice coroa 2023 (registro)',year:2023,competition:true,title:true,checks:['2023','tríplice coroa','ligaserrana','condacup']},
  {id:'liga-serrana-encosta-2022',name:'Bicampeonato 2022 (registro)',year:2022,competition:true,title:true,checks:['2022','bicampeão','ligaserrana','encosta']}
 ]}
});
const simplify=html=>String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:amp|nbsp|quot|lt|gt);/gi,' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[@®]/g,'').replace(/\s+/g,' ').toLowerCase();
const cleanWord=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[@®]/g,'').toLowerCase();
export function extractSports(athlete,html,asOf=new Date().toISOString().slice(0,10)){
 const cfg=ATHLETE_SOURCES[athlete];
 if(!cfg)throw new Error('Atleta inválido');
 const text=simplify(html);
 const events=cfg.events.filter(e=>e.checks.every(word=>text.includes(cleanWord(word))));
 const metrics={titlesVerified:events.some(e=>e.title)?events.filter(e=>e.title).length:null,competitionsVerified:events.some(e=>e.competition)?events.filter(e=>e.competition).length:null};
 return {athlete,source:cfg.url,sourceLabel:cfg.label,checkedAt:asOf,metrics,
  events:events.map(e=>({id:e.id,label:e.name,year:e.year,title:e.title,source:cfg.url})),
  caveat:'Pré-preenchimento por marcos documentados. Revise o material de origem antes de publicar. Quantidade de eventos não equivale à carreira completa.'};
}