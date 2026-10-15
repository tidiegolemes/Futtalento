import {cookie} from './_sponsor-auth.js';
export default function handler(req,res){
  if(req.method!=='GET')return res.status(405).end();
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Set-Cookie',cookie('ft_partner_session','',0));
  return res.redirect(302,'/apoiador/');
}
