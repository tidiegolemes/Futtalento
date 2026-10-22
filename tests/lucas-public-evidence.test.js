import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLucasEvidence} from '../indice/lucas-public.js';

const asOf='2026-10-22T15:00:00.000Z';
test('Lucas documents a sports partial, never a made-up /100 audience rating',()=>{
  const html='<main><h1>Copa Base Baby 2026</h1><p>Na final, Lucas marcou um gol e deu assistência para o Grêmio.</p></main>';
  const record=parseLucasEvidence(html,asOf);
  assert.equal(record.sports.points,5);
  assert.equal(record.sports.maximum,25);
  assert.equal(record.sports.titlesDocumented,1);
  assert.equal(record.sports.competitionsDocumented,1);
  assert.equal(record.events.length,1);
  assert.equal(record.source,'https://www.lucasazambuja.com.br/');
  assert.equal(record.verification,'registro_publicado_pelo_atleta');
  assert.ok(!('followers' in record));
  assert.ok(!('score' in record));
});
test('No source marker yields no publication rather than misleading zero',()=>{
  assert.throws(()=>parseLucasEvidence('<main>Site indisponível</main>',asOf),/Nenhum marco esportivo/);
});
