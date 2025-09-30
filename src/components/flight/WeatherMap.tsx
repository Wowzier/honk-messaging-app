'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import '../../styles/leaflet.css';
import L from 'leaflet';
import { LocationData } from '@/types';

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: '/sticker.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const destinationIcon = L.icon({
  iconUrl: '/file.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface WeatherMapProps {
  currentPosition: LocationData;
  destinationPosition: LocationData;
  flightPath?: [number, number][];
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export default function WeatherMap({ currentPosition, destinationPosition, flightPath }: WeatherMapProps) {
  const center: [number, number] = [currentPosition.latitude, currentPosition.longitude];

  // Define major cities and terrain features for labels
  const labels = [
    // Major cities
    { pos: [40.7128, -74.0060], name: "New York", type: "city" },
    { pos: [51.5074, -0.1278], name: "London", type: "city" },
    { pos: [35.6762, 139.6503], name: "Tokyo", type: "city" },
    { pos: [-33.8688, 151.2093], name: "Sydney", type: "city" },
    // Mountain ranges
    { pos: [40, -110], name: "Rocky Mountains", type: "mountain" },
    { pos: [46.5, 10], name: "Alps", type: "mountain" },
    { pos: [29, 80], name: "Himalayas", type: "mountain" },
    // Oceans
    { pos: [30, -40], name: "Atlantic Ocean", type: "ocean" },
    { pos: [10, 160], name: "Pacific Ocean", type: "ocean" },
    { pos: [0, 80], name: "Indian Ocean", type: "ocean" },
    // Deserts
    { pos: [23, 15], name: "Sahara Desert", type: "desert" },
    { pos: [23, 45], name: "Arabian Desert", type: "desert" },
    { pos: [33, -113], name: "Mojave Desert", type: "desert" },
  ];

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-md">
      <MapContainer
        center={center}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Add labels for cities and terrain */}
        {labels.map((label, index) => (
          <Marker 
            key={index} 
            position={label.pos as [number, number]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div class="${
                  label.type === 'city' ? 'text-blue-600' :
                  label.type === 'mountain' ? 'text-gray-700' :
                  label.type === 'ocean' ? 'text-blue-400' :
                  'text-orange-600'
                } text-xs font-medium bg-white px-1 py-0.5 rounded shadow-sm">
                  ${label.name}
                </div>
              `,
            })}
          />
        ))}
        
        <MapUpdater center={center} />

        {/* Current position marker */}
        <Marker position={[currentPosition.latitude, currentPosition.longitude]} icon={icon}>
          <Popup>
            Current Position
            <br />
            {currentPosition.state && `${currentPosition.state}, `}
            {currentPosition.country}
          </Popup>
        </Marker>

        {/* Destination marker */}
        <Marker position={[destinationPosition.latitude, destinationPosition.longitude]} icon={destinationIcon}>
          <Popup>
            Destination
            <br />
            {destinationPosition.state && `${destinationPosition.state}, `}
            {destinationPosition.country}
          </Popup>
        </Marker>

        {/* Flight path */}
        {flightPath && flightPath.length > 0 && (
          <Polyline
            positions={flightPath}
            pathOptions={{
              color: 'blue',
              weight: 2,
              opacity: 0.6,
              dashArray: '5,10'
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}