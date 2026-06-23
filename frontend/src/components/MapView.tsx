import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/cn';

// Fix default marker icons that Leaflet can't resolve under a bundler.
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

interface Props {
  lat: number;
  lng: number;
  label?: string;
  zoom?: number;
  className?: string;
}

/** Small read-only Leaflet map showing a single marker. */
export default function MapView({ lat, lng, label, zoom = 14, className }: Props) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-black/[0.06]', className)}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', minHeight: 240 }}
        aria-label="Clinic location map"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={icon}>
          {label && <Popup>{label}</Popup>}
        </Marker>
        <Recenter lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
