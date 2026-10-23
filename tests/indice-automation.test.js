import test from 'node:test';
import assert from 'node:assert/strict';
import {planAutomaticIndexRefresh} from '../api/_indice-automation.js';

const time='2026-10-23T15:00:00.000Z';
const record=()=>({
 athlete:'lucas',publicApproved:true,automaticUpdatesAuthorized:true,
 source:'relatorio_autorizado',reference:'relatorio anterior',observedAt:'2026-10-20',
 metrics:{followers:1000,reach28d:5000,interactions28d:400,growth28dPct:3,
  titlesVerified:2,competitionsVerified:2,clubMonths:12,partnersActive:3,deliveriesCompleted:3},
 history:[]
});
const suggestions=()=>({
 instagram:{status:'conectado',metrics:{followers:1200,reach28d:6000,interactions28d:500}},
 sports:{metrics:{titlesVerified:1,competitionsVerified:1,clubMonths:24}},
 commercial:{status:'sem_registros_integrados',metrics:{}}
});

test('Never auto-publish without initial guardian and agency approval',()=>{
 const r=record();r.publicApproved=false;
 const plan=planAutomaticIndexRefresh(r,suggestions(),time);
 assert.equal(plan.status,'aguardando_aprovacao_inicial');
 assert.equal(plan.snapshot,undefined);
});

test('Recurring consent is required even if a previous report was approved',()=>{
 const r=record();r.automaticUpdatesAuthorized=false;
 assert.equal(planAutomaticIndexRefresh(r,suggestions(),time).status,'aguardando_autorizacao_continua');
});

test('Instagram must have three current authorized audience measurements',()=>{
 const s=suggestions();s.instagram.metrics={followers:1200,reach28d:6000};
 assert.equal(planAutomaticIndexRefresh(record(),s,time).status,'aguardando_meta_insights');
 s.instagram={status:'nao_configurado',metrics:{followers:1200,reach28d:6000,interactions28d:500}};
 assert.equal(planAutomaticIndexRefresh(record(),s,time).status,'aguardando_meta_insights');
});

test('New authorized Meta data updates audience; clears stale growth and active partners',()=>{
 const plan=planAutomaticIndexRefresh(record(),suggestions(),time);
 assert.equal(plan.status,'atualizado');
 assert.equal(plan.snapshot.observedAt,'2026-10-23');
 assert.equal(plan.snapshot.metrics.followers,1200);
 assert.equal(plan.snapshot.metrics.reach28d,6000);
 assert.equal(plan.snapshot.metrics.interactions28d,500);
 assert.equal(plan.snapshot.metrics.growth28dPct,null);
 assert.equal(plan.snapshot.metrics.partnersActive,null);
 assert.equal(plan.snapshot.metrics.deliveriesCompleted,3);
 assert.equal(plan.snapshot.metrics.titlesVerified,2);
 assert.equal(plan.snapshot.metrics.clubMonths,24);
 assert.equal(plan.snapshot.automaticUpdatesAuthorized,true);
 assert.equal(plan.snapshot.history.length,1);
});

test('Verified new commercial records can update active partners and completed deliveries',()=>{
 const s=suggestions();
 s.commercial={status:'registros_agencia_aprovados',metrics:{partnersActive:1,deliveriesCompleted:5}};
 const plan=planAutomaticIndexRefresh(record(),s,time);
 assert.equal(plan.snapshot.metrics.partnersActive,1);
 assert.equal(plan.snapshot.metrics.deliveriesCompleted,5);
});

test('A suspicious audience ratio is rejected, not displayed as credible',()=>{
 const s=suggestions();s.instagram.metrics.interactions28d=90000;
 assert.equal(planAutomaticIndexRefresh(record(),s,time).status,'inconsistencia_metricas');
});

test('No fabricated sports or partner numbers from untrusted report fields',()=>{
 const s=suggestions();
 s.sports=null;s.commercial=null;
 s.metrics={titlesVerified:99,partnersActive:99};
 const plan=planAutomaticIndexRefresh(record(),s,time);
 assert.equal(plan.snapshot.metrics.titlesVerified,2);
 assert.equal(plan.snapshot.metrics.partnersActive,null);
});

test('When data is unchanged on the same day, avoid repetitive Blob writes',()=>{
 const r=record();r.observedAt='2026-10-23';
 r.metrics={...r.metrics,followers:1200,reach28d:6000,interactions28d:500,
  growth28dPct:null,clubMonths:24,partnersActive:null};
 assert.equal(planAutomaticIndexRefresh(r,suggestions(),time).status,'sem_alteracao');
});
