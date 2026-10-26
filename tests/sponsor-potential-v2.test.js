import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateSponsorPotential,POTENTIAL_WEIGHTS,reportCampaignResults} from '../indice/sponsor-potential-v2.js';
const now=Date.parse('2026-10-26T18:00:00Z');
const good=()=>({cohortYear:2018,observedAt:'2026-10-26',
 provenance:{audience:'meta_insights_authorized',sports:'athlete_records_reviewed',activation:'agency_checked'},
 metrics:{reach28d:30000,followers:10700,growth28dPct:8,interactions28d:2100,posts28d:10,titlesVerified:5,competitionsVerified:5,clubMonths:12},
 activation:{approvedProfile:true,guardianConsent:true,trackingReady:true}});
test('weights sum 100 and reflect sponsorship priorities',()=>{
 assert.equal(Object.values(POTENTIAL_WEIGHTS).reduce((a,b)=>a+b,0),100);
});
test('real complete, approved snapshot is bounded and cohort-adjusted',()=>{
 const v=calculateSponsorPotential(good(),now);
 assert.equal(v.status,'validated');assert.equal(v.coverage,100);
 assert.ok(v.value>=0&&v.value<=100);assert.equal(v.clubTenureReferenceMonths,14);
 assert.equal(v.components.audience.maximum,35);assert.equal(v.components.engagement.maximum,30);
 assert.equal(v.components.sports.maximum,20);assert.equal(v.components.activation.maximum,15);
});
test('followers only do not masquerade as measured reach or a rank',()=>{
 const v=calculateSponsorPotential({observedAt:'2026-10-26',metrics:{followers:10700}},now);
 assert.equal(v.value,null);assert.equal(v.coverage,8);assert.ok(v.missing.includes('reach28d'));
});
test('missing tracking is unknown, not zero; no renormalized score',()=>{
 const a=good();delete a.activation.trackingReady;const v=calculateSponsorPotential(a,now);
 assert.equal(v.value,null);assert.equal(v.coverage,95);assert.equal(v.possibleRange[1]-v.possibleRange[0],5);
});
test('untrusted source and missing consent cannot produce a published score',()=>{
 const a=good();a.provenance.audience='public_scrape';
 assert.equal(calculateSponsorPotential(a,now).value,null);
 const b=good();b.activation.guardianConsent=false;
 assert.equal(calculateSponsorPotential(b,now).status,'sources_unverified');
});
test('old observation fails freshness gate',()=>{
 const a=good();a.observedAt='2026-08-01';assert.equal(calculateSponsorPotential(a,now).status,'stale_or_undated');
});
test('cohort alters only the club duration points',()=>{
 const a=calculateSponsorPotential(good(),now);const old=good();old.cohortYear=2012;
 const b=calculateSponsorPotential(old,now);
 assert.equal(a.components.audience.score,b.components.audience.score);
 assert.ok(a.components.sports.score>b.components.sports.score);
});
test('campaign revenue attribution is separate from ROI',()=>{
 const r=reportCampaignResults({uniqueClicks:60,impressions:12000,qualifiedLeads:10,attributedOrders:3,attributedRevenue:900,campaignCost:300});
 assert.equal(r.ctr,0.5);assert.equal(r.costPerLead,30);assert.equal(r.attributedRevenueToCost,3);
 assert.equal(r.incrementalRoi,null);
});
