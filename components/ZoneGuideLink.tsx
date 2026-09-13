import { ExternalLink, MapPin } from 'lucide-react';
import { zoneGuideURL } from '../lib/zone-navigation';

export default function ZoneGuideLink({
  zone,
  onZone,
}: {
  zone: string;
  onZone?: (zone: string) => void;
}) {
  const label = (
    <>
      <MapPin size={16} aria-hidden="true" /> Open zone guide
    </>
  );
  return onZone ? (
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
}
