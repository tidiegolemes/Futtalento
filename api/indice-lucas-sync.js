// Daily Vercel cron: refresh only source-backed sports evidence, never unapproved Instagram metrics.
import {storeLucasEvidence} from './_indice-lucas-public.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private,no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método não permitido'});}
  const expected=process.env.CRON_SECRET;
  if(!expected||req.headers.authorization!==('Bearer '+expected))
    return res.status(401).json({ok:false,error:'Não autorizado'});
  try{
    const record=await storeLucasEvidence();
    return res.status(200).json({
      ok:true,athlete:'lucas',checkedAt:record.checkedAt,source:record.source,
      sports:record.sports,eventsCaptured:record.events.length
    });
  }catch(e){
    console.error('Lucas sports evidence sync failed:',e?.name||'Error');
    return res.status(503).json({ok:false,error:'Não foi possível sincronizar a fonte oficial'});
  }
}
