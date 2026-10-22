import {authenticate} from './_sponsor-auth.js';
import {prefix,PLANS,ATHLETES} from './_futtalento-efi.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const user=authenticate(req);
 if(!user||user.kind!=='sponsor')return res.status(403).json({error:'Acesso exclusivo da agência'});
 if(req.method!=='GET')return res.status(405).end();
 try{
  const {list,get}=await import('@vercel/blob');
  const files=await list({prefix,limit:100});
  const records=await Promise.all((files.blobs||[]).map(async entry=>{
   try{const obj=await get(entry.pathname,{access:'private'});if(!obj?.stream)return null;
    const x=JSON.parse(await new Response(obj.stream).text());
    return {id:x.id,name:x.name,company:x.company,phone:x.phone,athlete:ATHLETES[x.athlete],plan:PLANS[x.plan]?.title,amount:PLANS[x.plan]?.cents/100,status:x.status,createdAt:x.createdAt,paidAt:x.paidAt||null,activeUntil:x.activeUntil||null};
   }catch{return null}
  }));
  return res.status(200).json({orders:records.filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),hasMore:!!files.cursor});
 }catch(e){console.error('Agency payments list',e.message);return res.status(503).json({error:'Não foi possível consultar os pagamentos'});}
}
