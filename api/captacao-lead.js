import checkout from './_checkout-futtalento.js';
import indiceAtletas from './_indice-atletas.js';
import {storeLucasEvidence} from '../indice/lucas-public.js';
import crypto from 'node:crypto';
import {signed,verify,cookie} from './_sponsor-auth.js';

const PREFIX='futtalento/captacao/v1/';
const clean=(value,max=80)=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,max):'';
const tracking=(value)=>clean(value,65).replace(/[^\w\- .]/g,'').slice(0,65);
const purposes={
  familia:['apoio','historico','conhecer'],
  empresa:['permuta','patrocinio','visibilidade','conhecer']
};
const sponsorPlans={'primeiro-passe':{nome:'Primeiro Passe',mensalBRL:99},'time-titular':{nome:'Time Titular',mensalBRL:249},'camisa-10':{nome:'Camisa 10',mensalBRL:499}};
function error(res,status,message){return res.status(status).json({ok:false,error:message})}

export default async function handler(req,res){
  // Reuse the existing function for scheduled refresh to stay below Hobby function limits.
  // The private CRON_SECRET is attached by Vercel only to scheduled requests.
  if(req.method==='GET'&&process.env.CRON_SECRET&&
     req.headers.authorization==='Bearer '+process.env.CRON_SECRET){
    res.setHeader('Cache-Control','private,no-store,max-age=0');
    try{
      const result=await storeLucasEvidence();
      return res.status(200).json({ok:true,athlete:'lucas',checkedAt:result.checkedAt,sports:result.sports,eventsCaptured:result.events.length});
    }catch(e){
      console.error('Lucas evidence refresh failed',e?.name||'Error');
      return res.status(503).json({ok:false,error:'Sincronização não concluída'});
    }
  }
  if(req.query?.pixCheckout==='1')return checkout(req,res);
  if(req.query?.indice==='1')return indiceAtletas(req,res);
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return error(res,405,'Método não permitido.')}
  const host=req.headers.host,origin=req.headers.origin;
  if(!['www.futtalento.com.br','futtalento.com.br'].includes(host)||origin!=='https://'+host)
    return error(res,403,'Origem não autorizada.');
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))
    return error(res,415,'Envie o formulário em formato JSON.');
  const raw=req.body;
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||JSON.stringify(raw).length>4500)
    return error(res,400,'Dados inválidos.');
  // Campo-isca: descartar silenciosamente submissões automatizadas.
  if(raw.website)return res.status(200).json({ok:true,ignored:true});
  const persona=raw.persona;
  if(persona!=='familia'&&persona!=='empresa')return error(res,400,'Escolha a categoria do contato.');
  const name=clean(raw.nome,90),business=clean(raw.empresa,90),city=clean(raw.cidade,70);
  const phone=clean(raw.whatsapp,30).replace(/[^\d]/g,'');
  const goal=clean(raw.interesse,45);
  const athlete=persona==='empresa'&&['lucas','ryan','thalles'].includes(raw.atleta)?raw.atleta:null;
  if(name.length<3)return error(res,400,'Informe seu nome.');
  if(persona==='empresa'&&business.length<2)return error(res,400,'Informe o nome da empresa.');
  if(phone.length<10||phone.length>13)return error(res,400,'Informe um WhatsApp válido com DDD.');
  if(!purposes[persona].includes(goal))return error(res,400,'Selecione seu interesse.');
  const plano=persona==='empresa'&&typeof raw.plano==='string'&&['primeiro-passe','time-titular','camisa-10'].includes(raw.plano)?sponsorPlans[raw.plano]:null;
  const barter=persona==='empresa'&&raw.plano==='permuta'&&goal==='permuta';
  const barterTypes=['produto','servico','beneficio','outro'];
  const barterType=barter?clean(raw.tipoPermuta,30):'';
  const barterDescription=barter?clean(raw.descricaoPermuta,440):'';
  if(persona==='empresa'&&!plano&&!barter)return error(res,400,'Selecione uma proposta de apoio válida.');
  if(barter&&(!athlete||!barterTypes.includes(barterType)||barterDescription.length<15||barterDescription.length>400))
    return error(res,400,'Informe o atleta, o tipo de permuta e uma descrição de 15 a 400 caracteres.');
  if(raw.consent!==true)return error(res,400,'Precisamos da sua autorização para responder ao contato.');
  if(persona==='familia'&&raw.responsavel!==true)return error(res,400,'O cadastro é exclusivo para pais ou responsáveis adultos.');
  // Limite simples por navegador, sem armazenamento de endereço IP ou dados de menores.
  const cooldown=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ft_lead_cooldown='));
  const last=verify(cooldown?.slice('ft_lead_cooldown='.length));
  if(last?.type==='lead'&&last.exp>Date.now())
    return error(res,429,'Recebemos um envio recente. Aguarde um minuto antes de tentar novamente.');
  if(!process.env.BLOB_READ_WRITE_TOKEN||!process.env.SPONSOR_SESSION_SECRET)
    return error(res,503,'Cadastro temporariamente indisponível. Converse conosco pelo WhatsApp.');
  const id=crypto.randomUUID(),now=new Date().toISOString();
  const path=PREFIX+Date.now()+'-'+id+'.json';
  const record={
    id,createdAt:now,updatedAt:now,status:'novo',persona,
    nome:name,whatsapp:phone,cidade:city,
    empresa:persona==='empresa'?business:null,interesse:goal,atletaInteresse:athlete,
    pacoteSolicitado:plano?{id:raw.plano,nome:plano.nome,valorReferenciaMensalBRL:plano.mensalBRL,contratado:false}:null,
    propostaPermuta:barter?{tipo:barterType,descricao:barterDescription,avaliacao:'pendente',aceita:false,contratada:false,geraPix:false}:null,
    origem:{
      utm_source:tracking(raw.utm_source),
      utm_medium:tracking(raw.utm_medium),
      utm_campaign:tracking(raw.utm_campaign),
      utm_content:tracking(raw.utm_content),
      utm_term:tracking(raw.utm_term)
    },
    contatoAutorizado:true,maiorResponsavel:persona==='familia',
    observacao:'Contato inicial. Nenhum dado de criança ou adolescente solicitado.'
  };
  try{
    const {put}=await import('@vercel/blob');
    await put(path,JSON.stringify(record),{access:'private',contentType:'application/json',addRandomSuffix:false});
    res.setHeader('Set-Cookie',cookie('ft_lead_cooldown',signed({type:'lead',exp:Date.now()+75000}),75));
    return res.status(201).json({ok:true,ref:id});
  }catch(err){
    console.error('FutTalento lead create:',err?.message);
    return error(res,503,'Não foi possível registrar agora. Fale conosco pelo WhatsApp.');
  }
}
