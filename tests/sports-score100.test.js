import test from 'node:test';
import assert from 'node:assert/strict';
import {getReelStats} from '../atletas/reels-metrics.js';

const source={
 lucas:'https://www.lucasazambuja.com.br/',
 ryan:'https://www.futtalento.com.br/atletas/ryan/',
 thalles:'https://thallessilvino.com.br/'
};
test('sports evidence is displayed on a 0-100 scale, distinct from the unverified total',()=>{
 for(const [athlete,points,expected] of [['lucas',5,20],['ryan',1,4],['thalles',24,96]]){
  const stats=getReelStats({athlete,index:{value:null},
    evidence:{athlete,source:source[athlete],sports:{points}}},athlete);
  assert.equal(stats.sportsScore100,expected);
  assert.equal(stats.rating,null);
  assert.equal(stats.badgeLabel,'NOTA ESPORTIVA');
  assert.equal(stats.badgeValue,String(expected));
  assert.match(stats.badgeSub,/100/);
 }
});
test('zero stays zero only when a zero source is explicitly documented',()=>{
 const stats=getReelStats({athlete:'ryan',index:{value:null},
  evidence:{athlete:'ryan',source:source.ryan,sports:{points:0}}},'ryan');
 assert.equal(stats.sportsScore100,0);
});
test('missing records never yield a manufactured rating',()=>{
 const stats=getReelStats({athlete:'thalles',index:{value:null}},'thalles');
 assert.equal(stats.sportsScore100,null);
 assert.equal(stats.badgeValue,'—');
});
test('approved full index remains independent from normalized sports rating',()=>{
 const stats=getReelStats({athlete:'lucas',index:{value:63},
  evidence:{athlete:'lucas',source:source.lucas,sports:{points:5}}},'lucas');
 assert.equal(stats.rating,63);
 assert.equal(stats.sportsScore100,20);
 assert.equal(stats.badgeLabel,'ÍNDICE GERAL');
 assert.equal(stats.badgeValue,'63');
});

test('A visual five-star scale uses the documented sports score, never unverified reviews',()=>{
 const athlete='lucas';
 const src='https://www.lucasazambuja.com.br/';
 const stats=getReelStats({athlete,index:{value:null},evidence:{athlete,source:src,sports:{points:5}}},athlete);
 assert.equal(stats.sportsScore100,20);
 assert.equal(stats.sportsScore100/20,1); // one illustrated star out of five
});
