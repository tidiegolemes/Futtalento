import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const onboarding=read('api/_athlete-onboarding.js');
test('Guardian only workflow, no public phone/email/birth date',()=>{
 const segment=onboarding.slice(onboarding.indexOf('const toPublic=r=>'),onboarding.indexOf('function validAthlete'));
 assert.match(segment,/slug:r.slug/);assert.match(segment,/name:r.athleteName/);
 for(const key of ['guardianPhone','guardianName','birthDate','passwordSalt','passwordHash','email:r.email'])
  assert.equal(segment.includes(key),false,key+' leaked into public record');
 assert.match(onboarding,/guardianEmailVerified:false/);
 assert.match(onboarding,/a.guardianEmailVerified=true/);
 assert.match(onboarding,/publicationConsent:true/);
});
test('Every public profile is gated by email confirmation and explicit guardian consent',()=>{
 assert.match(onboarding,/d\?\.publishedAt&&d\?\.guardianEmailVerified/);
 assert.match(onboarding,/d\?\.guardianConsent===true&&d\?\.publicationConsent===true/);
 assert.match(onboarding,/if\(!record\?\.publishedAt\|\|!record.guardianEmailVerified\)/);
 assert.match(onboarding,/FUTTALENTO_MAIL_API_KEY/);
 assert.match(onboarding,/Date.now\(\)\+15\*60000/);
});
test('No new Vercel function; existing routing remains intact for Pix and athlete index',()=>{
 const api=read('api/captacao-lead.js');
 assert.match(api,/import athleteOnboarding from '.\/\_athlete-onboarding.js'/);
 assert.match(api,/if\(req.query\?\.onboarding==='1'\)return athleteOnboarding/);
 assert.match(api,/if\(req.query\?\.pixCheckout==='1'\)return checkout/);
 assert.match(api,/if\(req.query\?\.indice==='1'\)return indiceAtletas/);
});
test('Registration, marketplace and profile use the guarded onboard route',()=>{
 const register=read('atletas/cadastrar/cadastro.js');
 const marketplace=read('atletas/index.html');
 const profile=read('atletas/perfil/perfil.js');
 const directory=read('atletas/inscritos.js');
 assert.match(register,/const route='\/api\/captacao-lead\?onboarding=1'/);
 assert.match(register,/fetch\(route\+'\&action=session'/);
 assert.match(register,/request\('resend',\{\}\)/);
 assert.match(marketplace,/\/atletas\/cadastrar\//);
 assert.match(marketplace,/src="\/atletas\/inscritos.js"/);
 assert.match(profile,/onboarding=1&action=profile/);
 assert.match(directory,/onboarding=1&action=list/);
 assert.match(directory,/ft-athletes-changed/);
});
test('Club accent and mobile responsiveness include Ryan, Lucas and Thalles',()=>{
 const ryan=read('atletas/ryan/index.html');
 const lucas=read('atletas/lucas/index.html');
 const thalles=read('atletas/thalles/index.html');
 const css=read('atletas/clube-acento.css');
 assert.match(ryan,/data-ft-club="cruzeiro-rs"/);
 assert.match(ryan,/class="athlete-hero ryan-mobile-hero"/);
 assert.match(lucas,/data-ft-club="gremio"/);
 assert.match(thalles,/data-ft-club="juventude"/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/\.ryan-cover/);
});
test('New athlete sponsorship request cannot silently generate Pix',()=>{
 const source=read('api/_athlete-onboarding.js');
 const interest=source.slice(source.indexOf("if(action==='interest')"),source.indexOf("if(action==='register')"));
 assert.match(interest,/pixIssued:false/);
 assert.doesNotMatch(interest,/efi\(/);
 assert.match(interest,/Acesso restrito à agência|leads\//);
});
