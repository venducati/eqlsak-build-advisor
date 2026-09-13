import {
  Shield,
  Cross,
  Crown,
  BowArrow,
  Moon,
  Sprout,
  Footprints,
  Music,
  Swords,
  CloudLightning,
  Skull,
  Flame,
  WandSparkles,
  Eye,
  PawPrint,
  Axe,
  Compass,
  ScrollText,
  Sparkles,
  Settings2,
  MapPin,
  Users,
  TriangleAlert,
  Target,
  Scale,
  MessageCircle,
  CircleOff,
} from 'lucide-react';
const glyphs = {
  WAR: Shield,
  CLR: Cross,
  PAL: Crown,
  RNG: BowArrow,
  SHD: Moon,
  DRU: Sprout,
  MNK: Footprints,
  BRD: Music,
  ROG: Swords,
  SHM: CloudLightning,
  NEC: Skull,
  WIZ: Flame,
  MAG: WandSparkles,
  ENC: Eye,
  BST: PawPrint,
  BER: Axe,
  dps: Swords,
  tank: Shield,
  heal: Cross,
  control: Eye,
  mobility: Footprints,
  travel: Compass,
  stealth: Moon,
  pulling: Target,
  survivability: Shield,
  faction: Scale,
  compass: Compass,
  book: ScrollText,
  why: Sparkles,
  settings: Settings2,
  zone: MapPin,
  buddy: Users,
  warning: TriangleAlert,
  target: Target,
  opinion: MessageCircle,
  excluded: CircleOff,
};
export default function AdvisorIcon({
  code,
  medallion = false,
}: {
  code: string;
  medallion?: boolean;
}) {
  const Glyph = glyphs[code as keyof typeof glyphs] || Compass;
  const known = Object.hasOwn(glyphs, code) ? code : 'compass';
  return (
    <span
      className={`ba-icon ba-icon-${known}${medallion ? ' ba-medallion' : ''}`}
      aria-hidden="true"
    >
      <Glyph strokeWidth={1.65} />
    </span>
  );
}
