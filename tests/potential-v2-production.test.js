import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const content=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the production interface prioritizes verified potential, not legacy sports stars',()=>{
 const cards=content('atletas/reels-card.js');
 const widget=content('indice/widget.js');
 assert.match(cards,/record\?\.potential\?\.status==='validated'/);
 assert.match(cards,/potencial===null|potential===null/);
 assert.match(cards,/potencial de patrocínio|POTENCIAL DE PATROCÍNIO/i);
 assert.ok(cards.includes('Nota esportiva: ') || cards.includes('stats.sportsScore100'));
 assert.match(widget,/const v=data\.potential\|\|\{\}/);
 assert.ok(!widget.includes('const v=data.index||{}'));
});

test('the index public endpoint never promotes an unapproved or unauthenticated v2 score',()=>{
 const api=content('api/_indice-atletas.js');
 assert.match(api,/const isApproved=record\?\.publicApproved===true/);
 assert.match(api,/const show=result\?\.status==='validated'&&isApproved/);
 assert.match(api,/fetchAuthorizedInstagram\(body\.athlete\)/);
 assert.match(api,/ig\.status!=='conectado'/);
 assert.match(api,/V2_PREFIX\+body\.athlete/);
 assert.match(api,/guardianOrAgentAuthorized!==true/);
});

test('production methodology matches v2 weights and distinguishes sponsor results',()=>{
 const page=content('metodologia.html');
 assert.match(page,/Alcance e audiência · 35 pontos/);
 assert.match(page,/Engajamento e consistência · 30 pontos/);
 assert.match(page,/Trajetória esportiva · 20 pontos/);
 assert.match(page,/Ativação comercial · 15 pontos/);
 assert.match(page,/Em validação/);
 assert.ok(!page.includes('55 pontos'));
});

test('manual v2 activation is available in agency dashboard without replacing v1 records',()=>{
 const html=content('sponsor/lucas/gestao/indice/index.html');
 const js=content('sponsor/lucas/gestao/indice/gestao.js');
 assert.match(html,/id="v2Form"/);
 assert.match(js,/mode:'potential-v2'/);
 assert.match(html,/histórico v1/);
});
