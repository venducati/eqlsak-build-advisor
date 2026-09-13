import {writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {defaultRules} from '../lib/build-advisor.ts';
import {muralFile,shellStyles} from './advisor-theme.mjs';
import factionData from '../data/zone-factions.json' with {type:'json'};
import zoneCatalog from '../data/zone-catalog.json' with {type:'json'};
import combatMessages from '../data/combat-messages.json' with {type:'json'};
import tripStrategy from '../data/trip-strategy.json' with {type:'json'};
const sources=new Map();
for(const evidence of defaultRules.evidence) for(const link of evidence.links) {
 const old=sources.get(link.url);
 sources.set(link.url,{id:createHash('sha256').update(link.url).digest('hex').slice(0,16),title:link.title,url:link.url,classes:old?(!old.classes.length||!evidence.classes.length?[]:[...new Set([...old.classes,...evidence.classes])]):evidence.classes});
}
mkdirSync('desktop/ui',{recursive:true});
for (const link of [...combatMessages.sources, ...tripStrategy.sources]) {
 if (!sources.has(link.url)) sources.set(link.url,{id:createHash('sha256').update(link.url).digest('hex').slice(0,16),title:link.title,url:link.url,classes:[]});
}
for (const url of new Set([...factionData.actions.flatMap(a=>a.sources), ...factionData.factions.flatMap(f=>f.sources), ...zoneCatalog.sources.map(s=>s.url)])) {
 if (!sources.has(url)) sources.set(url,{id:createHash('sha256').update(url).digest('hex').slice(0,16),title:'Zone / faction: '+decodeURIComponent(url.split('/').pop()||new URL(url).hostname).replaceAll('_',' '),url,classes:[]});
}
mkdirSync('desktop/assets',{recursive:true});
copyFileSync('work/offline-advisor-build/advisor.js','desktop/ui/advisor.js');
copyFileSync('work/offline-advisor-build/advisor.css','desktop/ui/advisor.css');
copyFileSync('LICENSE','desktop/LICENSE');
copyFileSync(muralFile,'desktop/assets/eqlsak-mural.webp');
writeFileSync('desktop/source-manifest.json',JSON.stringify({classIds:defaultRules.classes.map(c=>c.id),sources:[...sources.values()]},null,2));
writeFileSync('desktop/ui/base.css',shellStyles('../assets/eqlsak-mural.webp'));
writeFileSync('desktop/ui/index.html',"<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>EQLSaK Build Advisor</title><link rel=\"stylesheet\" href=\"./base.css\"><link rel=\"stylesheet\" href=\"./advisor.css\"></head><body><div id=\"root\"></div><script src=\"./advisor.js\"></script></body></html>");
writeFileSync('desktop/example-rule-update.json',JSON.stringify({format:'eqlsak-rule-update',schemaVersion:1,release:'1.1.0-initial-rules',publishedAt:'2026-09-10T00:00:00Z',notes:'Initial reviewed rules. This example changes nothing; edit and publish a new package to distribute revised strategies.',rules:defaultRules},null,2));
console.log('Prepared desktop UI, '+sources.size+' source references and example update package.');
