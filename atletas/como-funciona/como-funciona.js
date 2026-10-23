/* FutTalento — visual sponsor explainer carousel. No analytics, payments or athlete data changed. */
(()=>{
 'use strict';
 const root=document.getElementById('supportHowCarousel');
 const track=document.getElementById('supportHowTrack');
 if(!root||!track)return;
 const slides=[...track.querySelectorAll('.support-how-slide')];
 const dots=[...root.querySelectorAll('[data-how-step]')];
 const previous=document.getElementById('supportHowPrev');
 const next=document.getElementById('supportHowNext');
 const counter=document.getElementById('supportHowCounter');
 if(slides.length!==4||dots.length!==slides.length)return;
 const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 let index=0,autoplay=null,onscreen=false,paused=false,pending=0;
 const setState=(i)=>{
  index=Math.max(0,Math.min(slides.length-1,i));
  dots.forEach((dot,n)=>{
   const current=n===index;
   dot.classList.toggle('is-active',current);
   if(current)dot.setAttribute('aria-current','step');
   else dot.removeAttribute('aria-current');
  });
  if(previous)previous.disabled=index===0;
  if(next)next.disabled=index===slides.length-1;
  if(counter)counter.textContent=(index+1)+' / '+slides.length;
 };
 const go=(n,user=false)=>{
  const desired=Math.max(0,Math.min(slides.length-1,n));
  if(user){paused=true;stop()}
  setState(desired);
  const left=desired*track.clientWidth;
  if(typeof track.scrollTo==='function'){
   track.scrollTo({left,behavior:reduce?.matches||!user?'instant':'smooth'});
  }else track.scrollLeft=left;
 };
 const stop=()=>{if(autoplay!==null){window.clearInterval(autoplay);autoplay=null}};
 const start=()=>{
  stop();
  if(!onscreen||paused||reduce?.matches||document.hidden)return;
  autoplay=window.setInterval(()=>{
   if(index>=slides.length-1){stop();return}
   go(index+1);
  },7000);
 };
 const sync=()=>{
  const width=track.clientWidth;
  if(width) setState(Math.round(track.scrollLeft/width));
 };
 track.addEventListener('scroll',()=>{
  if(pending)window.cancelAnimationFrame(pending);
  pending=window.requestAnimationFrame(()=>{pending=0;sync()});
 },{passive:true});
 next?.addEventListener('click',()=>go(index+1,true));
 previous?.addEventListener('click',()=>go(index-1,true));
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>go(i,true)));
 track.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'){event.preventDefault();go(index+1,true)}
  else if(event.key==='ArrowLeft'){event.preventDefault();go(index-1,true)}
  else if(event.key==='Home'){event.preventDefault();go(0,true)}
  else if(event.key==='End'){event.preventDefault();go(slides.length-1,true)}
 });
 // Touch-swipe works natively via CSS scroll snapping; stop autoplay on manual use.
 track.addEventListener('pointerdown',()=>{paused=true;stop()},{passive:true});
 root.addEventListener('focusin',()=>{paused=true;stop()});
 root.addEventListener('mouseenter',()=>{stop()});
 root.addEventListener('mouseleave',()=>{start()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()});
 window.addEventListener('resize',()=>{go(index);sync()},{passive:true});
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
   onscreen=entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.35);
   if(onscreen)start();else stop();
  },{threshold:[0,.35,.7]});
  observer.observe(root);
 }
 setState(0);
})();
