import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTheme } from '../context/ThemeContext';
import MovingCarMarker from './MovingCarMarker';

const createCustomIcon = (color: string, label: string) => {
  return new L.DivIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 14px; font-family: sans-serif;">
          ${label}
        </span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const startIcon = createCustomIcon('#22c55e', 'A'); // Green
const endIcon = createCustomIcon('#ef4444', 'B'); // Red
const waypointIcon = (index: number) => createCustomIcon('#3b82f6', String(index)); // Blue

interface LocationData {
  lat: number;
  lng: number;
  displayName: string;
}

interface InteractiveMapProps {
  fromLocation: LocationData | null;
  toLocation: LocationData | null;
  destinations?: (LocationData | null)[];
  isSheetExpanded?: boolean;
}

function MapUpdater({ from, to, destinations, isSheetExpanded }: { from: LocationData | null, to: LocationData | null, destinations: (LocationData | null)[], isSheetExpanded?: boolean }) {
  const map = useMap();

  useEffect(() => {
    const points: L.LatLngExpression[] = [];
    if (from) points.push([from.lat, from.lng]);
    
    destinations.forEach(d => {
      if (d) points.push([d.lat, d.lng]);
    });
    
    if (to) points.push([to.lat, to.lng]);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      
      // Calculate padding dynamically based on sheet state
      // If expanded, bottom sheet takes ~90vh, so we need huge bottom padding
      // If collapsed, bottom sheet takes ~50vh, so we need medium bottom padding
      const bottomPadding = isSheetExpanded ? window.innerHeight * 0.85 : window.innerHeight * 0.55;
      
      map.fitBounds(bounds, { 
        paddingTopLeft: [50, 100], 
        paddingBottomRight: [50, bottomPadding], 
        maxZoom: 13,
        animate: true,
        duration: 0.5
      });
    } else {
      // Default to India
      map.setView([20.5937, 78.9629], 5);
    }
  }, [from, to, destinations, map, isSheetExpanded]);

  return null;
}

export default function InteractiveMap({ fromLocation, toLocation, destinations = [], isSheetExpanded = false }: InteractiveMapProps) {
  const { theme } = useTheme();
  const [routePath, setRoutePath] = useState<L.LatLngExpression[]>([]);
  const points = useMemo(() => {
    const pts: L.LatLngExpression[] = [];
    if (fromLocation) pts.push([fromLocation.lat, fromLocation.lng]);
    destinations.forEach(d => {
      if (d) pts.push([d.lat, d.lng]);
    });
    if (toLocation) pts.push([toLocation.lat, toLocation.lng]);
    return pts;
  }, [fromLocation?.lat, fromLocation?.lng, toLocation?.lat, toLocation?.lng, JSON.stringify(destinations)]);

  useEffect(() => {
    let isMounted = true;

    const fetchRoute = async () => {
      if (points.length < 2) {
        if (isMounted) setRoutePath([]);
        return;
      }
      
      try {
        // OSRM expects longitude,latitude
        const coords = points.map(p => `${(p as number[])[1]},${(p as number[])[0]}`).join(';');
        
        // Using a more reliable public OSRM instance
        const res = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        
        if (!res.ok) {
          console.warn("Routing API returned an error:", res.status);
          if (isMounted) setRoutePath(points);
          return;
        }

        const data = await res.json();
        
        if (data.routes && data.routes[0] && isMounted) {
          // GeoJSON coordinates are [longitude, latitude], Leaflet expects [latitude, longitude]
          const routeCoords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          setRoutePath(routeCoords);
        } else if (isMounted) {
          // Fallback to straight line if routing fails
          setRoutePath(points);
        }
      } catch (error) {
        console.warn("Could not fetch road route, falling back to straight line.");
        // Fallback to straight line
        if (isMounted) setRoutePath(points);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchRoute();
    }, 500); // Debounce route fetching by 500ms

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [points]);

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className={`h-full w-full z-0 transition-all duration-500 ${theme === 'dark' ? 'invert hue-rotate-180 brightness-[0.85] contrast-[1.2] grayscale-[0.2]' : 'contrast-[1.1] saturate-[1.2]'}`}>
      <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }} attributionControl={false} zoomControl={false}>
        <TileLayer
          url={tileUrl}
        />
        
        {fromLocation && (
          <Marker position={[fromLocation.lat, fromLocation.lng]} icon={startIcon}>
            <Popup>Pickup: {fromLocation.displayName}</Popup>
          </Marker>
        )}
        
        {destinations.map((d, i) => d && (
          <Marker key={`dest-${d.lat}-${d.lng}-${i}`} position={[d.lat, d.lng]} icon={waypointIcon(i + 1)}>
            <Popup>Stop {i + 1}: {d.displayName}</Popup>
          </Marker>
        ))}

        {toLocation && (
          <Marker position={[toLocation.lat, toLocation.lng]} icon={endIcon}>
            <Popup>Dropoff: {toLocation.displayName}</Popup>
          </Marker>
        )}

        {routePath.length > 1 && (
          <>
            {/* Background solid line */}
            <Polyline positions={routePath} color={theme === 'dark' ? '#000000' : '#4f46e5'} weight={theme === 'dark' ? 6 : 5} opacity={theme === 'dark' ? 0.5 : 0.3} />
            {/* Foreground animated dashed line */}
            <Polyline 
              positions={routePath} 
              color={theme === 'dark' ? '#000000' : '#4f46e5'} 
              weight={theme === 'dark' ? 6 : 5} 
              opacity={0.9} 
              className="animated-route-path"
            />
            {/* Moving Car */}
            <MovingCarMarker routePath={routePath} />
          </>
        )}

        <MapUpdater from={fromLocation} to={toLocation} destinations={destinations} isSheetExpanded={isSheetExpanded} />
      </MapContainer>
    </div>
  );
}
