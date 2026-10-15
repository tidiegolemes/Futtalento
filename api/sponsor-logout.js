import {cookie} from './_sponsor-auth.js';
export default function handler(req,res){if(req.method!=='GET')return res.status(405).end();res.setHeader('Set-Cookie',cookie('ft_session','',0));res.setHeader('Cache-Control','no-store');return res.redirect(302,'/sponsor/lucas/');}
