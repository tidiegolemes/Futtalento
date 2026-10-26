import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Página de famílias mostra e-mail primeiro, nunca ficha completa na dobra inicial',()=>{
 const html=file('para-familias/index.html'),signup=file('atletas/cadastrar/index.html');
 assert.match(html,/id="ftFamilyRegistration"/);
 assert.match(html,/Primeiro, seu e-mail/);
 assert.match(signup,/id="ftEntry"/);
 assert.match(signup,/id="ftEmailStart"/);
 assert.match(signup,/id="ftPasswordPane"[^>]*hidden/);
 assert.match(signup,/id="ftRegister"[^>]*hidden/);
 assert.match(signup,/id="ftLogin"[^>]*hidden/);
 assert.match(signup,/id="ftGoogleSignIn"[^>]*hidden/);
});
test('Criar conta antes de registrar atleta; recuperação de rascunho por login ou cookie',()=>{
 const js=file('atletas/cadastrar/cadastro.js'),api=file('api/_athlete-onboarding.js');
 assert.match(js,/request\('start'/);
 assert.match(js,/request\('complete'/);
 assert.match(js,/data\.needsProfile/);
 assert.match(js,/if\(data\.needsProfile\)\{show\(register/);
 assert.match(api,/if\(action==='start'\)/);
 assert.match(api,/if\(action==='complete'\)/);
 assert.match(api,/status:'rascunho'/);
 assert.match(api,/needsProfile:!a\.slug/);
 assert.match(api,/needsProfile:!!a&&!a\.slug/);
 assert.match(api,/const a=await requireAccount\(req\)/);
});
test('Google opcional só aparece após configuração e ID token validado no backend',()=>{
 const js=file('atletas/cadastrar/cadastro.js'),api=file('api/_athlete-onboarding.js');
 assert.match(js,/data\.clientId/);
 assert.match(js,/script\.src='https:\/\/accounts\.google\.com\/gsi\/client'/);
 assert.match(js,/request\('google',\{credential:response\.credential\}\)/);
 assert.match(api,/FUTTALENTO_GOOGLE_CLIENT_ID/);
 assert.match(api,/googleResponse\.ok/);
 assert.match(api,/identity\.aud!==clientId/);
 assert.match(api,/identity\.email_verified/);
 assert.match(api,/identity\.sub/);
});
test('Menores jamais são publicados sem consentimento do responsável autenticado',()=>{
 const api=file('api/_athlete-onboarding.js');
 assert.match(api,/const checked=validAthlete\(body\),photo=imageFrom\(body\)/);
 assert.match(api,/guardianConsent!==true/);
 assert.match(api,/publicationConsent!==true/);
 assert.match(api,/if\(!a\.slug\|\|!a\.guardianConsent\|\|!a\.publicationConsent\)/);
 assert.match(api,/if\(!record\?\.publishedAt\|\|!record\.guardianEmailVerified\)/);
 const segment=api.slice(api.indexOf('const toPublic=r=>'),api.indexOf('function validAthlete'));
 for(const forbidden of ['guardianPhone','guardianName','birthDate','passwordHash'])
  assert.equal(segment.includes(forbidden),false);
});
