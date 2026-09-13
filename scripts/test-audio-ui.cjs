// Hidden, isolated Chromium UI + actual Web Audio rendering. Speaker output is muted.
const { app, BrowserWindow, session } = require('electron');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');
const dir = resolve('work/audio-guild-ui-' + Date.now());
mkdirSync(dir, { recursive: true });
app.setPath('userData', resolve(dir, 'profile'));
app.disableHardwareAcceleration();
const cues = JSON.parse(readFileSync('data/interface-sounds.json'));
const audioCode = ts.transpileModule(readFileSync('lib/advisor-audio.ts', 'utf8').replace(/^import soundData.*$/m, 'const soundData = ' + JSON.stringify(cues) + ';'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/^export /gm, '');
writeFileSync(resolve(dir, 'audio-render.js'), audioCode + '\nwindow.audioRender = {scheduleSound, soundCues};');
writeFileSync(resolve(dir, 'fixture.js'), `
window.audioProbe={contexts:0,starts:[],hidden:false};
Object.defineProperty(document,'visibilityState',{get:()=>audioProbe.hidden?'hidden':'visible'});
const NativeAudioContext=window.AudioContext;
window.AudioContext=class extends NativeAudioContext {
 constructor(...args){super(...args);audioProbe.contexts++;}
 createOscillator(){const osc=super.createOscillator();const start=osc.start.bind(osc);osc.start=(...args)=>{audioProbe.starts.push({hz:osc.frequency.value,wave:osc.type});return start(...args)};return osc;}
};
window.eqlMeter={onData:fn=>{window.testEmit=fn;return()=>{}},start:async()=>({name:'eqlog_Fixture_Test.txt',skipPartial:false}),stop:async()=>{},pause:async()=>{}};
`);
const asset = name => pathToFileURL(resolve('desktop/ui', name)).href;
writeFileSync(resolve(dir, 'index.html'), `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${asset('base.css')}"><link rel="stylesheet" href="${asset('advisor.css')}"></head><body><div id="root"></div><script src="./fixture.js"></script><script src="./audio-render.js"></script><script src="${asset('advisor.js')}"></script></body></html>`);
app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_request, cb) => cb({ cancel: true }));
  const window = new BrowserWindow({ show: false, width: 1320, height: 940, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.debugger.attach('1.3');
  const deadline = setTimeout(() => { console.error('Interface test timed out.'); app.exit(1); }, 55000);
  window.webContents.setAudioMuted(true);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const errors = [];
  window.webContents.on('console-message', (_event, level, message) => { if (level === 3) errors.push(message); });
  const run = code => window.webContents.executeJavaScript(code, true);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const click = async label => {
    const point = await run(`(()=>{const button=[...document.querySelectorAll('button')].find(el=>!el.closest('[hidden]')&&el.textContent.trim()===${JSON.stringify(label)});if(!button||button.disabled)throw Error('Missing/disabled button '+${JSON.stringify(label)});button.scrollIntoView({block:'center'});button.focus();const r=button.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await window.webContents.debugger.sendCommand('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await window.webContents.debugger.sendCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await wait(150);
    console.log('Checked action: ' + label);
  };
  try {
    await window.loadFile(resolve(dir, 'index.html')); await wait(180);
    await window.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true });
    assert(await run('audioProbe.contexts===0'), 'Initial load must not create audio');
    const rendered = await run(`(async()=>{const result=[];for(const cue of Object.keys(audioRender.soundCues)){const ctx=new OfflineAudioContext(1,48000,48000);audioRender.scheduleSound(ctx,ctx.destination,cue,0);const buffer=await ctx.startRendering();const data=buffer.getChannelData(0);let peak=0,energy=0,tail=0;for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));energy+=data[i]*data[i];if(i>40000)tail=Math.max(tail,Math.abs(data[i]));}result.push({cue,peak,rms:Math.sqrt(energy/data.length),tail});}return result;})()`);
    for (const cue of rendered) { assert(cue.peak > .01 && cue.peak < .4, cue.cue + ': audible render with headroom'); assert(cue.tail === 0, cue.cue + ': no lingering sound'); }
    await click('Sound Off');
    assert(await run('audioProbe.starts.length>0'), 'Enabling sound must produce a cue');
    assert(await run('document.querySelector(".ba-sound-toggle").getAttribute("aria-pressed")==="true"'), 'Sound state');
    await run('document.querySelector(".ba-sound-options summary").click()');
    await run(`(()=>{const input=document.querySelector('#ba-sound-volume');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'20');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    assert(await run('JSON.parse(localStorage.getItem("eqlsak-interface-sounds-v1")).volume===20'), 'Volume saved');
    await click('Try report sound');
    const beforeMute = await run('audioProbe.starts.length');
    await click('Sound On');
    await click('Combat Meter');
    assert(await run(`audioProbe.starts.length===${beforeMute}`), 'Muted nav must not generate notes');
    await click('Sound Off'); await wait(800);
    const beforeTab = await run('audioProbe.starts.length');
    await click('Build Advisor');
    assert(await run(`audioProbe.starts.length>${beforeTab}`), 'Navigation activates shared click sound');
    const beforeReport = await run('audioProbe.starts.length');
    await click('See why Bard fits');
    assert(await run('!!document.querySelector(".ba-fit-report[open]")'), 'Report opened');
    assert(await run(`audioProbe.starts.length>=${beforeReport}+4`), 'Report completion plays harp notes');
    await click('Close report'); await wait(800);
    await click('Combat Meter'); await click('Choose live log'); await wait(800);
    const beforeTrip = await run('audioProbe.starts.length');
    await run('testEmit(' + JSON.stringify({text:'[Sun Sep 13 12:00:00 2026] You have entered The Estate of Unrest.\n[Sun Sep 13 12:00:01 2026] You slash a dummy for 10 points of damage.\n',reset:false,backlog:0}) + ')');
    await wait(100);
    assert(await run(`audioProbe.starts.length===${beforeTrip}`), 'Combat ticks are quiet');
    await run('testEmit(' + JSON.stringify({text:"[Sun Sep 13 12:01:00 2026] You have entered Dagnor's Cauldron.\n",reset:false,backlog:0}) + ')');
    await wait(150);
    assert(await run(`audioProbe.starts.length===${beforeTrip}+3`), 'One trip chime at a logged exit');
    await click('Stop');
    const beforeHidden = await run('audioProbe.starts.length');
    await run('audioProbe.hidden=true;document.dispatchEvent(new Event("visibilitychange"));');
    await click('My Guild');
    assert(await run(`audioProbe.starts.length===${beforeHidden}`), 'Hidden pages stay quiet');
    await run('audioProbe.hidden=false');
    const rows = Array.from({ length: 31 }, (_, index) => ['Member' + String(index + 1).padStart(2, '0'), String(20 + index), index % 2 ? 'WAR/CLR/ENC' : 'RNG/BRD/ROG', index % 2 ? 'Warden' : 'Member', '', '09/13/26', 'Felwithe', index === 0 ? '<img src=x onerror=alert(1)>' : '', '', 'off', 'off', '0', '', '', ''].join('\t')).join('\n');
    await run(`(()=>{const input=document.querySelector('.my-guild input[type=file]');const dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(rows)}],'Silver_Testrealm-20260913-131442.txt',{type:'text/plain'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await wait(200);
    assert(await run('document.querySelectorAll(".guild-member").length===25'), 'Roster pagination');
    assert(await run('!document.querySelector(".my-guild img")'), 'Imported text cannot create HTML');
    await click('Next page');
    assert(await run('document.querySelectorAll(".guild-member").length===6'), 'Next roster page');
    await click('Previous page');
    await run(`(()=>{const input=document.querySelector('.guild-filters input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Member07');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await wait(100);
    assert(await run('document.querySelectorAll(".guild-member").length===1'), 'Roster search');
    await window.webContents.reload(); await wait(300);
    assert(await run('audioProbe.contexts===0'), 'Saved On does not autoplay after reload');
    assert(await run('document.querySelector(".ba-sound-toggle").textContent.includes("Sound On")'), 'Sound preference restored');
    await click('My Guild');
    assert(await run('document.querySelectorAll(".guild-member").length===25'), 'Roster restored locally');
    const snapshots = [];
    for (const width of [1320, 760, 420]) {
      window.setSize(width, 940); await wait(140);
      await run('window.scrollTo(0,0)');
      await wait(180);
      assert(await run('document.documentElement.scrollWidth<=window.innerWidth'), 'No guild page overflow at ' + width);
      writeFileSync(resolve(dir, 'guild-' + width + '.png'), (await window.webContents.capturePage()).toPNG());
      snapshots.push(width);
    }
    await click('Build Advisor');
    await run('document.querySelector(".ba-sound-options").open=true;window.scrollTo(0,0)');
    await wait(180);
    writeFileSync(resolve(dir, 'sounds-narrow.png'), (await window.webContents.capturePage()).toPNG());
    assert(await run('document.documentElement.scrollWidth<=window.innerWidth'), 'Sound settings no overflow');
    await click('My Guild'); await click('Remove saved roster');
    assert(await run('localStorage.getItem("eqlsak-guild-roster-v1")===null'), 'Saved roster removed');
    if (errors.length) throw Error(errors.join('\n'));
    const result = { rendered, screenshots: snapshots, checks: 'silent launch, muted playback, volume storage, real clicks, report completion, quiet combat ticks, trip exit, hidden page, roster import/search/pagination, safe text, persistence, clear and responsive layouts' };
    writeFileSync(resolve(dir, 'results.json'), JSON.stringify(result, null, 2));
    console.log('AUDIO_GUILD_UI_PASSED ' + dir); console.log(JSON.stringify(result));
    clearTimeout(deadline);
    app.exit(0);
  } catch (error) { console.error(error); console.error('Details: ' + dir); writeFileSync(resolve(dir, 'failure.txt'), await run('document.body.innerText')); app.exit(1); }
});
