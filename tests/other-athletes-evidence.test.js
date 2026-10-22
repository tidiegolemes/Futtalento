import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOtherAthleteEvidence} from '../indice/other-athletes-public.js';
const today='2026-10-22T17:00:00.000Z';

test('Ryan has a partial sports record only, not a complete index or claimed title',()=>{
 const html='<main><p>Participação documentada na Copa Maravilha 2026 pelo Cruzeiro-RS.</p></main>';
 const e=parseOtherAthleteEvidence('ryan',html,today);
 assert.equal(e.sports.points,1);
 assert.equal(e.sports.maximum,25);
 assert.equal(e.sports.titlesDocumented,null);
 assert.equal(e.sports.competitionsDocumented,1);
 assert.equal(e.athlete,'ryan');
 assert.equal(e.source,'https://www.futtalento.com.br/atletas/ryan/');
 assert.equal('followers' in e,false);
});
test('Thalles gets conservative sports partial from documented title records and a minimum club period',()=>{
 const html='<main><p>2025 CAMPEÃO Copa Encantado / SAFERGS</p><p>2024 CAMPEÃO Copa Sarandi</p><p>2023 Tríplice coroa Ligaserrana Condacup</p><p>2022 Bicampeão Ligaserrana Encosta</p><p>2023 - ATUAL E.C. Juventude</p></main>';
 const e=parseOtherAthleteEvidence('thalles',html,today);
 assert.equal(e.sports.titlesDocumented,4);
 assert.equal(e.sports.competitionsDocumented,4);
 assert.equal(e.sports.clubMonthsDocumented,24);
 assert.equal(e.sports.points,24);
 assert.equal(e.events.length,4);
 assert.equal('reach28d' in e,false);
});
test('No documented competition means no invented partial score',()=>{
 assert.throws(()=>parseOtherAthleteEvidence('ryan','<main>Sem registros</main>',today),/Nenhum marco/);
 assert.throws(()=>parseOtherAthleteEvidence('thalles','<main>Sem registros</main>',today),/Nenhum marco/);
});
test('Unregistered athletes cannot be queried through public evidence builder',()=>{
 assert.throws(()=>parseOtherAthleteEvidence('unknown','Copa 2026',today),/não autorizado/);
});
