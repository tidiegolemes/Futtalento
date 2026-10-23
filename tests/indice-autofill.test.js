import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSports,ATHLETE_SOURCES} from '../indice/auto-sources.js';
const date='2026-10-23';
test('only approved athlete domains are supported',()=>{
 assert.deepEqual(Object.keys(ATHLETE_SOURCES).sort(),['lucas','ryan','thalles']);
 assert.throws(()=>extractSports('unknown','example',date));
});
test('Lucas Gre-Nal result is recognized conservatively',()=>{
 const text='Lukinhas10 Grêmio gol e assistência na final. Final da Copa Base Baby 2026, Grêmio venceu. Gol e assistência.';
 const r=extractSports('lucas',text,date);
 assert.equal(r.metrics.titlesVerified,1);
 assert.equal(r.metrics.competitionsVerified,1);
 assert.equal(r.events.length,1);
});
test('Ryan has competition without an inferred title',()=>{
 const r=extractSports('ryan','Meio campo Cruzeiro-RS temporada 2026, registros da Copa Maravilha 2026.',date);
 assert.equal(r.metrics.competitionsVerified,1);
 assert.equal(r.metrics.titlesVerified,null);
});
test('Thalles identified championships require direct year+event+winner pairing',()=>{
 const text='2025 CAMPEÃO Copa Encantado / SAFERGS. 2024 CAMPEÃO Copa Sarandi. 2023 TRÍPLICE COROA Ligaserrana / Condacup. 2022 BICAMPEÃO Ligaserrana / Encosta. E.C. Juventude 2023 - ATUAL';
 const r=extractSports('thalles',text,date);
 assert.equal(r.metrics.titlesVerified,4);
 assert.equal(r.metrics.competitionsVerified,4);
 assert.equal(r.metrics.clubMonths,24);
});
test('Do not mislabel a runner-up as champion because another tournament mentions victory',()=>{
 const text='2024 vice Copa Sarandi Juventude. 2025 CAMPEÃO Copa Encantado / SAFERGS.';
 const r=extractSports('thalles',text,date);
 assert.deepEqual(r.events.map(e=>e.id),['encantado-safergs-2025']);
});
test('Unknown count must remain null rather than fabricated zero',()=>{
 const r=extractSports('lucas','Perfil criado sem competição publicada ou título confirmado.',date);
 assert.equal(r.metrics.titlesVerified,null);
 assert.equal(r.metrics.competitionsVerified,null);
 assert.equal(r.events.length,0);
});
test('Previous records and current club age are not inferred without explicit date',()=>{
 const r=extractSports('lucas','Copa Base Baby Grêmio, uma temporada recente.',date);
 assert.equal(r.metrics.clubMonths,undefined);
 assert.equal(r.metrics.titlesVerified,null);
});
