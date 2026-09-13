// Run with desktop/node_modules/electron/dist/electron.exe scripts/test-desktop-ui.cjs.
// Uses a separate data directory, made-up logs, and fake online/picker bridges.
const { app, BrowserWindow, session } = require('electron');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const testDir = resolve('work/ui-actions-' + Date.now());
mkdirSync(testDir, { recursive: true });
app.setPath('userData', resolve(testDir, 'profile'));
app.disableHardwareAcceleration();
const rules = { ...JSON.parse(readFileSync('data/build-advisor.json')), evidence: JSON.parse(readFileSync('data/build-evidence.json')) };
const fixture = `
window.testCalls={downloads:[],sources:[],pause:[],recent:[],stop:0,detect:0,folder:0,start:0};
const originalAnchorClick=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){if(this.download){testCalls.downloads.push(this.download);return;}return originalAnchorClick.call(this);};
window.testRules=${JSON.stringify(rules)};
window.eqlDesktop={version:'test',getSourceHistory:async()=>({version:1,sources:{}}),onProgress:()=>()=>{},checkSources:async classes=>{testCalls.sources.push(classes);return {checkedAt:new Date().toISOString(),results:[]}},getRuleUpdate:async()=>{const rules=structuredClone(testRules);rules.weights.control+=1;return {payload:{format:'eqlsak-rule-update',schemaVersion:1,release:'test',publishedAt:new Date().toISOString(),notes:'Test only',rules},hash:'test',hashVerified:false}},};
window.eqlMeter={onData:fn=>{window.testEmit=fn;return()=>{}},detect:async()=>{testCalls.detect++;return window.testSearch || {candidates:[],checked:[],warnings:[]}},readRecent:async id=>{testCalls.recent.push(id);if(window.testReadError)throw new Error(window.testReadError);return window.testSnapshot;},chooseFolder:async()=>{testCalls.folder++;return null},start:async()=>{testCalls.start++;return {name:'eqlog_Test_Example.txt',skipPartial:false}},startDetected:async()=>({name:'eqlog_Test_Example.txt',skipPartial:false}),pause:async value=>{testCalls.pause.push(value)},stop:async()=>{testCalls.stop++}};
`;
writeFileSync(resolve(testDir, 'fixture.js'), fixture);
const asset = name => pathToFileURL(resolve('desktop/ui', name)).href;
writeFileSync(resolve(testDir, 'index.html'), `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${asset('base.css')}"><link rel="stylesheet" href="${asset('advisor.css')}"></head><body><div id="root"></div><script src="./fixture.js"></script><script src="${asset('advisor.js')}"></script></body></html>`);
app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']}, (_request, cb) => cb({cancel:true}));
  const window = new BrowserWindow({show:false,width:1320,height:940,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  const errors=[];
  window.webContents.on('console-message', (_event, level, message) => { if(level===3) errors.push(message); });
  try {
    await window.loadFile(resolve(testDir, 'index.html'));
    const result = await window.webContents.executeJavaScript(readFileSync('scripts/ui-actions-scenario.js','utf8'));
    writeFileSync(resolve(testDir, 'result.json'), JSON.stringify({result,errors},null,2));
    window.setSize(1322,940);
    await new Promise(resolve=>setTimeout(resolve,100));
    writeFileSync(resolve(testDir,'fit-report-wide.png'),(await window.webContents.capturePage()).toPNG());
    window.setSize(420,900);
    await new Promise(resolve=>setTimeout(resolve,100));
    writeFileSync(resolve(testDir,'fit-report-narrow.png'),(await window.webContents.capturePage()).toPNG());
    if(errors.length) throw new Error(errors.join('\n'));
    console.log(JSON.stringify(result,null,2));
    console.log('UI_ACTIONS_PASSED · results: '+testDir);
    app.exit(0);
  } catch(error) { writeFileSync(resolve(testDir,'failure.txt'), await window.webContents.executeJavaScript('document.body.innerText')); console.error(error); console.error('Details: '+testDir); app.exit(1); }
});
