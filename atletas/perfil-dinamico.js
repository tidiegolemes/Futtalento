const $=id=>document.getElementById(id);
const slug=new URLSearchParams(location.search).get('id')||'';
const valid=/^at-[a-f0-9]{20}$/.test(slug);
const colorFor=club=>{const s=String(club||'').toLowerCase();return s.includes('cruzeiro')?'#4378ff':s.includes('grêmio')||s.includes('gremio')?'#6bbdf4':s.includes('juventude')?'#b7f47b':s.includes('internacional')?'#fd6666':'#c9fc54'};
const set=(id,text)=>$(id).textContent=text||'';
async function load(){
 if(!valid){set('loading','Perfil inválido.');return}
 try{
  const r=await fetch('/api/captacao-lead?cadastroAtleta=1&public=1&slug='+encodeURIComponent(slug),{cache:'no-store'});
  if(!r.ok)throw Error('Perfil ainda não está disponível publicamente.');
  const {athlete:p}=await r.json();
  document.documentElement.style.setProperty('--team',colorFor(p.club));
  set('athleteName',p.name);set('athleteClub',(p.club||'Clube em definição')+' · '+(p.position||'Atleta em formação'));
  set('athleteClubTag',p.club||'FutTalento');
  set('athleteIntro',p.highlights||'Conheça a trajetória esportiva de '+p.name+'.');
  set('athleteJourney',p.highlights||'Nova etapa no desenvolvimento esportivo.');
  set('athleteTitles',p.titles||'Títulos e campeonatos ainda não informados.');
  if(p.photoUrl&&p.photoUrl.startsWith('https://'))$('athletePhoto').src=p.photoUrl;
  $('athletePhoto').alt='Imagem de destaque autorizada do atleta '+p.name;
  $('supportLink').href='/para-empresas/?atleta='+encodeURIComponent(slug);
  for(const [key,url] of Object.entries(p.networks||{})){
   if(!['instagram','tiktok','youtube','site'].includes(key))continue;
   const a=document.createElement('a');a.href=url;a.rel='noopener noreferrer nofollow';a.target='_blank';
   a.textContent={instagram:'Instagram ↗',tiktok:'TikTok ↗',youtube:'YouTube ↗',site:'Site ↗'}[key];$('athleteLinks').append(a);
  }
  document.title=p.name+' — Perfil FutTalento';
  $('loading').hidden=true;$('athleteProfile').hidden=false;
 }catch(e){set('loading',e.message||'Perfil não disponível')}
}
load();