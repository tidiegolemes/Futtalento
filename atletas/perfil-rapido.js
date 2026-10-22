/* Optional athlete details: data kept as structured JSON; main directory stays minimal. */
(()=>{
'use strict';
const dlg=document.getElementById('ftProfileDialog');
const content=document.getElementById('ftProfileContent');
const close=document.getElementById('ftProfileClose');
const data=document.getElementById('ftAthleteFacts');
if(!dlg||!content||!data||typeof dlg.showModal!=='function')return;
let facts={};try{facts=JSON.parse(data.textContent||'{}')}catch{return}
let lastFocus=null;
const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node};
const link=(url,label)=>{
 const a=el('a','profile-link',label+' ↗');
 if(!(url.startsWith('https://')||url.startsWith('/')))return null;
 a.href=url;
 if(url.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer'}
 return a;
};
function openProfile(id){
 const record=Object.hasOwn(facts,id)?facts[id]:null;
 if(!record)return;
 lastFocus=document.activeElement;
 content.replaceChildren();
 const title=el('h2','profile-title',record.name);
 title.id='ftProfileTitle';content.append(title);
 content.append(el('p','profile-meta',record.club+' · '+record.position+' · '+record.category));
 content.append(el('p','profile-copy',record.details));
 const heading=el('h3','profile-section-title','Destaques esportivos');content.append(heading);
 const ul=el('ul','profile-milestones');
 record.milestones.forEach(item=>{const li=el('li');li.append(el('strong','',item.title),el('span','',item.description));ul.append(li)});
 content.append(ul);
 const socials=el('div','profile-socials');
 record.socials.forEach(item=>{const a=link(item.url,item.label);if(a)socials.append(a)});
 content.append(el('h3','profile-section-title','Canais e fontes'),socials);
 const source=link(record.source,'Ver acervo e fonte oficial');
 if(source)content.append(source);
 content.append(el('p','profile-facts-note','Alcance e seguidores em validação. Clube e resultados refletem registros publicados, sem vínculo institucional com os clubes.'));
 const footer=el('div','profile-foot-actions');
 const support=el('button','profile-support','Ver planos e apoiar →');support.type='button';support.dataset.inlineAthlete=id;
 support.addEventListener('click',()=>{if(dlg.open)dlg.close()});
 footer.append(support);content.append(footer);
 dlg.showModal();
}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-profile-id]');
 if(!button)return;
 const id=button.dataset.profileId;
 if(!Object.hasOwn(facts,id))return;
 openProfile(id);
});
const dismiss=()=>dlg.open&&dlg.close();
close.addEventListener('click',dismiss);
dlg.addEventListener('click',e=>{if(e.target===dlg)dismiss()});
dlg.addEventListener('close',()=>{if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true})});
})();
