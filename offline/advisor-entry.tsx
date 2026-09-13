import React from 'react';
import { createRoot } from 'react-dom/client';
import BuildAdvisor, { useBuildAdvisor } from '../components/BuildAdvisor';
import CombatMeter from '../components/CombatMeter';
import ProjectSupport from '../components/ProjectSupport';
import AdvisorSoundControls from '../components/AdvisorSoundControls';
import MyGuild from '../components/MyGuild';
import { Compass, Activity, Crown, Map } from 'lucide-react';
import MapLibrary from '../components/MapLibrary';
import {LocalMapContext} from '../components/LocalMapContext';
import appPackage from '../package.json' with { type: 'json' };
import '../app/advisor-spacing.css';
function App() {
  const model = useBuildAdvisor({
    name: 'local example',
    build: 'RNG / ROG / BRD',
    level: '',
    location: '',
    goal: '',
  });
  const [tool, setTool] = React.useState<'advisor' | 'meter' | 'guild' | 'maps'>('advisor');
  const [mapZone,setMapZone]=React.useState<string|null>(null);
  const [mapRequest,setMapRequest]=React.useState(0);
  React.useEffect(()=>window.eqlOverlay?.onOpenControls(()=>setTool('meter')),[]);
  return (
    <LocalMapContext.Provider value={zone=>{setMapZone(zone);setMapRequest(n=>n+1);setTool('maps');window.scrollTo({top:0});}}><main className="advisor-client">
      <nav className="offline-tabs" aria-label="Companion tools" data-sound="navigate">
        <button aria-pressed={tool === 'advisor'} onClick={() => setTool('advisor')}>
          <Compass aria-hidden="true" /> Build Advisor
        </button>
        <button className="offline-meter-tab" aria-pressed={tool === 'meter'} onClick={() => setTool('meter')}>
          <Activity aria-hidden="true" /> Combat Meter
        </button>
        <button aria-pressed={tool === 'guild'} onClick={() => setTool('guild')}><Crown aria-hidden="true" /> My Guild</button>
        <button aria-pressed={tool === 'maps'} onClick={()=>{setMapZone(null);setTool('maps');}}><Map aria-hidden="true"/> Maps &amp; Routes</button>
      </nav>
      <AdvisorSoundControls />
      <div hidden={tool !== 'advisor'}>
        <BuildAdvisor
          model={model}
          profileName="local example"
          showProfile={false}
          appVersion={appPackage.version}
        />
      </div>
      <div hidden={tool !== 'meter'}>
        <CombatMeter advisorInput={model.input} advisorPack={model.pack} />
      </div>
      <div hidden={tool !== 'guild'}><MyGuild /></div>
      <div hidden={tool !== 'maps'}><MapLibrary zone={mapZone??model.input.zone} requestKey={mapRequest} active={tool==='maps'}/></div>
      <ProjectSupport />
    </main></LocalMapContext.Provider>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
