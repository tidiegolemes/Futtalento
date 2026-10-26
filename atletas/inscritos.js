/* Public verified athlete profiles are loaded without exposing guardian records. */
(()=>{
 'use strict';
 const rail=document.getElementById('talentRail'),count=document.getElementById('resultCount');
 if(!rail)return;
 const node=(tag,cls,text)=>{let x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
 const el=(tag,cls,text)=>node(tag,cls,text);
 const known=new Set([...rail.querySelectorAll('[data-athlete]')].map(x=>x.dataset.athlete));
 const button=(label)=>{let b=el('button','ft-r-dot');b.type='button';b.setAttribute('aria-label',label);return b};
 const shorten=v=>String(v||'').trim();
 function card(p){
  if(!p.slug||known.has(p.slug)||!/^[-a-z0-9]{4,90}$/.test(p.slug))return;
  known.add(p.slug);
  const article=el('article','talent-card ft-reel-card');
  article.dataset.athlete=p.slug;
  article.dataset.clubs=p.clubKey||'sem-clube';
  article.dataset.keywords=[p.name,p.club,p.position,p.category,p.titles].filter(Boolean).join(' ').toLowerCase();
  article.id='athlete-'+p.slug;
  const stage=el('div','ft-r-stage');stage.tabIndex=0;stage.setAttribute('aria-label','Informações de '+p.name+'. Deslize para descobrir mais.');
  const track=el('div','ft-r-track');
  const photo=el('div','talent-poster ft-r-slide');
  const img=el('img');img.src=p.image;img.alt='Foto esportiva de '+p.name;img.loading='lazy';img.decoding='async';img.width=620;img.height=700;
  photo.append(img,el('div','ft-r-shade'));
  const brand=el('div','ft-r-brandline');brand.append(el('span','ft-r-brand','✦ FUTTALENTO'),el('span','ft-r-brand-kicker','TALENTOS EM EVOLUÇÃO'));photo.append(brand);
  const rating=el('div','ft-r-rating');rating.append(el('span','ft-r-rating-label','ÍNDICE FUTTALENTO'),el('strong','ft-r-rating-value','—'),el('small','ft-r-rating-sub','Em formação'));photo.append(rating);
  const intro=el('div','ft-r-hero-details');
  intro.append(el('span','ft-r-eyebrow','Jornada esportiva'),el('h3','ft-r-athlete-name',p.name),el('p','ft-r-athlete-meta',(p.club||'Sem clube')+' · '+(p.category||'Formação')),el('span','ft-r-position',p.position||'Atleta de base'));photo.append(intro);
  const highlight=el('div','ft-r-highlight');highlight.append(el('span','ft-r-highlight-icon','★'),el('p','',p.titles||'Nova trajetória no FutTalento'));photo.append(highlight);
  const facts=el('div','ft-r-hero-facts');const metric=(title,value)=>{
    let x=el('div','ft-r-metric'),body=el('span','ft-r-metric-body');
    body.append(el('small','',title),el('strong','',value));x.append(body);return x;
  };
  facts.append(metric('🏆 Histórico',p.titles?'Informado':'Em formação'),metric('◎ Audiência','A validar'),metric('✦ Parcerias','A avaliar'));
  photo.append(facts);
  const slide=el('section','ft-r-slide ft-r-slide-impact');
  const bg=el('img','ft-r-impact-photo');bg.src=p.image;bg.alt='';bg.loading='lazy';slide.append(bg);
  const head=el('div','ft-r-impact-head');head.append(el('span','ft-r-brand','✦ FUTTALENTO'),el('span','ft-r-impact-kicker','2 / 2 · JORNADA'));slide.append(head);
  const hero=el('div','ft-r-impact-hero');hero.append(el('span','ft-r-impact-pre','PERFIL OFICIAL'),el('strong','ft-r-impact-title',p.name.split(' ')[0]),el('span','ft-r-impact-sub',p.club||'Futebol de base'));slide.append(hero);
  const data=el('div','ft-r-impact-data');data.append(el('p','ft-r-data-eyebrow','POTENCIAL E TRAJETÓRIA'));
  const values=el('div','ft-r-impact-metrics');values.append(metric('◎ Instagram','A validar'),metric('♪ TikTok','A validar'),metric('🏆 Títulos',p.titles?'Informado':'Em formação'),metric('↗ Seguidores','A validar'));data.append(values);
  let strengths=el('div','ft-r-strengths');strengths.append(el('strong','ft-r-section-title','✦ História em construção'),el('p','ft-r-evidence-note','Conquistas declaradas pelo responsável, sujeitas a validação.'));data.append(strengths);
  const pitch=el('div','ft-r-sponsor-pitch');pitch.append(el('strong','','APOIE ESSA HISTÓRIA'),el('p','','Envie seu interesse e a EyAgência orienta as possibilidades de parceria.'));data.append(pitch);
  slide.append(data);track.append(photo,slide);stage.append(track);
  const nav=el('div','ft-r-navigation'),previous=el('button','ft-r-arrow','‹'),next=el('button','ft-r-arrow','›'),dots=el('div','ft-r-dots'),counter=el('span','ft-r-counter','1 / 2');
  previous.type=next.type='button';previous.setAttribute('aria-label','Anterior');next.setAttribute('aria-label','Próximo');
  const bs=[button('Mostrar primeiro slide'),button('Mostrar segundo slide')];dots.append(...bs);nav.append(previous,dots,counter,next);stage.append(nav);
  const sync=(i)=>{i=Math.max(0,Math.min(1,i));bs.forEach((b,n)=>{b.classList.toggle('is-active',n===i)});counter.textContent=(i+1)+' / 2';previous.disabled=i===0;next.disabled=i===1;};
  const go=i=>{sync(i);track.scrollTo({left:Math.max(0,Math.min(1,i))*track.clientWidth,behavior:'smooth'})};
  previous.addEventListener('click',()=>go(0));next.addEventListener('click',()=>go(1));bs.forEach((b,i)=>b.addEventListener('click',()=>go(i)));
  track.addEventListener('scroll',()=>sync(Math.round(track.scrollLeft/Math.max(1,track.clientWidth))),{passive:true});sync(0);
  const footer=el('div','talent-card-info ft-r-footer');footer.append(el('p','ft-r-footer-note','Deslize para conhecer a história.'));
  const link=el('a','talent-cta','Conhecer e apoiar '+p.name.split(' ')[0]+' →');link.href=p.page+'#apoio';
  const more=el('a','talent-more','Ver perfil completo ↗');more.href=p.page;footer.append(more,link);
  article.append(stage,footer);rail.append(article);
 }
 fetch('/api/athlete-onboarding?action=list',{cache:'no-store'}).then(async r=>{
  if(!r.ok)throw Error();return r.json()
 }).then(data=>{
  for(const p of data.athletes||[])card(p);
  window.dispatchEvent(new Event('ft-athletes-changed'));
 }).catch(()=>{});
})();
