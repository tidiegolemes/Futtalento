// Pure bank-confirmation logic: no network, no filesystem, no payment mutations.
// A local simulation cannot replace a real Efí payment/receipt.
export function assessEfiCharge(order, bank, now=Date.now()){
  const expected=Number.isSafeInteger(order?.cents)&&order.cents>0?(order.cents/100).toFixed(2):null;
  if(!expected||!order?.txid||bank?.txid!==order.txid)throw new Error('Identificador de cobrança incompatível');
  if(bank.status==='REMOVIDA_PELO_USUARIO_RECEBEDOR'||bank.status==='REMOVIDA_PELO_PSP')return {kind:'removed'};
  if(bank.status!=='CONCLUIDA')return {kind:'pending'};
  if(bank.valor?.original!==expected)throw new Error('Valor bancário diferente do plano');
  const receipts=Array.isArray(bank.pix)?bank.pix:[];
  const receipt=receipts.find(p=>p&&p.txid===order.txid&&p.valor===expected&&typeof p.endToEndId==='string'&&p.endToEndId.length>=20);
  if(!receipt)throw new Error('Comprovante Pix correspondente não encontrado');
  const paidTime=Date.parse(receipt.horario);
  if(!Number.isFinite(paidTime)||paidTime<=0||paidTime>now+5*60000)throw new Error('Horário bancário inválido');
  const refunded=(Array.isArray(receipt.devolucoes)?receipt.devolucoes:[]).some(r=>r.status==='DEVOLVIDO');
  if(refunded)throw new Error('Pagamento com devolução exige revisão da agência');
  return {kind:'paid',paidAt:new Date(paidTime).toISOString(),activeUntil:new Date(paidTime+30*86400000).toISOString(),paymentId:receipt.endToEndId};
}
export function visiblePaymentStatus(order,now=Date.now()){
  if(order.status==='active')return Number.isFinite(Date.parse(order.activeUntil))&&Date.parse(order.activeUntil)>now?'active':'expired';
  if(order.status==='removed')return 'removed';
  if(order.status==='pending'&&order.pix?.expiresAt&&Number.isFinite(Date.parse(order.pix.expiresAt))&&Date.parse(order.pix.expiresAt)<=now)return 'pix_expired';
  return order.status||'pending';
}
