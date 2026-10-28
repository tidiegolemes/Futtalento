import {authenticate,authenticatePartner} from './_sponsor-auth.js';
import {validPartner,campaignSummary} from './_campaign-events.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='GET')return res.status(405).json({error:'Metodo nao permitido'});
 const staff=authenticate(req),session=authenticatePartner(req);
 const agency=staff?.kind==='sponsor';
 if(!agency&&!session)return res.status(401).json({error:'Acesso privado'});
 // An individual partner cannot read another company's counts.
 const partner=agency?String(req.query?.partner||''):session.partner;
 if(!validPartner(partner))return res.status(400).json({error:'Parceiro invalido'});
 if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({error:'Medicao indisponivel'});
 try{return res.status(200).json({partner,...await campaignSummary(partner)});}
 catch(e){console.error('Campaign report unavailable',e?.name);
  return res.status(503).json({error:'Relatorio temporariamente indisponivel'});}
}
