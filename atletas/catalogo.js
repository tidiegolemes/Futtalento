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
  // Recent photos remain on athletes' official sites. Fall back to our existing copy if an asset goes missing.
  document.querySelectorAll('img[data-fallback]').forEach(image=>{
    const fallback=()=>{
      const src=image.getAttribute('data-fallback');
      if(!src||image.getAttribute('src')===src)return;
      image.removeAttribute('data-fallback');
      image.src=src;
    };
    image.addEventListener('error',fallback,{once:true});
    if(image.complete&&image.naturalWidth===0)fallback();
  });
  // Marketplace FutTalento: busca sem dependência de backend e filtros somente por dados documentados.
  const rail=document.getElementById('talentRail');
  const search=document.getElementById('athleteSearch');
  const count=document.getElementById('resultCount');
  const resetButton=document.getElementById('resetFilters');
  const empty=document.getElementById('emptyResults');
  const chips=[...document.querySelectorAll('.quick-chip[data-club]')];
  const cards=[...document.querySelectorAll('.talent-card[data-athlete]')];
  const permitted=new Set(chips.map(chip=>chip.dataset.club));
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const preset=new URLSearchParams(location.search).get('clube');
  let selectedClub=permitted.has(preset)?preset:'todos';

  function filter(){
    if(!search||!rail)return;
    const term=normalize(search.value);
    let visible=0;
    cards.forEach(card=>{
      const clubNames=(card.dataset.clubs||'').split(/\s+/);
      const matchesTerm=!term||normalize(card.dataset.keywords).includes(term);
      const matchesClub=selectedClub==='todos'||clubNames.includes(selectedClub);
      const show=matchesTerm&&matchesClub;
      card.hidden=!show;
      if(show)visible++;
    });
    if(count)count.textContent=visible===1?'1 talento encontrado':visible+' talentos encontrados';
    if(resetButton)resetButton.hidden=selectedClub==='todos'&&!term;
    if(empty){
      empty.hidden=visible>0;
      const message=empty.querySelector('p');
      if(message)message.textContent=selectedClub==='internacional'?
        'Ainda não há atleta com vínculo documentado ao Internacional nesta vitrine. Escolha outro clube ou veja todos.':
        'Nenhum atleta encontrado com esses filtros. Experimente outro clube ou faça uma nova busca.';
    }
    chips.forEach(chip=>{
      const active=chip.dataset.club===selectedClub;
      chip.classList.toggle('is-active',active);
      chip.setAttribute('aria-pressed',String(active));
    });
    rail.scrollLeft=0;
  }

  function updateClubUrl(){
    // Preserve checkout and marketing parameters while making selected club shareable.
    try{
      const url=new URL(location.href);
      if(selectedClub==='todos')url.searchParams.delete('clube');
      else url.searchParams.set('clube',selectedClub);
      window.history.replaceState(null,'',url.pathname+url.search+url.hash);
    }catch{/* Browsers with restricted history still support local filtering. */}
  }
  const reset=()=>{
    if(search)search.value='';
    selectedClub='todos';updateClubUrl();filter();
  };
  search?.addEventListener('input',filter);
  chips.forEach(chip=>chip.addEventListener('click',()=>{
    const club=chip.dataset.club;
    if(!permitted.has(club))return;
    selectedClub=club;updateClubUrl();filter();
  }));
  document.getElementById('resetFilters')?.addEventListener('click',reset);
  document.getElementById('emptyReset')?.addEventListener('click',reset);
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