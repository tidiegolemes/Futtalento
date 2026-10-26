import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Mother page registers a guardian directly without the old lead form',()=>{
 const html=read('para-familias/index.html');
 assert.match(html,/id="ftMotherSignup"/);
 assert.match(html,/src="\/captacao\/maes-inline\.js"/);
 assert.doesNotMatch(html,/id="leadForm"/);
 assert.doesNotMatch(html,/src="\/captacao\/landing\.js"/);
 assert.match(html,/href="#inscricao"/);
});
test('Inline register mounts the existing secure account and athlete profile in place',()=>{
 const script=read('captacao/maes-inline.js');
 assert.match(script,/DOMParser/);
 assert.match(script,/replaceChildren\(auth,profile\)/);
 assert.match(script,/atletas\/cadastro\/cadastro\.js/);
 const form=read('atletas/cadastro/index.html');
 assert.match(form,/id="authForm"/);
 assert.match(form,/id="profileForm"/);
 assert.match(form,/name="guardianPhone"/);
 assert.match(form,/name="name"/);
});
test('New athlete details remain private before explicit agency approval',()=>{
 const api=read('api/_atletas-cadastro.js');
 const route=read('api/captacao-lead.js');
 assert.match(api,/consentToDisplay/);
 assert.match(api,/action==='approve'/);
 assert.match(api,/authenticate\(req\)/);
 const exposed=api.match(/const stripPublic=\(p\)=>\(\{([\s\S]*?)\}\);/);
 assert.ok(exposed,'Public field allowlist exists');
 assert.doesNotMatch(exposed[1],/guardianPhone|guardianName|birthDate|passwordDigest|email/);
 assert.match(route,/if\(req\.query\?\.cadastroAtleta==='1'\)return cadastroAtleta\(req,res\)/);
});
test('Mobile Ryan page uses official club accent and signup remains linked from marketplace',()=>{
 const ryan=read('atletas/ryan/index.html');
 assert.match(ryan,/mobile-cruzeiro\.css/);
 assert.match(ryan,/ft-athlete-cruzeiro/);
 const marketplace=read('atletas/index.html');
 assert.match(marketplace,/href="\/atletas\/cadastro\/"/);
 assert.match(marketplace,/novos-publicados\.js/);
});
