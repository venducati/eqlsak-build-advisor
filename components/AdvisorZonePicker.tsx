'use client';
import { useId, useState } from 'react';
import { Autocomplete } from '@base-ui/react/autocomplete';
import { ChevronDown, MapPin } from 'lucide-react';
import { findZone, matchesZone, type ZoneOption } from '../lib/zone-catalog';
import '../app/advisor-zones.css';

export default function AdvisorZonePicker({
  value,
  zones,
  onChange,
}: {
  value: string;
  zones: ZoneOption[];
  onChange: (name: string, continent?: string) => void;
}) {
  const id = useId();
  const [browseAll, setBrowseAll] = useState(false);
  return (
    <div className="ba-zone-picker">
      <label htmlFor={id}>Current zone</label>
      <Autocomplete.Root
        items={zones}
        value={value}
        autoHighlight
        openOnInputClick
        itemToStringValue={(zone) => zone.name}
        filter={(zone, query) => browseAll || matchesZone(zone, query)}
        onValueChange={(name) => {
          setBrowseAll(false);
          onChange(name, findZone(name, zones)?.continent);
        }}
      >
        <Autocomplete.InputGroup className="ba-zone-input-group">
          <Autocomplete.Input
            id={id}
            placeholder="Type a zone, such as Dagnor’s Cauldron"
            aria-describedby={id + '-help'}
          />
          <Autocomplete.Trigger
            type="button"
            aria-label="Browse all zones"
            onClick={() => setBrowseAll(true)}
          >
            <ChevronDown size={18} />
          </Autocomplete.Trigger>
        </Autocomplete.InputGroup>
        <Autocomplete.Portal>
          <Autocomplete.Positioner
            sideOffset={6}
            className="ba-zone-positioner"
          >
            <Autocomplete.Popup className="ba-zone-popup">
              <Autocomplete.Empty className="ba-zone-empty">
                No match. You can still type and use your own zone name.
              </Autocomplete.Empty>
              <Autocomplete.List className="ba-zone-list">
                {(zone: ZoneOption) => (
                  <Autocomplete.Item
                    key={zone.id}
                    value={zone}
                    className="ba-zone-option"
                  >
                    <MapPin size={16} aria-hidden="true" />
                    <span>
                      {zone.name}
                      <small>
                        {zone.continent}
                        {zone.availability === 'out-of-era'
                          ? ' · Out of era — planning only'
                          : ''}
                      </small>
                    </span>
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
      <small id={id + '-help'}>
        Type to search or use the arrow to browse all {zones.length} locations.
        Some zones do not have hunting advice yet.
      </small>
    </div>
  );
}
