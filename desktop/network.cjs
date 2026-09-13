'use strict';
const https = require('node:https');
const dns = require('node:dns').promises;
const { isIP } = require('node:net');
const { createHash } = require('node:crypto');
const cheerio = require('cheerio');

function publicAddress(address) {
  if (isIP(address) === 4) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a===0 || a===10 || a===127 || a>=224 || a===169&&b===254 || a===172&&b>=16&&b<=31 || a===192&&b===168 || a===100&&b>=64&&b<=127 || a===198&&(b===18||b===19) || a===192&&b===0 || a===198&&b===51&&c===100 || a===203&&b===0&&c===113);
  }
  // Only global unicast IPv6; reject mapped IPv4, local, multicast and documentation addresses.
  return isIP(address) === 6 && /^[23][0-9a-f]{0,3}:/i.test(address) && !/^2001:db8:/i.test(address);
}
function validateURL(raw) {
  if (typeof raw!=='string' || raw.length>2048) throw new Error('Enter an HTTPS URL under 2,048 characters.');
  const url=new URL(raw);
  if(url.protocol!=='https:' || url.username || url.password || url.port && url.port!=='443') throw new Error('Only public HTTPS URLs on the standard port are supported.');
  return url;
}
async function fetchText(raw,{limit=2000000,allowedHosts,redirects=0,lookup=dns.lookup,request=https.request}={}) {
  const url=validateURL(raw);
  if(allowedHosts && !allowedHosts.has(url.hostname)) throw new Error('Source redirected outside its approved website.');
  const host=url.hostname.replace(/^\[|\]$/g,'');
  const addresses=isIP(host)?[{address:host,family:isIP(host)}]:await lookup(host,{all:true});
  if(!addresses.length || addresses.some(a=>!publicAddress(a.address))) throw new Error('Local or private network addresses cannot be used for updates.');
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(fn,value)=>{if(!settled){settled=true;clearTimeout(timer);fn(value);}};
    // Pin the vetted DNS answers for this connection, retaining hostname verification/TLS SNI.
    const req=request(url,{
      method:'GET',
      headers:{'User-Agent':'EQLSaKBuildAdvisor/1.1 (user-requested source review)','Accept':'application/json,text/html;q=0.9,text/plain;q=0.8','Accept-Encoding':'identity'},
      lookup:(_name,options,cb)=>options.all?cb(null,addresses):cb(null,addresses[0].address,addresses[0].family)
    },res=>{
      if([301,302,303,307,308].includes(res.statusCode)) {
        res.resume();
        if(redirects>=3 || !res.headers.location) return finish(reject,new Error('Too many redirects.'));
        const next=new URL(res.headers.location,url).href;
        finish(resolve,fetchText(next,{limit,allowedHosts,redirects:redirects+1,lookup,request}));
        return;
      }
      if(res.statusCode!==200){res.resume();return finish(reject,new Error('Website returned HTTP '+res.statusCode+'. Try opening the source in your browser.'));}
      if(Number(res.headers['content-length'])>limit){res.destroy();return finish(reject,new Error('Update exceeds the allowed download size.'));}
      const parts=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>limit){res.destroy();finish(reject,new Error('Update exceeds the allowed download size.'));}else parts.push(chunk);});
      res.on('error',e=>finish(reject,e));
      res.on('end',()=>finish(resolve,{text:Buffer.concat(parts).toString('utf8'),contentType:String(res.headers['content-type']||''),url:url.href,lastModified:res.headers['last-modified']||null}));
    });
    const timer=setTimeout(()=>{req.destroy();finish(reject,new Error('Source did not respond within 20 seconds.'));},20000);
    req.on('error',e=>finish(reject,new Error(e.message)));
    req.end();
  });
}
function extractSource(html) {
  const $=cheerio.load(html);
  const title=$('h1').first().text().trim() || $('title').text().trim();
  $('script,style,noscript,nav,footer,header,form,button,input,svg,.mw-editsection,.toc,#toc,.printfooter,.catlinks').remove();
  const root=$('.mw-parser-output').first().length?$('.mw-parser-output').first():$('article').first().length?$('article').first():$('main').first().length?$('main').first():$('body');
  const text=root.text().replace(/\s+/g,' ').trim();
  if(text.length<120 || /just a moment|verify you are human|access denied|you've been blocked/i.test(title)) throw new Error('Source could not be read automatically. Open it in your browser to review it.');
  const sectionHash=createHash('sha256').update(text).digest('hex');
  const excerpt=text.split(/\s+/).slice(0,55).join(' ');
  const observedDate=$('meta[property="article:modified_time"]').attr('content') || $('time[datetime]').first().attr('datetime') || null;
  return {title:title.slice(0,200),excerpt,hash:sectionHash,observedDate};
}
function compareSnapshot(before,after) {
  return !before?'first-check':before.hash===after.hash?'unchanged':'changed';
}
module.exports={publicAddress,validateURL,fetchText,extractSource,compareSnapshot};
