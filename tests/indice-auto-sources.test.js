import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSports,ATHLETE_SOURCES} from '../indice/auto-sources.js';
test('Lucas: title and cup documented with goal and assist',()=>{
 const html='<main><p>Gre-Nal: na final da Copa Base Baby 2026, Grêmio ganhou 2 x 1; gol de Lucas e assistência.</p></main>';
 const x=extractSports('lucas',html,'2026-10-22');
 assert.equal(x.metrics.titlesVerified,1);
 assert.equal(x.metrics.competitionsVerified,1);
 assert.equal(x.source,'https://www.lucasazambuja.com.br/');
});
test('Lucas: avoids guessing achievement from club alone',()=>{
 const x=extractSports('lucas','<main>Lucas joga no Grêmio</main>');
 assert.equal(x.metrics.titlesVerified,null);assert.equal(x.metrics.competitionsVerified,null);
});
test('Thalles: recognizes four distinct dated public achievement groups',()=>{
 const html='<main>2025 CAMPEÃO Copa @Encantado / @Safergs. 2024 CAMPEÃO Copa @Sarandi. 2023 TRÍPLICE COROA @Ligaserrana / @Condacup. 2022 BICAMPEÃO @Ligaserrana / @Encosta.</main>';
 const x=extractSports('thalles',html);
 assert.equal(x.metrics.titlesVerified,4);assert.equal(x.metrics.competitionsVerified,4);
 assert.equal(new Set(x.events.map(e=>e.id)).size,4);
});
test('Ryan: competition with no fabricated winner',()=>{
 const x=extractSports('ryan','<main>Ryan pela equipe Cruzeiro na Copa Maravilha 2026.</main>');
 assert.equal(x.metrics.competitionsVerified,1);assert.equal(x.metrics.titlesVerified,null);
});
test('unknown athlete rejected',()=>assert.throws(()=>extractSports('unknown','')));
test('missing results are unknown and not zero',()=>{
 const x=extractSports('thalles','<main>Futebol de base sem conquistas informadas.</main>');
 assert.equal(x.metrics.titlesVerified,null);assert.equal(x.events.length,0);
});
test('source hosts are hard-coded and HTTPS',()=>assert.ok(Object.values(ATHLETE_SOURCES).every(x=>x.url.startsWith('https://'))));