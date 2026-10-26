import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Para Famílias embeds an athlete registration, not an old lead form',()=>{
 const html=read('para-familias/index.html');
 assert.match(html,/id="ftFamilyRegistration"/);
 assert.match(html,/src="\/captacao\/familias-inline\.js"/);
 assert.doesNotMatch(html,/id="leadForm"/);
 assert.doesNotMatch(html,/src="\/captacao\/landing\.js"/);
 assert.match(html,/href="#inscricao"/);
});
test('Embedded form uses the existing verified guardian workflow with native photo upload',()=>{
 const embed=read('captacao/familias-inline.js');
 const signup=read('atletas/cadastrar/index.html');
 assert.match(embed,/DOMParser/);
 assert.match(embed,/replaceChildren\(panel\)/);
 assert.match(embed,/\/atletas\/cadastrar\/cadastro\.js/);
 assert.match(signup,/id="ftRegister"/);
 assert.match(signup,/id="ftVerify"/);
 assert.match(signup,/name="photoFile"/);
 const server=read('api/_athlete-onboarding.js');
 assert.match(server,/guardianEmailVerified/);
 assert.match(server,/publicationConsent/);
});
test('Public marketplace and Pix integration remain unchanged',()=>{
 const directory=read('atletas/index.html');
 const api=read('api/captacao-lead.js');
 assert.match(directory,/id="talentRail"/);
 assert.match(directory,/id="ftInlineCheckout"/);
 assert.match(directory,/src="\/atletas\/inscritos\.js"/);
 assert.match(api,/if\(req.query\?\.pixCheckout==='1'\)/);
 assert.match(api,/if\(req.query\?\.onboarding==='1'\)/);
});
