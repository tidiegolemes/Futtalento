import test from 'node:test';
import assert from 'node:assert/strict';
import {assessEfiCharge,visiblePaymentStatus} from '../api/_futtalento-payment.js';

const now=Date.parse('2026-10-22T14:30:00Z');
const txid='1234567890abcdef1234567890abcdef';
const order={txid,cents:9900,status:'pending',pix:{expiresAt:'2026-10-22T14:00:00Z'}};
const receipt={txid,valor:'99.00',endToEndId:'E12345678202610221012345678901234',horario:'2026-10-22T14:20:00Z'};
const concluded={txid,status:'CONCLUIDA',valor:{original:'99.00'},pix:[receipt]};

test('paid receipt produces exactly 30 days from bank timestamp',()=>{
 const r=assessEfiCharge(order,concluded,now);
 assert.equal(r.kind,'paid');
 assert.equal(r.paymentId,receipt.endToEndId);
 assert.equal(r.paidAt,'2026-10-22T14:20:00.000Z');
 assert.equal(r.activeUntil,'2026-11-21T14:20:00.000Z');
});
test('an unpaid Pix never activates',()=>assert.equal(assessEfiCharge(order,{...concluded,status:'ATIVA'},now).kind,'pending'));
test('a bank-removed Pix never activates',()=>assert.equal(assessEfiCharge(order,{...concluded,status:'REMOVIDA_PELO_PSP'},now).kind,'removed'));
test('reject wrong transaction id',()=>assert.throws(()=>assessEfiCharge(order,{...concluded,txid:'different'},now)));
test('reject different charge amount',()=>assert.throws(()=>assessEfiCharge(order,{...concluded,valor:{original:'99.01'}},now)));
test('reject missing Pix receipt',()=>assert.throws(()=>assessEfiCharge(order,{...concluded,pix:[]},now)));
test('reject wrong receipt transaction',()=>assert.throws(()=>assessEfiCharge(order,{...concluded,pix:[{...receipt,txid:'different'}]},now)));
test('reject invalid bank payment timestamp',()=>assert.throws(()=>assessEfiCharge(order,{...concluded,pix:[{...receipt,horario:''}]},now)));
test('reject receipts containing a completed refund',()=>assert.throws(()=>assessEfiCharge(order,{...concluded,pix:[{...receipt,devolucoes:[{status:'DEVOLVIDO',valor:'99.00'}]}]},now)));
test('expired unpaid Pix is displayed as expired, without changing stored pending status',()=>{
 assert.equal(visiblePaymentStatus(order,now),'pix_expired');
 assert.equal(order.status,'pending');
});
test('expired active plan loses access',()=>assert.equal(visiblePaymentStatus({...order,status:'active',activeUntil:'2026-10-21T14:20:00Z'},now),'expired'));
test('valid paid plan remains active until its 30-day deadline',()=>assert.equal(visiblePaymentStatus({...order,status:'active',activeUntil:'2026-11-21T14:20:00Z'},now),'active'));
