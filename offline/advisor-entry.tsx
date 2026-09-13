import React from 'react';
import { createRoot } from 'react-dom/client';
import BuildAdvisor, { useBuildAdvisor } from '../components/BuildAdvisor';
import CombatMeter from '../components/CombatMeter';
import ProjectSupport from '../components/ProjectSupport';
import { Compass, Activity } from 'lucide-react';
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
  const [meter, setMeter] = React.useState(false);
  return (
    <main className="advisor-client">
      <nav className="offline-tabs" aria-label="Companion tools">
        <button aria-pressed={!meter} onClick={() => setMeter(false)}>
          <Compass aria-hidden="true" /> Build Advisor
        </button>
        <button className="offline-meter-tab" aria-pressed={meter} onClick={() => setMeter(true)}>
          <Activity aria-hidden="true" /> Combat Meter
        </button>
      </nav>
      <div hidden={meter}>
        <BuildAdvisor
          model={model}
          profileName="local example"
          showProfile={false}
          appVersion={appPackage.version}
        />
      </div>
      <div hidden={!meter}>
        <CombatMeter advisorInput={model.input} advisorPack={model.pack} />
      </div>
      <ProjectSupport />
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
