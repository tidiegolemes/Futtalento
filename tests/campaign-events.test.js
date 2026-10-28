import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ingest=read('api/campaign-event.js'),report=read('api/campaign-report.js');
const store=read('api/_campaign-events.js'),links=read('apoiadores/lucas/index.html');
const agency=read('sponsor/lucas/painel.js'),partner=read('apoiador/painel.js');
test('Click events require consent, validated partner and same-site origin',()=>{
 assert.match(ingest,/consent!==true/);
 assert.ok(ingest.includes("origin!=='https://'+host"));
 assert.match(ingest,/validPartner\(partner\)/);
 assert.match(store,/ACTIONS=new Set/);
});
test('Private sponsor report cannot be cross-read by individual partner',()=>{
 assert.match(report,/authenticatePartner\(req\)/);
 assert.match(report,/agency\?String\(req\.query\?\.partner\|\|''\):session\.partner/);
 assert.match(report,/private, no-store/);
});
test('Campaign link contains partner and creative; click tracking follows consent',()=>{
 assert.match(agency,/utm_content:creative/);
 assert.match(agency,/partner,utm_source:/);
 assert.match(links,/ft_campaign_/);
 assert.match(links,/pref!=='granted'/);
 assert.match(links,/sendBeacon/);
});
test('UI reports clicks without misrepresenting messages or sales',()=>{
 assert.match(partner,/Cliques rastreados para a empresa/);
 assert.match(agency,/Cliques não comprovam novos seguidores, conversas nem vendas/);
});
