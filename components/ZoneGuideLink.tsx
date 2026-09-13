import { ExternalLink, MapPin } from 'lucide-react';
import { zoneGuideURL } from '../lib/zone-navigation';
import { useContext } from 'react';
import { LocalMapContext } from './LocalMapContext';

export default function ZoneGuideLink({
  zone,
  onZone,
}: {
  zone: string;
  onZone?: (zone: string) => void;
}) {
  const openMap=useContext(LocalMapContext);
  const label = (
    <>
      <MapPin size={16} aria-hidden="true" /> Open zone guide
    </>
  );
  const guide=onZone ? (
    <button
      type="button"
      className="ba-zone-guide"
      onClick={() => onZone(zone)}
    >
      {label}
    </button>
  ) : (
    <a
      className="ba-zone-guide"
      href={zoneGuideURL(zone)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${zone} zone guide on EQLSaK (opens in your browser)`}
    >
      {label}
      <ExternalLink size={14} aria-hidden="true" />
    </a>
  );
  return <>{guide}{openMap&&<button type="button" className="ba-zone-guide" onClick={()=>openMap(zone)}><MapPin size={16} aria-hidden="true"/> Open local map</button>}</>;
}
