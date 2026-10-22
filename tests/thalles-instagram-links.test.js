import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const files=['atletas/index.html','atletas/thalles/index.html'];
const url='https://www.instagram.com/thalles_silvino012/';
for (const path of files) {
 test('Instagram atualizado do Thalles em '+path,()=>{
  const html=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.ok(html.includes(url),'novo perfil deve estar vinculado');
  assert.ok(!html.includes('https://www.instagram.com/thalles_silvino/'),'link antigo não pode aparecer');
 });
}
test('Identificador de Instagram do Thalles também atualizado na integração autorizada',()=>{
 const source=readFileSync(new URL('../api/_indice-sources.js',import.meta.url),'utf8');
 assert.match(source,/thalles:'thalles_silvino012'/);
 assert.doesNotMatch(source,/thalles:'thalles_silvino'/);
});
