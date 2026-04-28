import { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import './App.css'

// Fix Leaflet marker icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper to fix map alignment on first load
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);
  return null;
}

// Routing Component
function Routing({ from, to, onRouteFound }: { from: [number, number], to: [number, number], onRouteFound: (d: string, t: string) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!from || !to) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(from[0], from[1]),
        L.latLng(to[0], to[1])
      ],
      routeWhileDragging: false,
      fitSelectedRoutes: true,
      show: false, // Hide the instruction panel
      lineOptions: {
        styles: [{ color: '#ff007a', opacity: 0.8, weight: 6 }],
        extendToWaypoints: true,
        missingRouteTolerance: 10
      }
    } as any).on('routesfound', (e: any) => {
      const routes = e.routes;
      const summary = routes[0].summary;
      const dist = (summary.totalDistance / 1000).toFixed(1);
      const time = Math.round(summary.totalTime / 60).toString();
      onRouteFound(dist, time);
    }).addTo(map);

    return () => { map.removeControl(routingControl); };
  }, [map, from, to]);

  return null;
}

function App() {
  const [phase, setPhase] = useState<'video' | 'accept' | 'details'>('video')
  const [activeVideo, setActiveVideo] = useState<1 | 2>(1)
  const [isUnmuted, setIsUnmuted] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [distance, setDistance] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const loopLock = useRef(false)
  
  const EVENT_LOCATION: [number, number] = [2.2052177, 102.3076838] 
  const EVENT_ADDRESS = "No. 7, Jalan PD 2/1, Taman Permatang Duyong 2, 75460 Melaka"
  
  const videoRef1 = useRef<HTMLVideoElement>(null)
  const videoRef2 = useRef<HTMLVideoElement>(null)
  const backdropRef1 = useRef<HTMLVideoElement>(null)
  const backdropRef2 = useRef<HTMLVideoElement>(null)

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (phase === 'video' && video.currentTime > video.duration - 2.0) {
      setPhase('accept');
    }
    if (!loopLock.current && video.currentTime > video.duration - 1.5) {
      loopLock.current = true;
      const nextVideo = activeVideo === 1 ? videoRef2 : videoRef1;
      const nextBackdrop = activeVideo === 1 ? backdropRef2 : backdropRef1;
      const currentVideo = activeVideo === 1 ? videoRef1 : videoRef2;
      
      if (nextVideo.current && nextBackdrop.current) {
        nextVideo.current.currentTime = 0;
        nextVideo.current.muted = !isUnmuted; 
        nextVideo.current.play().then(() => {
          setActiveVideo(activeVideo === 1 ? 2 : 1);
          if (currentVideo.current) currentVideo.current.muted = true;
          setTimeout(() => { loopLock.current = false; }, 2000);
        });
        nextBackdrop.current.currentTime = 0;
        nextBackdrop.current.muted = true; 
        nextBackdrop.current.play();
      }
    }
  }

  const handleAccept = () => {
    // 1. Bagitau user kita tengah request GPS
    console.log("Requesting GPS...");
    
    if ("geolocation" in navigator) {
      // 2. Terus minta GPS (Browser popup akan keluar kat sini)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          // 3. Dah dapat baru tukar phase ke peta
          setPhase('details');
        },
        (error) => {
          console.error("GPS Error:", error);
          setGpsError(error.message);
          // Tetap tukar phase ke peta supaya user tak stuck, tapi bagitau error
          setPhase('details');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setGpsError("Browser tak support GPS.");
      setPhase('details');
    }
  }

  useEffect(() => {
    // Optimization: Pause all videos when on the map phase to save GPU/Battery
    const allVideos = [videoRef1, videoRef2, backdropRef1, backdropRef2];
    if (phase === 'details') {
      allVideos.forEach(ref => {
        if (ref.current) ref.current.pause();
      });
    } else {
      allVideos.forEach(ref => {
        if (ref.current) ref.current.play().catch(() => {});
      });
    }
  }, [phase]);

  useEffect(() => {
    const handleInteraction = () => {
      setIsUnmuted(true);
      const activeRef = activeVideo === 1 ? videoRef1 : videoRef2;
      if (activeRef.current) activeRef.current.muted = false;
      [videoRef1, videoRef2, backdropRef1, backdropRef2].forEach(ref => {
        if (ref.current) ref.current.play().catch(() => {});
      });
    }
    window.addEventListener('click', handleInteraction, { once: true })
    window.addEventListener('touchstart', handleInteraction, { once: true })
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [activeVideo])

  return (
    <div className="app-container dark-mode" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* 1. Background Videos (Always Running) */}
      <div className="video-container">
        <video ref={backdropRef1} playsInline autoPlay muted preload="auto" className="video-backdrop" 
          style={{ 
            opacity: activeVideo === 1 ? 1 : 0, 
            transition: 'opacity 0.5s',
            willChange: 'opacity'
          }}>
          <source src="/video.mov" />
        </video>
        <video ref={backdropRef2} playsInline muted preload="auto" className="video-backdrop" 
          style={{ 
            opacity: activeVideo === 2 ? 1 : 0, 
            transition: 'opacity 0.5s', 
            position: 'absolute', top: 0, left: 0,
            willChange: 'opacity'
          }}>
          <source src="/video.mov" />
        </video>
      </div>

      {/* 2. Main Player Area / Full Screen Map Area */}
      {phase !== 'details' ? (
        <div className="player-card">
          <video 
            ref={videoRef1} playsInline autoPlay muted 
            onTimeUpdate={activeVideo === 1 ? handleTimeUpdate : undefined}
            className={`main-video ${phase === 'accept' ? 'blurred' : ''}`}
            style={{ 
              opacity: activeVideo === 1 ? 1 : 0, 
              transition: 'opacity 0.5s', 
              zIndex: activeVideo === 1 ? 2 : 1,
              willChange: 'opacity, filter'
            }}
          >
            <source src="/video.mov" />
          </video>
          <video 
            ref={videoRef2} playsInline muted 
            onTimeUpdate={activeVideo === 2 ? handleTimeUpdate : undefined}
            className={`main-video ${phase === 'accept' ? 'blurred' : ''}`}
            style={{ 
              opacity: activeVideo === 2 ? 1 : 0, 
              transition: 'opacity 0.5s', 
              position: 'absolute', top: 0, left: 0, 
              zIndex: activeVideo === 2 ? 2 : 1,
              willChange: 'opacity, filter'
            }}
          >
            <source src="/video.mov" />
          </video>

          {/* Choice Card Overlay */}
          {phase === 'accept' && (
            <div className="action-section">
              <div className="glass-card animate-pulse" style={{ 
                pointerEvents: 'all', width: '75%', maxWidth: '280px', padding: '2.5rem 1.5rem',
                borderRadius: '24px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 0, 122, 0.2)', margin: 'auto'
              }}>
                <h2 className="section-title" style={{ fontSize: '1.2rem', margin: '0 0 0.8rem', width: '100%', color: '#fff', textShadow: '0 0 15px rgba(255, 0, 122, 0.5)' }}>THE CHOICE IS YOURS</h2>
                <p className="brutal-text" style={{ marginBottom: '1.5rem', fontSize: '0.8rem', color: '#fff', textShadow: '0 0 10px rgba(255, 0, 122, 0.5)', width: '100%', lineHeight: '1.5', letterSpacing: '0.5px' }}>Presence is requested. Absence is not an option.</p>
                <button onClick={handleAccept} className="premium-btn" style={{ width: '100%', padding: '0.8rem' }}>I WILL BE THERE</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* FULL SCREEN MAP - CONSTRAINED TO MOBILE CONTAINER */
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100 }}>
          <MapContainer center={EVENT_LOCATION} zoom={18} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <MapResizer />
            {userLocation && (
              <Routing 
                from={userLocation} 
                to={EVENT_LOCATION} 
                onRouteFound={(d, t) => { setDistance(d); setTime(t); }} 
              />
            )}
            {/* Satellite Base Layer */}
            <TileLayer 
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
              attribution='&copy; Esri'
            />
            {/* Road Labels Layer */}
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" 
            />
            <Marker position={EVENT_LOCATION}>
              <Popup maxWidth={200} minWidth={150}>
                <div style={{ fontSize: '0.7rem', textAlign: 'center' }}>{EVENT_ADDRESS}</div>
              </Popup>
            </Marker>
            {userLocation && <Marker position={userLocation}><Popup>You are here</Popup></Marker>}
          </MapContainer>
          
          {/* Floating Info Overlay - Centered Properly */}
          <div style={{ 
            position: 'absolute', 
            bottom: '40px', 
            left: '5%', 
            right: '5%', 
            zIndex: 1000, 
            maxWidth: '350px',
            margin: '0 auto' 
          }}>
            <div className="glass-card" style={{ 
              padding: '2rem 1.5rem', 
              width: '100%', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(25px)',
              borderRadius: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 0, 122, 0.2)',
              boxSizing: 'border-box',
              textAlign: 'center'
            }}>
              <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '2px', marginBottom: '0.5rem', textShadow: '0 0 10px rgba(255, 0, 122, 0.5)' }}>DESTINATION REACHED</div>
              <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '800', marginBottom: '1.2rem', lineHeight: '1.4', textShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}>{EVENT_ADDRESS}</div>
              
              {gpsError ? (
                <div style={{ background: 'rgba(255,0,0,0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,0,0,0.3)' }}>
                  <div style={{ color: '#ff4444', fontSize: '0.7rem', marginBottom: '0.5rem' }}>GPS ERROR: {gpsError}</div>
                  <button onClick={handleAccept} style={{ background: 'var(--primary)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.7rem', cursor: 'pointer' }}>RETRY GPS</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', marginBottom: '0.3rem' }}>DISTANCE</div>
                    <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '900' }}>{distance ? `${distance} KM` : '--'}</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', marginBottom: '0.3rem' }}>EST. TIME</div>
                    <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '900' }}>{time ? `${time} MIN` : '--'}</div>
                  </div>
                </div>
              )}

              {!showMapPicker ? (
                <button 
                  className="premium-btn" 
                  style={{ width: '100%', padding: '1rem', fontSize: '0.9rem', boxShadow: '0 10px 20px rgba(255, 0, 122, 0.4)' }}
                  onClick={() => setShowMapPicker(true)}
                >START NAVIGATION</button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
                  <button 
                    className="premium-btn" 
                    style={{ width: '100%', padding: '0.9rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${EVENT_LOCATION[0]},${EVENT_LOCATION[1]}`, '_blank')}
                  >GOOGLE MAPS</button>
                  <button 
                    className="premium-btn" 
                    style={{ width: '100%', padding: '0.9rem', fontSize: '0.85rem' }}
                    onClick={() => window.open(`https://waze.com/ul?ll=${EVENT_LOCATION[0]},${EVENT_LOCATION[1]}&navigate=yes`, '_blank')}
                  >WAZE NAVIGATION</button>
                  <button 
                    onClick={() => setShowMapPicker(false)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginTop: '5px', cursor: 'pointer' }}
                  >← BACK</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
