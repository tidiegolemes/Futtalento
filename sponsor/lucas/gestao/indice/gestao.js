import {ATHLETES,FIELDS,calculateIndex} from '/indice/score.js';
const $=id=>document.getElementById(id);
let loading=false;
const labels={followers:'seguidores',reach28d:'contas alcançadas',interactions28d:'interações',growth28dPct:'crescimento',titlesVerified:'títulos',competitionsVerified:'competições',clubMonths:'meses de clube',partnersActive:'apoiadores',deliveriesCompleted:'entregas'};
const fromForm=()=>Object.fromEntries([...document.querySelectorAll('[data-score-field]')].map(input=>[input.dataset.scoreField,input.value.trim()===''?null:Number(input.value)]));
function preview(){
 const report=calculateIndex({metrics:fromForm(),observedAt:$('observedAt').value});
 $('preview').textContent='Cobertura atual: '+report.coverage+'/100 pontos possíveis. '+(report.value===null?'Índice não divulgado: faltam dados suficientes ou atualizados.':'Índice calculado: '+report.value+'/100 · '+report.level+'.')+' Os espaços vazios representam dados indisponíveis.';
}
const clean=()=>{for(const input of document.querySelectorAll('[data-score-field]'))input.value='';$('reference').value='';$('guardian').checked=false;$('approved').checked=false;$('observedAt').value=new Date().toISOString().slice(0,10);preview();};
async function load(){
 const athlete=$('athlete').value;
 if(!ATHLETES.includes(athlete))return;
 clean();$('status').textContent='Carregando medições já publicadas...';
 try{
 const r=await fetch('/api/indice-atletas?atleta='+encodeURIComponent(athlete),{credentials:'same-origin',cache:'no-store'});
 const obj=await r.json();
 if(!r.ok)throw Error(obj.error||'Consulta indisponível');
 if(obj.metrics){
  for(const input of document.querySelectorAll('[data-score-field]')){
   const v=obj.metrics[input.dataset.scoreField];
   input.value=v===null||v===undefined?'':String(v);
  }
  $('observedAt').value=obj.index?.observedAt?.slice(0,10)||$('observedAt').value;
 }
 $('status').textContent=obj.metrics?'Indicadores publicados carregados. Confira a referência antes de salvar.':'Nenhuma medição aprovada cadastrada para este atleta.';
 preview();
 }catch(e){$('status').textContent=e.message||'Falha na consulta'}
}
$('athlete').addEventListener('change',load);
$('loadCurrent').addEventListener('click',load);
$('observedAt').addEventListener('input',preview);
document.querySelectorAll('[data-score-field]').forEach(x=>x.addEventListener('input',preview));
$('scoreForm').addEventListener('submit',async e=>{
 e.preventDefault();
 if(loading)return;
 const metrics=fromForm(),athlete=$('athlete').value;
 if(!ATHLETES.includes(athlete)||FIELDS?.length===0)return;
 const payload={athlete,observedAt:$('observedAt').value,source:$('source').value,reference:$('reference').value.trim(),
  metrics,guardianOrAgentAuthorized:$('guardian').checked,publicApproved:$('approved').checked};
 loading=true;$('saveIndex').disabled=true;$('status').textContent='Gravando indicadores na área protegida...';
 try{
 const r=await fetch('/api/indice-atletas',{method:'POST',credentials:'same-origin',cache:'no-store',
 headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const obj=await r.json();
 if(!r.ok)throw Error(obj.error||'Não foi possível salvar');
 $('status').textContent='Indicadores atualizados para '+athlete+'. '+(obj.index?.value===null?'O índice público permanece em formação.':'Índice publicado: '+obj.index.value+'/100.');
 $('guardian').checked=false;$('approved').checked=false;preview();
 }catch(err){$('status').textContent=err.message||'Erro ao salvar.'}
 finally{loading=false;$('saveIndex').disabled=false}
});
clean();load();
