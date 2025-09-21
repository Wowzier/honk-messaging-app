'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationData, RouteWaypoint } from '@/types';

interface FlightMapProps {
  currentPosition: LocationData;
  startLocation: LocationData;
  endLocation: LocationData;
  waypoints?: RouteWaypoint[];
  className?: string;
}

export function FlightMap({
  currentPosition,
  startLocation,
  endLocation,
  waypoints = [],
  className = ''
}: FlightMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerId = useRef(`map-${Math.random().toString(36).substring(7)}`);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      // Create map instance
      mapRef.current = L.map(mapContainerId.current).setView([0, 0], 2);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Custom duck icon
      const duckIcon = L.divIcon({
        html: '🦆',
        className: 'duck-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      // Add markers for start and end locations
      L.marker([startLocation.latitude, startLocation.longitude], {
        icon: L.divIcon({
          html: '🛫',
          className: 'start-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(mapRef.current);

      L.marker([endLocation.latitude, endLocation.longitude], {
        icon: L.divIcon({
          html: '🛬',
          className: 'end-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(mapRef.current);

      // Add custom CSS for markers
      const style = document.createElement('style');
      style.textContent = `
        .duck-marker, .start-marker, .end-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          background: none;
          border: none;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update flight path and current position
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing layers except tile layer
    mapRef.current.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        layer.remove();
      }
    });

    // Add start and end markers
    L.marker([startLocation.latitude, startLocation.longitude], {
      icon: L.divIcon({
        html: '🛫',
        className: 'start-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(mapRef.current);

    L.marker([endLocation.latitude, endLocation.longitude], {
      icon: L.divIcon({
        html: '🛬',
        className: 'end-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(mapRef.current);

    // Draw flight path
    const pathPoints = waypoints.length > 0
      ? waypoints.map(wp => [wp.latitude, wp.longitude])
      : [[startLocation.latitude, startLocation.longitude], [endLocation.latitude, endLocation.longitude]];

    L.polyline(pathPoints as L.LatLngExpression[], {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 10',
      animate: true
    }).addTo(mapRef.current);

    // Add current position marker (duck)
    const duckMarker = L.marker([currentPosition.latitude, currentPosition.longitude], {
      icon: L.divIcon({
        html: '🦆',
        className: 'duck-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(mapRef.current);

    // Fit bounds to show all points
    const bounds = L.latLngBounds([
      [startLocation.latitude, startLocation.longitude],
      [endLocation.latitude, endLocation.longitude],
      [currentPosition.latitude, currentPosition.longitude],
      ...pathPoints as L.LatLngExpression[]
    ]);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });

  }, [currentPosition, startLocation, endLocation, waypoints]);

  return (
    <div className={`relative ${className}`}>
      <div 
        id={mapContainerId.current}
        className="w-full h-[400px] rounded-lg overflow-hidden shadow-md"
      />
    </div>
  );
}