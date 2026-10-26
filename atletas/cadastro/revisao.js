const $=id=>document.getElementById(id);const endpoint='/api/captacao-lead?cadastroAtleta=1';
const msg=s=>$('status').textContent=s;
function element(tag,txt,cls){const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n}
async function request(url,options){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Falha na consulta');return d}
async function load(){
 const root=$('queue');root.replaceChildren();msg('Consultando perfis...');
 try{
  const data=await request(endpoint+'&agency=pending');
  if(!data.profiles?.length){msg('Nenhum cadastro aguardando revisão.');return}
  msg(data.profiles.length+' perfil(is) aguardando conferência.');
  for(const p of data.profiles){
   const card=element('article',undefined,'card');
   card.append(element('h2',p.name||'Atleta sem nome'),element('p',(p.club||'Clube não informado')+' · '+(p.position||'Posição não informada'),'meta'));
   card.append(element('p',p.highlights||'Sem apresentação'));
   card.append(element('p','Títulos declarados: '+(p.titles||'Não informado')));
   if(p.photoUrl&&/^https:\/\//.test(p.photoUrl)){
    const img=element('img');img.src=p.photoUrl;img.alt='Foto enviada para revisão';img.referrerPolicy='no-referrer';card.append(img);
   }
   const privateInfo=element('div',undefined,'privacy');
   privateInfo.append(element('strong','Privado · Responsável legal'),element('p',(p.guardianName||'Não informado')+' · '+(p.guardianPhone||'Telefone não informado')));
   privateInfo.append(element('p','Declaração do responsável: '+(p.guardianAttested?'Sim':'Não')+' · Autorização de exibição: '+(p.consentToDisplay?'Sim':'Não')));
   card.append(privateInfo);
   const actions=element('div',undefined,'actions');
   const approve=element('button','Aprovar e publicar');approve.type='button';
   approve.addEventListener('click',async()=>{
    if(!confirm('Confirma que revisou os dados e a autorização familiar para publicar o perfil deste atleta?'))return;
    approve.disabled=true;msg('Publicando perfil aprovado...');
    try{
     const approved=await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approve',slug:p.slug,approved:true})});
     await load();msg('Perfil publicado. Link oficial: '+location.origin+approved.profileUrl);
    }catch(e){approve.disabled=false;msg(e.message)}
   });
   actions.append(approve);
   const link=element('a','Visualizar modelo público ↗');link.href='/atletas/perfil/?id='+encodeURIComponent(p.slug);
   link.title='Disponível após aprovação';actions.append(link);
   card.append(actions);root.append(card);
  }
 }catch(e){msg(e.message||'Falha ao carregar os perfis')}
}
$('reload').addEventListener('click',load);load();