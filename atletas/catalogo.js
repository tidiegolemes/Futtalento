/* FutTalento: navegação acessível e coleta opcional de eventos comerciais. Não envia dados de menores. */
(function () {
  "use strict";
  const key = "futtalento_analytics_consent";
  const banner = document.getElementById("privacy-banner");
  const accept = document.getElementById("consent-accept");
  const reject = document.getElementById("consent-reject");
  const settings = document.getElementById("privacy-options");
  const getConsent = () => { try {return localStorage.getItem(key)} catch (err) {return null} };
  const setConsent = value => {try {localStorage.setItem(key,value)} catch (err) {} if(banner) banner.hidden=true; if(value==="granted") loadGTM();};
  let gtmLoaded=false;
  function loadGTM(){
    if(gtmLoaded||getConsent()!=="granted")return;
    gtmLoaded=true;
    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push({"gtm.start":Date.now(),event:"gtm.js"});
    const script=document.createElement("script");script.async=true;
    script.src="https://www.googletagmanager.com/gtm.js?id=GTM-KWG5W6XZ";
    document.head.appendChild(script);
  }
  if(banner){banner.hidden=getConsent()==="granted"||getConsent()==="denied";}
  if(getConsent()==="granted")loadGTM();
  if(accept)accept.addEventListener("click",()=>setConsent("granted"));
  if(reject)reject.addEventListener("click",()=>setConsent("denied"));
  if(settings)settings.addEventListener("click",()=>{if(banner)banner.hidden=false;});
  document.querySelectorAll("[data-rail][data-scroll]").forEach(button=>{
    button.addEventListener("click",()=>{
      const rail=document.getElementById(button.dataset.rail);
      if(!rail)return;
      rail.scrollBy({left:(Number(button.dataset.scroll)||1)*Math.min(250,rail.clientWidth*.84),behavior:"smooth"});
    });
  });
  // Marketplace FutTalento: busca sem dependência de backend e filtros somente por dados documentados.
  const rail=document.getElementById('talentRail');
  const search=document.getElementById('athleteSearch');
  const club=document.getElementById('clubFilter');
  const category=document.getElementById('categoryFilter');
  const count=document.getElementById('resultCount');
  const empty=document.getElementById('emptyResults');
  const chips=[...document.querySelectorAll('[data-club]')];
  const cards=[...document.querySelectorAll('.talent-card[data-athlete]')];
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const reset=()=>{if(search)search.value='';if(club)club.value='todos';if(category)category.value='todos';filter();};
  function filter(){
    if(!search||!club||!category||!rail)return;
    const term=normalize(search.value),selectedClub=club.value,selectedCategory=category.value;
    let visible=0;
    cards.forEach(card=>{
      const clubNames=(card.dataset.clubs||'').split(' ');
      const matchesTerm=!term||normalize(card.dataset.keywords).includes(term);
      const matchesClub=selectedClub==='todos'||clubNames.includes(selectedClub);
      const matchesCategory=selectedCategory==='todos'||card.dataset.category===selectedCategory;
      const show=matchesTerm&&matchesClub&&matchesCategory;
      card.hidden=!show;
      if(show)visible++;
    });
    if(count)count.textContent=visible+' atleta'+(visible!==1?'s':'')+' com trajetória publicada'+(visible!==1?'s':'');
    if(empty){
      empty.hidden=visible>0;
      const text=empty.querySelector('p');
      if(text)text.textContent=selectedClub==='internacional'?
        'O Internacional está preparado como filtro, mas não há vínculo esportivo documentado com esse clube nos três perfis cadastrados. Mais atletas poderão entrar na vitrine.':
        selectedCategory!=='todos'&&selectedCategory!=='pendente'?
        'As categorias de base ainda estão sendo confirmadas documentalmente. Evitamos classificar atletas menores por suposição.':
        'Experimente outro clube ou termo de busca. Exibimos apenas vínculos esportivos e informações publicadas.';
    }
    chips.forEach(chip=>{const active=chip.dataset.club===selectedClub;chip.classList.toggle('is-active',active);chip.setAttribute('aria-pressed',String(active));});
    if(rail)rail.scrollLeft=0;
    updateArrows();
  }
  function updateArrows(){
    const prev=document.getElementById('railPrev'),next=document.getElementById('railNext');
    if(!rail||!prev||!next)return;
    const overflow=rail.scrollWidth-rail.clientWidth>8;
    prev.disabled=!overflow||rail.scrollLeft<6;
    next.disabled=!overflow||rail.scrollLeft>rail.scrollWidth-rail.clientWidth-6;
  }
  search?.addEventListener('input',filter);
  club?.addEventListener('change',filter);
  category?.addEventListener('change',filter);
  chips.forEach(chip=>chip.addEventListener('click',()=>{if(club){club.value=chip.dataset.club;filter();}}));
  document.getElementById('resetFilters')?.addEventListener('click',reset);
  document.getElementById('emptyReset')?.addEventListener('click',reset);
  document.getElementById('railPrev')?.addEventListener('click',()=>rail?.scrollBy({left:-rail.clientWidth*.85,behavior:'smooth'}));
  document.getElementById('railNext')?.addEventListener('click',()=>rail?.scrollBy({left:rail.clientWidth*.85,behavior:'smooth'}));
  rail?.addEventListener('scroll',updateArrows,{passive:true});
  window.addEventListener('resize',updateArrows,{passive:true});
  if(club){
    const preset=new URLSearchParams(location.search).get('clube');
    if(preset&&[...club.options].some(option=>option.value===preset))club.value=preset;
  }
  filter();
  document.querySelectorAll("a.tracked[data-action]").forEach(link=>{
    link.addEventListener("click",()=>{
      if(getConsent()!=="granted")return;
      window.dataLayer=window.dataLayer||[];
      // Nunca inclua nomes de menores, endereços, telefones ou identificadores pessoais nos eventos.
      window.dataLayer.push({event:"futtalento_vitrine_click",interaction_type:link.dataset.action,interaction_context:link.dataset.context||"other"});
    });
  });
})();