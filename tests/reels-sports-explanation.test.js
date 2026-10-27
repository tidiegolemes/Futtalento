import test from 'node:test';
import assert from 'node:assert/strict';
import {getReelStats} from '../atletas/reels-metrics.js';
const source={
 lucas:'https://www.lucasazambuja.com.br/',
 ryan:'https://www.futtalento.com.br/atletas/ryan/',
 thalles:'https://thallessilvino.com.br/'
};
const partial=(athlete,points,titles,competitions,clubMonths=null)=>getReelStats({
 athlete,index:{value:null},metrics:null,
 evidence:{athlete,source:source[athlete],sports:{
  points,titlesDocumented:titles,competitionsDocumented:competitions,clubMonthsDocumented:clubMonths
 }}
},athlete);

test('sports partials explain Lucas, Ryan, and Thalles without fabricating a 100-point index',()=>{
 const cases=[['lucas',5,1,1,null,[4,1,null]],['ryan',1,null,1,null,[null,1,null]],['thalles',24,4,4,24,[12,4,8]]];
 for(const [athlete,score,titles,competitions,months,components] of cases){
  const stats=partial(athlete,score,titles,competitions,months);
  assert.equal(stats.rating,null);
  assert.equal(stats.sportsPoints,score);
  assert.equal(stats.sportsScore100,score*4);
  assert.equal(stats.badgeValue,String(score*4));
  assert.match(stats.badgeSub,/parcial|acervo/i);
  assert.equal(stats.sportsBreakdown.titles.score,components[0]);
  assert.equal(stats.sportsBreakdown.competitions.score,components[1]);
  assert.equal(stats.sportsBreakdown.clubMonths.score,components[2]);
  assert.equal(Math.round(components.reduce((sum,x)=>sum+(x||0),0)),score);
 }
});
test('No evidence is not treated as zero: no sports score without attributed source',()=>{
 const unavailable=getReelStats({athlete:'ryan',index:{value:null},evidence:null},'ryan');
 assert.equal(unavailable.sportsPoints,null);
 assert.equal(unavailable.sportsScore100,null);
 assert.equal(unavailable.sportsBreakdown,null);
 const spoofed=getReelStats({athlete:'ryan',index:{value:null},evidence:{athlete:'ryan',source:'https://example.com/',sports:{points:25}}},'ryan');
 assert.equal(spoofed.sportsPoints,null);
 assert.equal(spoofed.sportsScore100,null);
});
test('Missing club tenure is not reported as zero months or penalized',()=>{
 const a=partial('lucas',5,1,1,null);
 assert.equal(a.sportsBreakdown.clubMonths.count,null);
 assert.equal(a.sportsBreakdown.clubMonths.score,null);
});

test('generational club-time explanation matches central /25 sport component',()=>{
 const lucas=getReelStats({athlete:'lucas',index:{value:null},
  evidence:{athlete:'lucas',source:source.lucas,cohortYear:2018,checkedAt:'2026-10-26',
   sports:{points:24,titlesDocumented:5,competitionsDocumented:5,clubMonthsDocumented:12}}
 },'lucas');
 const thalles=getReelStats({athlete:'thalles',index:{value:null},
  evidence:{athlete:'thalles',source:source.thalles,cohortYear:2012,checkedAt:'2026-10-26',
   sports:{points:24,titlesDocumented:4,competitionsDocumented:4,clubMonthsDocumented:24}}
 },'thalles');
 assert.equal(lucas.sportsBreakdown.clubMonths.referenceMonths,14);
 assert.equal(thalles.sportsBreakdown.clubMonths.referenceMonths,24);
 assert.equal(lucas.sportsBreakdown.clubMonths.score,6.9);
 assert.equal(thalles.sportsBreakdown.clubMonths.score,8);
 assert.equal(lucas.sportsScore100,96);
 assert.equal(thalles.sportsScore100,96);
 assert.equal(lucas.rating,null);
});
