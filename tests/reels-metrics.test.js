import test from 'node:test';
import assert from 'node:assert/strict';
import {getReelStats} from '../atletas/reels-metrics.js';
const athlete='lucas',source='https://www.lucasazambuja.com.br/';
const sample={
 athlete,index:{value:null,observedAt:null},metrics:null,
 evidence:{athlete,source,sports:{points:5,titlesDocumented:1,competitionsDocumented:1},stale:false}
};
test('An unapproved athlete gets a truthful sporting partial, never invented FIFA rating',()=>{
 const value=getReelStats(sample,athlete);
 assert.equal(value.rating,null);
 assert.equal(value.badgeValue,'20');
 assert.equal(value.sportsScore100,20);
 assert.equal(value.badgeLabel,'NOTA ESPORTIVA');
 assert.equal(value.rating,null);
 assert.equal(value.titles,1);
 assert.equal(value.followers,null);
 assert.equal(value.display.followers,'A validar');
});
test('Mismatch of athlete identity discards all published scores and evidence',()=>{
 const value=getReelStats({...sample,index:{value:95}},'ryan');
 assert.equal(value.rating,null);assert.equal(value.titles,null);
 assert.equal(value.verifiedSource,null);
});
test('Evidence from an unlisted or mismatched source does not award sports points',()=>{
 const value=getReelStats({...sample,evidence:{...sample.evidence,source:'https://example.org/'}},athlete);
 assert.equal(value.sportsPoints,null);
 assert.equal(value.sportsScore100,null);
 assert.equal(value.badgeValue,'—');
});
test('Approved index and numeric audience metrics are formatted, never estimated',()=>{
 const value=getReelStats({...sample,index:{value:67,observedAt:'2026-10-23'},
 metrics:{followers:12500,reach28d:32100,interactions28d:1200}},athlete);
 assert.equal(value.rating,67);
 assert.equal(value.badgeValue,'67');
 assert.equal(value.display.followers,'12.500');
 assert.equal(value.display.reach,'32.100');
});
test('Missing channel measurements remain unknown, including numeric zero only if real',()=>{
 const value=getReelStats({...sample,metrics:{followers:0,reach28d:null}},athlete);
 assert.equal(value.display.followers,'0');
 assert.equal(value.display.reach,'A validar');
});
test('Stale evidence is signaled instead of replaced with a fabricated estimate',()=>{
 const value=getReelStats({...sample,evidence:{...sample.evidence,stale:true}},athlete);
 assert.equal(value.sportsStale,true);
 assert.equal(value.verifiedSource,source);
});
