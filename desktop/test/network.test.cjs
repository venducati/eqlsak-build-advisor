const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {PassThrough}=require('node:stream');
const {publicAddress,validateURL,fetchText,extractSource,compareSnapshot}=require('../network.cjs');
const lookup=async()=>[{address:'93.184.216.34',family:4}];
function fakeResponse(status,body='',headers={}) {
 return (_url,options,callback)=>{
  const request=new EventEmitter();request.destroy=()=>{};
  request.end=()=>queueMicrotask(()=>{
   assert.equal(options.headers['Accept-Encoding'],'identity');
   options.lookup('example.org',{all:true},(_err,addresses)=>assert.equal(addresses[0].address,'93.184.216.34'));
   const res=new PassThrough();res.statusCode=status;res.headers=headers;callback(res);res.end(body);
  });
  return request;
 };
}
test('only public HTTPS update URLs are accepted',()=>{
 for(const url of ['file:///c:/test','http://example.org','https://user:password@example.org','https://example.org:8080']) assert.throws(()=>validateURL(url));
 assert.equal(validateURL('https://example.org/update.json').protocol,'https:');
});
test('loopback, private, link-local and mapped addresses are rejected',()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.0.1','169.254.169.254','0.0.0.0','100.64.0.1','224.0.0.1','::1','::ffff:127.0.0.1','fe80::1','fc00::1','2001:db8::1']) assert.equal(publicAddress(ip),false,ip);
 assert(publicAddress('93.184.216.34'));assert(publicAddress('2606:4700:4700::1111'));
});
test('public request is bounded and uses pinned DNS answers',async()=>{
 const r=await fetchText('https://example.org/a',{lookup,request:fakeResponse(200,'hello',{'content-type':'text/plain'})});
 assert.equal(r.text,'hello');
});
test('DNS resolving to a private address is blocked before a request',async()=>{
 await assert.rejects(fetchText('https://example.org',{lookup:async()=>[{address:'10.0.0.1',family:4}],request:()=>{throw new Error('request must not happen');}}),/private/);
});
test('redirects cannot reach a private service',async()=>{
 await assert.rejects(fetchText('https://example.org',{lookup,request:fakeResponse(302,'',{location:'https://127.0.0.1/secret'})}),/private/);
});
test('source redirects cannot leave the approved host',async()=>{
 await assert.rejects(fetchText('https://example.org',{lookup,allowedHosts:new Set(['example.org']),request:fakeResponse(302,'',{location:'https://different.example/a'})}),/approved/);
});
test('HTTP failure and oversized downloads preserve failure state',async()=>{
 await assert.rejects(fetchText('https://example.org',{lookup,request:fakeResponse(403)}),/403/);
 await assert.rejects(fetchText('https://example.org',{lookup,limit:4,request:fakeResponse(200,'12345')}),/size/);
 await assert.rejects(fetchText('https://example.org',{lookup,limit:4,request:fakeResponse(200,'',{'content-length':'5'})}),/size/);
});
test('extractor excludes navigation and scripts, limits excerpts and fingerprints text',()=>{
 const text=Array.from({length:90},(_,i)=>'word'+i).join(' ');
 const html='<h1>Ranger</h1><nav>noisy navigation</nav><article>'+text+'<script>runSomething()</script></article>';
 const snapshot=extractSource(html);
 assert.equal(snapshot.title,'Ranger');assert.equal(snapshot.excerpt.split(' ').length,55);
 assert(!snapshot.excerpt.includes('runSomething'));assert(!snapshot.excerpt.includes('navigation'));
 assert.equal(compareSnapshot(null,snapshot),'first-check');
 assert.equal(compareSnapshot(snapshot,{...snapshot}),'unchanged');
 assert.equal(compareSnapshot(snapshot,extractSource(html.replace('word89','changed89'))),'changed');
 assert.throws(()=>extractSource('<h1>Verify you are human</h1><article>'+text+'</article>'),/could not/);
});
