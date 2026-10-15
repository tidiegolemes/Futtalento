import {authenticate} from './_sponsor-auth.js';
const PREFIX='futtalento/captacao/v1/';
const PATH_RE=/^futtalento\/captacao\/v1\/\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/;
const statuses=['novo','contatado','qualificado','encerrado'];
const fail=(res,s,m)=>res.status(s).json({error:m});
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  const user=authenticate(req);
  if(!user||user.kind!=='sponsor')return fail(res,401,'Acesso restrito à agência.');
  if(!['GET','PATCH'].includes(req.method))return fail(res,405,'Método não permitido.');
  if(!process.env.BLOB_READ_WRITE_TOKEN)return fail(res,503,'Armazenamento não configurado.');
  if(req.method==='PATCH'){
    const host=req.headers.host,origin=req.headers.origin;
    if(!['www.futtalento.com.br','futtalento.com.br'].includes(host)||origin!=='https://'+host)
      return fail(res,403,'Origem não autorizada.');
    if(!String(req.headers['content-type']||'').startsWith('application/json'))
      return fail(res,415,'Formato inválido.');
    if(JSON.stringify(req.body||{}).length>1300)return fail(res,413,'Requisição muito extensa.');
  }
  try{
    const {list,get,put}=await import('@vercel/blob');
    if(req.method==='GET'){
      const cursor=typeof req.query?.cursor==='string'&&req.query.cursor.length<800?req.query.cursor:undefined;
      const batch=await list({prefix:PREFIX,limit:75,cursor});
      // Não retornar URLs diretas de arquivos privados.
      const records=[];
      for(const item of batch.blobs||[]){
        if(!PATH_RE.test(item.pathname))continue;
        const file=await get(item.pathname,{access:'private'});
        if(!file?.stream)continue;
        try{
          const lead=JSON.parse(await new Response(file.stream).text());
          records.push({key:item.pathname,...lead});
        }catch(e){console.error('Lead parse skipped',e?.message);}
      }
      records.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
      return res.status(200).json({leads:records,hasMore:batch.hasMore===true,cursor:batch.cursor||null});
    }
    const key=req.body?.key,status=req.body?.status;
    if(typeof key!=='string'||!PATH_RE.test(key)||!statuses.includes(status))
      return fail(res,400,'Registro ou situação inválida.');
    const file=await get(key,{access:'private'});
    if(!file?.stream)return fail(res,404,'Contato não encontrado.');
    const current=JSON.parse(await new Response(file.stream).text());
    current.status=status;current.updatedAt=new Date().toISOString();
    current.updatedBy=user.login;
    await put(key,JSON.stringify(current),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});
    return res.status(200).json({ok:true,key,status});
  }catch(e){
    console.error('FutTalento leads admin',e?.message);
    return fail(res,503,'Não foi possível consultar ou alterar os cadastros.');
  }
}
