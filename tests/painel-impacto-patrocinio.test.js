import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const family=read('api/family-state.js');
const partner=read('api/partner-state.js');
const sponsorPage=read('apoiador/index.html');
const sponsorUi=read('apoiador/painel.js');
const guardianUi=read('sponsor/lucas/jornada.js');
const guardianPage=read('sponsor/lucas/index.html');

test('Family impact only includes agency-confirmed and partner-verified evidence',()=>{
 assert.match(family,/function readImpactSummary/);
 assert.match(family,/x\.status==='confirmado'/);
 assert.match(family,/x\.status==='verified'/);
 assert.match(family,/\['publicado','confirmado'\]/);
 assert.match(family,/hasPartnerVerification/);
 assert.match(family,/revenueVerifiedByPartner/);
 assert.match(family,/revenueReportedByAgency/);
 assert.match(family,/readImpactSummary\(\)\.catch/);
});

test('Public API for partner results remains locked to the partner-specific session',()=>{
 assert.match(partner,/authenticatePartner\(req\)/);
 assert.match(partner,/if\(!session&&!agency\)/);
 assert.match(partner,/session\?\.partner/);
 assert.match(partner,/role:agency\?'agency':'partner'/);
});

test('Lucas mother can access private journey using verified and agency-approved guardian account only',()=>{
 assert.match(family,/async function approvedGuardian/);
 assert.match(family,/verify\(raw\?\.slice/);
 assert.match(family,/a\.guardianEmailVerified/);
 assert.match(family,/a\.claimStatus!=='approved'/);
 assert.match(family,/owner\?\.id!==auth\.id/);
 assert.match(family,/a\.managedAthlete!=='lucas'/);
 assert.match(family,/const user=authenticate\(req\)\|\|await approvedGuardian\(req\)/);
});

test('Family journey shows per-company proof stages, not invented engagement',()=>{
 assert.match(guardianPage,/id="ftFamilyImpactSummary"/);
 assert.match(guardianPage,/id="ftFamilyImpactCards"/);
 assert.match(guardianUi,/function renderImpact/);
 assert.match(guardianUi,/hasPartnerVerification/);
 assert.match(guardianUi,/Alcance do período/);
 assert.match(guardianUi,/não significa alcance exclusivo do post/);
 assert.match(guardianUi,/não somamos estes registros|não são somados para evitar duplicidade/i);
 assert.doesNotMatch(guardianUi,/score:\s*100/);
});

test('Partner executive report separates two attribution sources and is printable',()=>{
 assert.match(sponsorPage,/id="partnerImpactRing"/);
 assert.match(sponsorPage,/id="printPartnerResults"/);
 assert.match(sponsorUi,/function renderImpactCycle/);
 assert.match(sponsorUi,/confirmedCouponQty/);
 assert.match(sponsorUi,/Compras confirmadas pelo comércio/);
 assert.match(sponsorUi,/Cliques e pedidos automáticos ainda não estão integrados/);
 assert.match(sponsorUi,/window\.print\(\)/);
});

test('Approved athlete editor links directly to family journey',()=>{
 const onboarding=read('atletas/cadastrar/cadastro.js');
 assert.match(onboarding,/managedAthlete==='lucas'/);
 assert.match(onboarding,/link\.href='\/sponsor\/lucas\/'/);
});
