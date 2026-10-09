import React, { useEffect, useState, useRef } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

interface MovingCarMarkerProps {
  routePath: L.LatLngExpression[];
}

export default function MovingCarMarker({ routePath }: MovingCarMarkerProps) {
  const [position, setPosition] = useState<L.LatLngExpression | null>(null);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!routePath || routePath.length < 2) {
      setPosition(null);
      return;
    }

    // Calculate total distance to normalize speed
    let totalDistance = 0;
    const segments: number[] = [];
    
    for (let i = 0; i < routePath.length - 1; i++) {
      const p1 = L.latLng(routePath[i]);
      const p2 = L.latLng(routePath[i + 1]);
      const dist = p1.distanceTo(p2);
      totalDistance += dist;
      segments.push(dist);
    }

    // Calculate duration based on distance so it feels consistent, 
    // but keep it between 15 and 45 seconds.
    // Assuming a visual speed of roughly 1000km per 30 seconds.
    const calculatedDuration = (totalDistance / 1000) * 30; 
    const duration = Math.max(15000, Math.min(45000, calculatedDuration));
    
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Loop animation every 'duration' ms
      const progress = (elapsed % duration) / duration;
      
      // Find current segment
      let targetDistance = progress * totalDistance;
      let currentDistance = 0;
      let segmentIndex = 0;
      
      for (let i = 0; i < segments.length; i++) {
        if (currentDistance + segments[i] >= targetDistance) {
          segmentIndex = i;
          break;
        }
        currentDistance += segments[i];
      }
      
      if (segmentIndex >= routePath.length - 1) {
        segmentIndex = routePath.length - 2;
      }
      
      const p1 = L.latLng(routePath[segmentIndex]);
      const p2 = L.latLng(routePath[segmentIndex + 1]);
      
      const segmentProgress = segments[segmentIndex] === 0 ? 0 : (targetDistance - currentDistance) / segments[segmentIndex];
      
      const lat = p1.lat + (p2.lat - p1.lat) * segmentProgress;
      const lng = p1.lng + (p2.lng - p1.lng) * segmentProgress;
      
      setPosition([lat, lng]);
      
      // Calculate rotation
      const angle = Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * (180 / Math.PI);
      setRotation(angle);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [routePath]);

  if (!position) return null;

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 30 50" width="100%" height="100%">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.4)" />
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <!-- Car Body -->
        <rect x="2" y="2" width="16" height="36" rx="4" fill="#ef4444" />
        <!-- Roof -->
        <rect x="4" y="12" width="12" height="16" rx="2" fill="#991b1b" />
        <!-- Front Windshield -->
        <path d="M 4 12 L 16 12 L 14 8 L 6 8 Z" fill="#3b82f6" />
        <!-- Rear Windshield -->
        <path d="M 4 28 L 16 28 L 14 32 L 6 32 Z" fill="#3b82f6" />
        <!-- Headlights -->
        <circle cx="5" cy="3" r="2" fill="#fef08a" />
        <circle cx="15" cy="3" r="2" fill="#fef08a" />
        <!-- Taillights -->
        <rect x="3" y="36" width="4" height="2" fill="#f472b6" />
        <rect x="13" y="36" width="4" height="2" fill="#f472b6" />
      </g>
    </svg>
  `;

  const rotatedIcon = new L.DivIcon({
    className: 'custom-car-icon',
    html: `<div style="transform: rotate(${rotation}deg); width: 20px; height: 40px; margin-left: -10px; margin-top: -20px; transition: transform 0.1s linear;">${svgString}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

  return <Marker position={position} icon={rotatedIcon} zIndexOffset={1000} />;
}
