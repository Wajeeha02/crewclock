// src/components/MapPicker.tsx
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface MapPickerProps {
    lat: number;
    lng: number;
    radius: number;
    onLocationSelect: (lat: number, lng: number) => void;
    height?: string;
}

export default function MapPicker({ lat, lng, radius, onLocationSelect, height = '320px' }: MapPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const circleRef = useRef<L.Circle | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({ lat, lng });

    // Initialize Leaflet map
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapRef.current) return; // already initialized

        // Fix Leaflet default icon paths in bundlers
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const initialLat = lat || 37.7749;
        const initialLng = lng || -122.4194;

        const map = L.map(mapContainerRef.current, {
            center: [initialLat, initialLng],
            zoom: 15,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        // Custom marker icon with bright color
        const customIcon = L.divIcon({
            className: 'custom-map-pin-div',
            html: `<div class="map-pin-outer"><div class="map-pin-inner"></div></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });

        const marker = L.marker([initialLat, initialLng], {
            draggable: true,
            icon: customIcon,
        }).addTo(map);

        const circle = L.circle([initialLat, initialLng], {
            radius: radius || 300,
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '6, 6',
        }).addTo(map);

        marker.on('dragend', () => {
            const position = marker.getLatLng();
            const roundedLat = parseFloat(position.lat.toFixed(6));
            const roundedLng = parseFloat(position.lng.toFixed(6));
            setCurrentCoords({ lat: roundedLat, lng: roundedLng });
            circle.setLatLng([roundedLat, roundedLng]);
            onLocationSelect(roundedLat, roundedLng);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
            const roundedLat = parseFloat(e.latlng.lat.toFixed(6));
            const roundedLng = parseFloat(e.latlng.lng.toFixed(6));
            marker.setLatLng([roundedLat, roundedLng]);
            circle.setLatLng([roundedLat, roundedLng]);
            setCurrentCoords({ lat: roundedLat, lng: roundedLng });
            onLocationSelect(roundedLat, roundedLng);
        });

        mapRef.current = map;
        markerRef.current = marker;
        circleRef.current = circle;

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Update marker & circle when props change
    useEffect(() => {
        if (!mapRef.current || !markerRef.current || !circleRef.current) return;
        if (lat && lng) {
            markerRef.current.setLatLng([lat, lng]);
            circleRef.current.setLatLng([lat, lng]);
            mapRef.current.panTo([lat, lng]);
            setCurrentCoords({ lat, lng });
        }
        if (radius) {
            circleRef.current.setRadius(radius);
        }
    }, [lat, lng, radius]);

    // Nominatim geocoding search for quick address lookup
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
            );
            const data = await response.json();
            if (data && data.length > 0) {
                const foundLat = parseFloat(parseFloat(data[0].lat).toFixed(6));
                const foundLng = parseFloat(parseFloat(data[0].lon).toFixed(6));
                setCurrentCoords({ lat: foundLat, lng: foundLng });
                if (mapRef.current && markerRef.current && circleRef.current) {
                    mapRef.current.setView([foundLat, foundLng], 15);
                    markerRef.current.setLatLng([foundLat, foundLng]);
                    circleRef.current.setLatLng([foundLat, foundLng]);
                }
                onLocationSelect(foundLat, foundLng);
            } else {
                alert('Location not found. Try entering a city or address.');
            }
        } catch {
            alert('Failed to search location.');
        } finally {
            setSearching(false);
        }
    };

    // Quick location presets for seamless demoing
    const applyPreset = (presetLat: number, presetLng: number) => {
        setCurrentCoords({ lat: presetLat, lng: presetLng });
        if (mapRef.current && markerRef.current && circleRef.current) {
            mapRef.current.setView([presetLat, presetLng], 15);
            markerRef.current.setLatLng([presetLat, presetLng]);
            circleRef.current.setLatLng([presetLat, presetLng]);
        }
        onLocationSelect(presetLat, presetLng);
    };

    return (
        <div className="map-picker-wrapper">
            <div className="map-picker-toolbar">
                <form onSubmit={handleSearch} className="map-search-form">
                    <input
                        type="text"
                        className="map-search-input"
                        placeholder="Search address or city (e.g. San Francisco, CA)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="btn-dark-sm" disabled={searching}>
                        {searching ? 'Searching...' : ' Search Map'}
                    </button>
                </form>

                <div className="map-presets">
                    <span className="preset-label">Quick Presets:</span>
                    <button
                        type="button"
                        className="preset-btn"
                        onClick={() => applyPreset(37.7749, -122.4194)}
                    >
                        SCS HQ (SF)
                    </button>
                    <button
                        type="button"
                        className="preset-btn"
                        onClick={() => applyPreset(37.7901, -122.3995)}
                    >
                        Metro Plaza
                    </button>
                    <button
                        type="button"
                        className="preset-btn"
                        onClick={() => applyPreset(37.5630, -122.3255)}
                    >
                        Hwy 101 Site
                    </button>
                    <button
                        type="button"
                        className="preset-btn"
                        onClick={() => applyPreset(37.5483, -121.9886)}
                    >
                        Solar Farm
                    </button>
                </div>
            </div>

            <div
                ref={mapContainerRef}
                className="map-container"
                style={{ height, width: '100%', borderRadius: '12px' }}
            />

            <div className="map-picker-footer">
                <div className="coord-badge">
                    Lat: <code>{currentCoords.lat}</code> | Lng: <code>{currentCoords.lng}</code>
                </div>
                <div className="radius-badge">
                    Geofence Radius: <strong>{radius}m</strong>
                </div>
                <p className="map-hint-text">Click map or drag marker to set exact geofence pin</p>
            </div>
        </div>
    );
}
