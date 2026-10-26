import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateIndex,FIELDS,WEIGHTS,clubTenureReferenceMonths} from '../indice/score.js';
const now=Date.parse('2026-10-22T15:00:00Z');
const date='2026-10-20';
const base=()=>({observedAt:date,source:'relatorio_autorizado',metrics:{
 reach28d:10000,followers:2400,interactions28d:300,growth28dPct:5,
 titlesVerified:1,competitionsVerified:3,clubMonths:12,partnersActive:2,deliveriesCompleted:7
}});
test('weights total exactly 100',()=>assert.equal(Object.values(WEIGHTS).reduce((a,b)=>a+b,0),100));
test('all nine verified indicators yield a bounded index',()=>{const result=calculateIndex(base(),now);assert.equal(result.coverage,100);assert.ok(Number.isInteger(result.value)&&result.value>=0&&result.value<=100);assert.equal(result.status,'calculado')});
test('empty metrics cannot produce a fabricated ranking',()=>{const a=calculateIndex({metrics:{},observedAt:date},now);assert.equal(a.value,null);assert.equal(a.status,'dados_em_formacao')});
test('sports accomplishments alone never masquerade as audience',()=>{const a=calculateIndex({metrics:{titlesVerified:3,competitionsVerified:5,clubMonths:24},observedAt:date},now);assert.equal(a.value,null);assert.equal(a.components.audience.complete,false)});
test('stale audience loses index publication',()=>{const a=calculateIndex({...base(),observedAt:'2026-07-01'},now);assert.equal(a.value,null);assert.equal(a.status,'desatualizado')});
test('negative growth is accepted and scores no growth bonus',()=>{const a=base();a.metrics.growth28dPct=-4;const result=calculateIndex(a,now);assert.equal(result.coverage,100);assert.equal(result.value!==null,true);assert.equal(result.components.audience.complete,true)});
test('missing sport/commercial data is not a zero-value score',()=>{const a=base();a.metrics.titlesVerified=null;a.metrics.competitionsVerified=null;a.metrics.clubMonths=null;a.metrics.partnersActive=null;a.metrics.deliveriesCompleted=null;const r=calculateIndex(a,now);assert.equal(r.value,null);assert.equal(r.components.sports.complete,false);assert.equal(r.components.partnership.complete,false)});
test('no badge is granted without minimum verified coverage',()=>{const a=base();a.metrics.partnersActive=null;a.metrics.deliveriesCompleted=null;a.metrics.clubMonths=null;const r=calculateIndex(a,now);assert.equal(r.coverage,72);assert.ok(r.value!==null);a.metrics.titlesVerified=null;const lower=calculateIndex(a,now);assert.equal(lower.coverage,60);assert.equal(lower.value,null)});
test('only the agreed nine scoring fields exist',()=>assert.equal(FIELDS.length,9));

test('club time is normalized proportionally to verified public cohort, not absolute months',()=>{
 assert.equal(clubTenureReferenceMonths(2018,'2026-10-26'),14);
 assert.equal(clubTenureReferenceMonths(2012,'2026-10-26'),24);
 assert.equal(clubTenureReferenceMonths(null,'2026-10-26'),24);
 const a=calculateIndex({cohortYear:2018,observedAt:'2026-10-26',metrics:{
  titlesVerified:5,competitionsVerified:5,clubMonths:12
 }},Date.parse('2026-10-26T18:00:00Z'));
 const b=calculateIndex({cohortYear:2012,observedAt:'2026-10-26',metrics:{
  titlesVerified:4,competitionsVerified:4,clubMonths:24
 }},Date.parse('2026-10-26T18:00:00Z'));
 assert.equal(a.clubTenureReferenceMonths,14);
 assert.equal(b.clubTenureReferenceMonths,24);
 assert.equal(a.components.sports.score,24);
 assert.equal(b.components.sports.score,24);
 assert.equal(a.value,null);
 assert.equal(b.value,null);
});
test('unknown cohort retains prior conservative reference, never guesses a minor’s date of birth',()=>{
 assert.equal(clubTenureReferenceMonths(undefined,'2026-10-26'),24);
 assert.equal(clubTenureReferenceMonths(2025,'2026-10-26'),24);
 assert.equal(clubTenureReferenceMonths(2030,'2026-10-26'),24);
});
