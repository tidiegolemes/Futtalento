import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../',import.meta.url);
const ignore=new Set(['admin/index.html','matchday.html','match-result.html']);
const themed={
 'landing':new Set(['para-familias/index.html','para-empresas/index.html']),
 'marketplace':new Set(['atletas/index.html','atletas/cadastro/index.html']),
 'profile':new Set(['atletas/lucas/index.html','atletas/thalles/index.html','atletas/perfil/index.html']),
 'journey':new Set(['sponsor/lucas/index.html','apoiador/index.html']),
 'checkout':new Set(['checkout/index.html']),
 'workspace':new Set([
  'apoiador/assinatura/index.html',
  'sponsor/lucas/gestao/index.html',
  'sponsor/lucas/gestao/captacao/index.html',
  'sponsor/lucas/gestao/assinaturas/index.html',
  'sponsor/lucas/gestao/indice/index.html',
  'atletas/cadastro/revisao.html'
 ])
};
const allFiles=(directory='')=>{
 const found=[];
 for(const entry of readdirSync(new URL(directory||'./',root),{withFileTypes:true})){
  if(['node_modules','.git'].includes(entry.name))continue;
  const p=directory+entry.name;
  if(entry.isDirectory())found.push(...allFiles(p+'/'));
  else if(p.endsWith('.html'))found.push(p);
 }
 return found;
};
const paths=allFiles();
const themeFor=path=>Object.entries(themed).find(([,set])=>set.has(path))?.[0]||'core';
test('Every browsable FutTalento HTML page loads a versioned common design layer',()=>{
 assert.ok(paths.length>=31);
 for(const p of paths.filter(x=>!ignore.has(x))){
  const html=readFileSync(new URL(p,root),'utf8');
  assert.match(html,/<link rel="stylesheet" href="\/assets\/futtalento-theme\.css">/,p);
  assert.match(html,new RegExp('data-ft-theme="'+themeFor(p)+'"'),p);
  assert.equal((html.match(/data-ft-theme=/g)||[]).length,1,p);
 }
});
test('Shared palette is family scoped so Pix, permissions and editorial artwork remain untouched',()=>{
 const css=readFileSync(new URL('assets/futtalento-theme.css',root),'utf8');
 for(const family of ['marketplace','core','landing','profile','journey','checkout','workspace'])
  assert.ok(css.includes('data-ft-theme="'+family+'"'),family);
 assert.ok(css.includes('embedded-pay'));
 for(const ignored of ignore){
  const html=readFileSync(new URL(ignored,root),'utf8');
  assert.doesNotMatch(html,/data-ft-theme=/);
 }
});
test('Existing athlete search, Pix iframe, permuta and endpoints are structurally preserved',()=>{
 const market=readFileSync(new URL('atletas/index.html',root),'utf8');
 const checkout=readFileSync(new URL('checkout/index.html',root),'utf8');
 const family=readFileSync(new URL('sponsor/lucas/index.html',root),'utf8');
 assert.match(market,/id="athleteSearch"/);
 assert.match(market,/id="supportHowCarousel"/);
 assert.match(market,/id="ftInlineCheckout"/);
 assert.match(market,/id="ftBarterForm"/);
 assert.match(checkout,/id="athlete"/);
 assert.match(checkout,/id="plan"/);
 assert.match(family,/id="loginForm"/);
});
