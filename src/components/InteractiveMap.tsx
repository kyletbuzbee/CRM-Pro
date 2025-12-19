import React, { useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { Prospect, ContactStatus } from '../types';
import { HOME_BASE } from '../utls/constants';

interface InteractiveMapProps {
  prospects: Prospect[];
  onProspectClick?: (prospect: Prospect) => void;
}

const ProspectMarker: React.FC<{
  prospect: Prospect;
  onClick?: (prospect: Prospect) => void;
}> = ({ prospect, onClick }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoWindowShown, setInfoWindowShown] = React.useState(false);

  const handleMarkerClick = useCallback(() => {
    if (onClick) {
      onClick(prospect);
    }
    setInfoWindowShown(true);
  }, [onClick, prospect]);

  const pinColor = useMemo(() => {
    switch (prospect.contactStatus) {
      case ContactStatus.HOT:
        return '#DC3545'; // Red
      case ContactStatus.WARM:
        return '#FFC107'; // Yellow/Orange
      case ContactStatus.COLD:
      case ContactStatus.NEVER:
        return '#17A2B8'; // Blue
      case ContactStatus.WON:
        return '#28A745'; // Green
      case ContactStatus.LOST:
        return '#6C757D'; // Gray
      default:
        return '#6C757D';
    }
  }, [prospect.contactStatus]);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: prospect.lat, lng: prospect.lng }}
        title={prospect.company}
        onClick={handleMarkerClick}
      >
        <Pin
          background={pinColor}
          borderColor="#ffffff"
          glyphColor="#ffffff"
        />
      </AdvancedMarker>

      {infoWindowShown && (
        <InfoWindow
          anchor={marker}
          onClose={() => setInfoWindowShown(false)}
          headerContent={<h3 className="font-bold text-slate-800">{prospect.company}</h3>}
        >
          <div className="p-2 max-w-xs">
            <p className="text-sm text-gray-600 mb-2">{prospect.address}</p>
            <div className="space-y-1 text-xs">
              <p><span className="font-medium">Industry:</span> {prospect.industry}</p>
              <p><span className="font-medium">Status:</span> {prospect.contactStatus}</p>
              <p><span className="font-medium">Priority:</span> {prospect.priorityScore}/100</p>
              {prospect.lastOutcome && (
                <p><span className="font-medium">Last Outcome:</span> {prospect.lastOutcome}</p>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  prospects,
  onProspectClick
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyC3JebzGde0Qyo22Vq_sW0ukIVNcKOCnyE';

  const center = useMemo(() => {
    if (prospects.length === 0) {
      return { lat: HOME_BASE.lat, lng: HOME_BASE.lng };
    }

    // Calculate center of all prospects
    const lats = prospects.map(p => p.lat).filter(lat => lat !== 0);
    const lngs = prospects.map(p => p.lng).filter(lng => lng !== 0);

    if (lats.length === 0 || lngs.length === 0) {
      return { lat: HOME_BASE.lat, lng: HOME_BASE.lng };
    }

    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    return { lat: avgLat, lng: avgLng };
  }, [prospects]);

  const validProspects = useMemo(() =>
    prospects.filter(p => p.lat !== 0 && p.lng !== 0),
    [prospects]
  );

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl border">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Map Unavailable</h3>
          <p className="text-sm text-gray-600">
            Google Maps API key not configured.<br />
            Add VITE_GOOGLE_MAPS_API_KEY to your .env file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="w-full h-full rounded-2xl overflow-hidden border">
        <Map
          defaultCenter={center}
          defaultZoom={10}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
          mapId="crm-prospects-map"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Home Base Marker */}
          <AdvancedMarker
            position={{ lat: HOME_BASE.lat, lng: HOME_BASE.lng }}
            title={HOME_BASE.name}
          >
            <Pin
              background="#001F3F"
              borderColor="#ffffff"
              glyphColor="#ffffff"
            />
          </AdvancedMarker>

          {/* Prospect Markers */}
          {validProspects.map((prospect) => (
            <ProspectMarker
              key={prospect.cid}
              prospect={prospect}
              onClick={onProspectClick}
            />
          ))}
        </Map>
      </div>
    </APIProvider>
  );
};