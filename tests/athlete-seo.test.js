import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Individual public athlete pages include valid Google ProfilePage, Person and breadcrumbs',()=>{
 for(const slug of ['ryan','lucas','thalles']){
  const html=read('atletas/'+slug+'/index.html');
  const json=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(json,slug+' needs JSON-LD');
  const graph=JSON.parse(json[1])['@graph'];
  const page=graph.find(n=>n['@type']==='ProfilePage');
  const person=graph.find(n=>n['@type']==='Person');
  const breadcrumb=graph.find(n=>n['@type']==='BreadcrumbList');
  assert.ok(page&&person&&breadcrumb,slug+' requires profile, person, breadcrumbs');
  assert.equal(page.mainEntity['@id'],person['@id']);
  assert.ok(person.name&&person.image&&person.jobTitle&&person.affiliation?.name);
  assert.equal(person.url,'https://www.futtalento.com.br/atletas/'+slug+'/');
  for(const field of ['birthDate','guardianPhone','guardianName','birthPlace'])
   assert.equal(Object.hasOwn(person,field),false,slug+' exposes '+field);
 }
});
test('Static sitemap lists named athlete pages, with a separate dynamic sitemap for verified profiles',()=>{
 const xml=read('sitemap.xml');
 for(const slug of ['ryan','lucas','thalles'])
  assert.ok(xml.includes('https://www.futtalento.com.br/atletas/'+slug+'/'));
 const config=JSON.parse(read('vercel.json'));
 assert.ok(config.rewrites.some(r=>r.source==='/sitemap-atletas.xml'&&r.destination.includes('action=sitemap')));
 const robots=read('robots.txt');
 assert.ok(robots.includes('Sitemap: https://www.futtalento.com.br/sitemap-atletas.xml'));
 const api=read('api/_athlete-onboarding.js');
 assert.match(api,/if\(action==='sitemap'\)/);
 assert.match(api,/const published=await publishedList\(\)/);
 assert.match(api,/guardianConsent===true&&d\?\.publicationConsent===true/);
});
test('Registered athlete JSON-LD contains only public profile fields',()=>{
 const js=read('atletas/perfil/perfil.js');
 assert.match(js,/ft-athlete-structured-data/);
 assert.match(js,/canonicalNode.href=canonical/);
 assert.match(js,/new URL\(p.image,location.origin\)/);
 const meta=js.slice(js.indexOf('const person={'),js.indexOf('const graph={'));
 for(const secret of ['birthDate','guardianEmail','guardianPhone','guardianName'])
  assert.equal(meta.includes(secret),false,'potential disclosure '+secret);
});
