import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const content=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('vitrine highlights only the documented sporting note, without v2 pending-star panel',()=>{
 const cards=content('atletas/reels-card.js');
 assert.match(cards,/NOTA ESPORTIVA/);
 assert.match(cards,/score=stats.sportsScore100/);
 assert.match(cards,/entry.starsFill.style.width=score===null/);
 assert.doesNotMatch(cards,/ft-r-score-details|ft-r-potential-details|entry.potentialBody/);
 assert.doesNotMatch(cards,/entry.badge.querySelector\('.ft-r-rating-value'\).textContent=potential/);
 assert.match(cards,/Não são avaliações de usuários/);
});

test('the source of the method remains in the footer instead of cluttering cards',()=>{
 const page=content('atletas/index.html');
 assert.match(page,/href="\/metodologia.html">Como funciona a pontuação<\/a>/);
 assert.ok(!page.includes('Potencial de Patrocínio: em validação'));
});

test('v2 score remains available internally, with official Meta verification before publication',()=>{
 const api=content('api/_indice-atletas.js');
 assert.match(api,/fetchAuthorizedInstagram\(body.athlete\)/);
 assert.match(api,/ig.status!=='conectado'/);
 assert.match(api,/guardianOrAgentAuthorized!==true/);
 assert.match(api,/const show=result\?\.status==='validated'&&isApproved/);
 const engine=content('indice/sponsor-potential-v2.js');
 assert.match(engine,/POTENTIAL_VERSION='2.0'/);
});

test('agency dashboard retains voluntary v2 publication flow',()=>{
 const dashboard=content('sponsor/lucas/gestao/indice/index.html');
 assert.match(dashboard,/id="v2Form"/);
});
