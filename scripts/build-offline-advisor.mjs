
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {muralFile,shellStyles} from './advisor-theme.mjs';
// Self-contained browser artifact using the exact same engine, rule pack and UI.
const outDir=resolve('work/offline-advisor-build');
await build({
 configFile:false,plugins:[react()],define:{'process.env.NODE_ENV':'"production"'},
 build:{outDir,emptyOutDir:true,lib:{entry:resolve('offline/advisor-entry.tsx'),name:'EQLSaKAdvisor',formats:['iife'],fileName:()=> 'advisor.js',cssFileName:'advisor'},cssCodeSplit:false}
});
const js=readFileSync(resolve(outDir,'advisor.js'),'utf8').replace(/<\/script/gi,'<\\/script');
const css=readFileSync(resolve(outDir,'advisor.css'),'utf8');
const art='data:image/webp;base64,'+readFileSync(muralFile).toString('base64');
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EQLSaK · Build Advisor</title><style>'+css+shellStyles(art)+'</style></head><body><div id="root"></div><script>'+js+'</script></body></html>';
mkdirSync('outputs',{recursive:true});
writeFileSync('outputs/EQLSaK-Offline-Advisor.html',html);
console.log('Saved outputs/EQLSaK-Offline-Advisor.html. No server or network required.');
