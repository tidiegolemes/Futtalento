import {ATHLETES,FIELDS,calculateIndex} from '/indice/score.js';
const $=id=>document.getElementById(id);
let loading=false;
let autoSeq=0;
let pendingAuto=null;
const safeNode=(tag,text,cls)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const autoButton=$('autoSync');
const autoApply=$('autoApply');
autoApply.addEventListener('click',()=>{
 if(!pendingAuto||!ATHLETES.includes($('athlete').value))return;
 let applied=0;
 for(const input of document.querySelectorAll('[data-score-field]')){
  const key=input.dataset.scoreField, value=pendingAuto.metrics?.[key];
  if(!Number.isFinite(value)||input.value.trim()===String(value))continue;
  input.value=String(value);applied++;
 }
 autoApply.hidden=true;
 $('autoStatus').textContent=applied+' valor(es) atualizados com base nas fontes apresentadas. Confira o relatório antes de salvar e publicar.';
 preview();
});
async function autoSync(){
 const athlete=$('athlete').value;
 if(!ATHLETES.includes(athlete))return;
 const seq=++autoSeq;
 pendingAuto=null;
 autoApply.hidden=true;
 autoButton.disabled=true;
 $('autoStatus').textContent='Consultando sites oficiais e conexões autorizadas...';
 $('autoFindings').replaceChildren();
 $('autoFindings').hidden=true;
 try{
  const url='/api/captacao-lead?indice=1&mode=autofill&atleta='+encodeURIComponent(athlete);
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||'Não foi possível consultar as fontes');
  if(seq!==autoSeq||athlete!==$('athlete').value)return;
  pendingAuto=data.suggestions;
  const permission=$('autoPermission');
  if(permission.dataset.loadedFor!==athlete){
    permission.checked=data.current?.automaticUpdatesAuthorized===true;
    permission.dataset.loadedFor=athlete;
  }
  const source=data.suggestions;
  let filled=0,changed=0;
  for(const input of document.querySelectorAll('[data-score-field]')){
   const key=input.dataset.scoreField,value=source.metrics?.[key];
   if(value===undefined||value===null||!Number.isFinite(value))continue;
   if(input.value.trim()===''){
    input.value=String(value);
    filled++;
   }else if(Number(input.value)!==value){changed++;}
  }
  // Do not silently replace approved historical measurements.
  const srcNames=[];
  const findings=$('autoFindings');
  const sports=safeNode('div',undefined,'auto-source');
  sports.append(safeNode('strong','Histórico esportivo · '+(source.sports?'fonte consultada':'indisponível')));
  if(source.sports?.events?.length){
   for(const evt of source.sports.events){
    sports.append(safeNode('p','✓ '+evt.label+' ('+evt.year+')'));
   }
   if(Number.isFinite(source.sports.metrics?.clubMonths))sports.append(safeNode('p','✓ Tempo no clube: pelo menos '+source.sports.metrics.clubMonths+' meses, conforme intervalo anual publicado.'));
   if(source.sports.caveat)sports.append(safeNode('small',source.sports.caveat));
   const sourceLink=safeNode('a','Abrir fonte oficial ↗');
   sourceLink.href=source.sports.source;sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';
   sports.append(sourceLink);
   srcNames.push(source.sourceLabel);
  }else{
   sports.append(safeNode('p','Nenhum marco correspondente encontrado nesta consulta. Sem estimativas.'));
  }
  findings.append(sports);
  const social=safeNode('div',undefined,'auto-source');
  const state=source.instagram?.status||'nao_configurado';
  social.append(safeNode('strong','Instagram · '+({
   conectado:'conectado à Meta',conectado_parcial:'conexão parcial',nao_configurado:'conexão não autorizada',falha_permissao_ou_api:'acesso indisponível',conta_nao_corresponde:'perfil diferente do atleta — integração recusada'
  }[state]||'dados pendentes')));
  if(state.startsWith('conectado')){
   for(const k of ['followers','reach28d','interactions28d']){
    const val=source.instagram.metrics?.[k];
    social.append(safeNode('p',val===undefined||val===null?(labels[k]+' — não disponível na API'):(labels[k]+': '+val.toLocaleString('pt-BR'))));
   }
   srcNames.push('Instagram Insights autorizado');
  }else{
   social.append(safeNode('p','A leitura de seguidores e alcance exige uma conta profissional autorizada com acesso aos Insights pela API oficial. Nenhum valor será estimado pela aparência do perfil.'));
  }
  findings.append(social);
  const commercial=safeNode('div',undefined,'auto-source');
  commercial.append(safeNode('strong','Apoiadores e entregas · '+(source.commercial?.status==='registros_agencia_aprovados'?'registros internos verificados':'em integração')));
  if(source.commercial?.status==='registros_agencia_aprovados'){
   commercial.append(safeNode('p',String(source.commercial.metrics.partnersActive)+' apoiador(es) com condições aprovadas pela agência.'));
   commercial.append(safeNode('p',String(source.commercial.metrics.deliveriesCompleted)+' entregas publicadas/confirmadas com evidência identificada.'));
   commercial.append(safeNode('small','O Pix piloto e empresas apenas listadas no site não entram na contagem.'));
   srcNames.push('registros comerciais EyAgência');
  }else{
   commercial.append(safeNode('p','Sem contratos comerciais aprovados integráveis para este atleta. Nenhum apoiador é presumido.'));
  }
  findings.append(commercial);
  for(const warning of source.warnings||[])findings.append(safeNode('small',warning));
  findings.hidden=false;
  if(filled>0&&!$('reference').value.trim()){
   $('reference').value=('Sincronização de fontes oficiais: '+srcNames.join(' + ')).slice(0,150);
   $('source').value='gestao_interna';
  }
  autoApply.hidden=changed===0;
  const latest=data.lastAutomation;
  const states={atualizado:'índice atualizado',sem_alteracao:'dados confirmados',
    aguardando_aprovacao_inicial:'aguardando primeira publicação',
    aguardando_autorizacao_continua:'aguardando autorização para rotina',
    aguardando_meta_insights:'aguardando conexão oficial do Instagram',
    inconsistencia_metricas:'métricas precisam de revisão'};
  const routine=latest?.checkedAt?' Rotina diária '+latest.checkedAt.slice(0,10).split('-').reverse().join('/')+': '+(states[latest.status]||latest.status)+'.':'';
  $('autoStatus').textContent=filled+' indicador(es) preenchido(s) automaticamente. '+(changed?changed+' valor(es) divergentes preservados; use "Aplicar novos valores" se desejar atualizar.':'Nenhum dado existente foi sobrescrito.')+routine;
  preview();
 }catch(e){
  if(seq!==autoSeq)return;
  $('autoStatus').textContent=e.message||'Erro ao consultar fontes';
 }finally{
  if(seq===autoSeq)autoButton.disabled=false;
 }
}
autoButton.addEventListener('click',autoSync);
const labels={followers:'seguidores',reach28d:'contas alcançadas',interactions28d:'interações',growth28dPct:'crescimento',titlesVerified:'títulos',competitionsVerified:'competições',clubMonths:'meses de clube',partnersActive:'apoiadores',deliveriesCompleted:'entregas'};
const fromForm=()=>Object.fromEntries([...document.querySelectorAll('[data-score-field]')].map(input=>[input.dataset.scoreField,input.value.trim()===''?null:Number(input.value)]));
function preview(){
 const report=calculateIndex({metrics:fromForm(),observedAt:$('observedAt').value});
 $('preview').textContent='Cobertura atual: '+report.coverage+'/100 pontos possíveis. '+(report.value===null?'Índice não divulgado: faltam dados suficientes ou atualizados.':'Índice calculado: '+report.value+'/100 · '+report.level+'.')+' Os espaços vazios representam dados indisponíveis.';
}
const clean=()=>{for(const input of document.querySelectorAll('[data-score-field]'))input.value='';$('reference').value='';$('guardian').checked=false;$('approved').checked=false;$('autoPermission').checked=false;$('autoPermission').dataset.loadedFor='';$('observedAt').value=new Date().toISOString().slice(0,10);preview();};
async function load(){
 const athlete=$('athlete').value;
 if(!ATHLETES.includes(athlete))return;
 clean();$('status').textContent='Carregando medições já publicadas...';
 try{
 const r=await fetch('/api/captacao-lead?indice=1&atleta='+encodeURIComponent(athlete),{credentials:'same-origin',cache:'no-store'});
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
 await autoSync();
 }catch(e){$('status').textContent=e.message||'Falha na consulta';await autoSync();}
}
$('athlete').addEventListener('change',()=>{
 ++autoSeq;
 pendingAuto=null;
 autoApply.hidden=true;
 load();
});
$('loadCurrent').addEventListener('click',load);
$('observedAt').addEventListener('input',preview);
document.querySelectorAll('[data-score-field]').forEach(x=>x.addEventListener('input',preview));
$('scoreForm').addEventListener('submit',async e=>{
 e.preventDefault();
 if(loading)return;
 const metrics=fromForm(),athlete=$('athlete').value;
 if(!ATHLETES.includes(athlete)||FIELDS?.length===0)return;
 const payload={athlete,observedAt:$('observedAt').value,source:$('source').value,reference:$('reference').value.trim(),
  metrics,guardianOrAgentAuthorized:$('guardian').checked,publicApproved:$('approved').checked,
  automaticUpdatesAuthorized:$('autoPermission').checked};
 loading=true;$('saveIndex').disabled=true;$('status').textContent='Gravando indicadores na área protegida...';
 try{
 const r=await fetch('/api/captacao-lead?indice=1',{method:'POST',credentials:'same-origin',cache:'no-store',
 headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const obj=await r.json();
 if(!r.ok)throw Error(obj.error||'Não foi possível salvar');
 $('status').textContent='Indicadores atualizados para '+athlete+'. '+(obj.index?.value===null?'O índice público permanece em formação.':'Índice publicado: '+obj.index.value+'/100.');
 $('guardian').checked=false;$('approved').checked=false;preview();
 }catch(err){$('status').textContent=err.message||'Erro ao salvar.'}
 finally{loading=false;$('saveIndex').disabled=false}
});
clean();load();
