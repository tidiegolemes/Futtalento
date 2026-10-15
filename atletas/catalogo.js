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
  document.querySelectorAll("a.tracked[data-action]").forEach(link=>{
    link.addEventListener("click",()=>{
      if(getConsent()!=="granted")return;
      window.dataLayer=window.dataLayer||[];
      // Nunca inclua nomes de menores, endereços, telefones ou identificadores pessoais nos eventos.
      window.dataLayer.push({event:"futtalento_vitrine_click",interaction_type:link.dataset.action,interaction_context:link.dataset.context||"other"});
    });
  });
})();