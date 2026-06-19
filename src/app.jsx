const { useState, useEffect, useRef } = React;

// Brand colors — keep in sync with Tailwind config in index.html
const COLORS = {
  burgundy: '#941B1E',
  burgundyDark: '#6B1214',
  gold: '#EAA636',
};

const BerkeleyPathsTracker = () => {
  // State management
  const [paths, setPaths] = useState([]);
  const [completedPaths, setCompletedPaths] = useState(new Set());
  const [selectedPath, setSelectedPath] = useState(null);
  const [showPathDialog, setShowPathDialog] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [nearbyPaths, setNearbyPaths] = useState([]);
  const [view, setView] = useState('map'); // 'list' or 'map'
  const [filterCompleted, setFilterCompleted] = useState('all'); // 'all', 'completed', 'incomplete'
  const [sortBy, setSortBy] = useState('alphabetical'); // 'alphabetical' or 'distance'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heading, setHeading] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [compassEnabled, setCompassEnabled] = useState(false);

  const mapRef = useRef(null);

  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const headingRef = useRef(null);
  const pendingMapFocusRef = useRef(null); // path to center on when map opens

  const inspectMode = new URLSearchParams(window.location.search).has('inspect');
  const [inspectIndex, setInspectIndex] = useState(0);
  const isInstalled = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const [showInstallPrompt, setShowInstallPrompt] = useState(() => {
    if (isInstalled) return false;
    return !localStorage.getItem('installPromptDismissed');
  });
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [milestone, setMilestone] = useState(null);

  const MILESTONES = [
    { pct: 25, emoji: '🌟', title: 'Quarter of the way there!', message: "You've completed 25% of Berkeley's paths. Keep exploring!" },
    { pct: 50, emoji: '🏅', title: 'Halfway there!', message: "50% done — you're a true Berkeley path explorer." },
    { pct: 75, emoji: '🔥', title: 'Three quarters done!', message: "75% complete. The finish line is in sight!" },
    { pct: 100, emoji: '🏆', title: 'All paths completed!', message: "You've walked every developed path in Berkeley. Incredible!" },
  ];

  // Listen for service worker update signal from index.html
  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener('swUpdateAvailable', handler);
    return () => window.removeEventListener('swUpdateAvailable', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Enable compass heading via DeviceOrientationEvent
  const enableCompass = async () => {
    console.log('[Compass] enableCompass called');
    console.log('[Compass] DeviceOrientationEvent available:', typeof DeviceOrientationEvent);
    console.log('[Compass] requestPermission available:', typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission);

    if (typeof DeviceOrientationEvent === 'undefined') {
      console.log('[Compass] DeviceOrientationEvent not available on this device');
      return;
    }

    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        console.log('[Compass] Requesting permission...');
        const permission = await DeviceOrientationEvent.requestPermission();
        console.log('[Compass] Permission result:', permission);
        if (permission !== 'granted') return;
      } catch (err) {
        console.error('[Compass] Permission error:', err);
        return;
      }
    } else {
      console.log('[Compass] No requestPermission needed (non-iOS or older iOS)');
    }

    const handler = (e) => {
      console.log('[Compass] Event - alpha:', e.alpha, 'webkitCompassHeading:', e.webkitCompassHeading, 'webkitCompassAccuracy:', e.webkitCompassAccuracy);
      // webkitCompassHeading is iOS (0=North, clockwise) — use directly
      // alpha is standard (0=North, counter-clockwise) — convert to clockwise
      let h = null;
      if (e.webkitCompassHeading != null) {
        h = e.webkitCompassHeading;
      } else if (e.alpha != null) {
        h = (360 - e.alpha) % 360;
      }
      console.log('[Compass] Computed heading:', h);
      if (h !== null) {
        headingRef.current = h;
        setHeading(h);
      }
    };

    window.addEventListener('deviceorientation', handler, true);
    setCompassEnabled(true);
    console.log('[Compass] Listener attached');
  };

  // Fix for default marker icons in Leaflet
  useEffect(() => {
    if (typeof L !== 'undefined') {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }
  }, []);

  // Load paths data
  useEffect(() => {
    const loadPaths = async () => {
      try {
        const response = await fetch('./data/paths-data.json');
        if (!response.ok) {
          throw new Error('Failed to load paths data');
        }
        const data = await response.json();
        setPaths(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    loadPaths();
  }, []);

  // Load saved data from localStorage
  useEffect(() => {
    try {
      const savedCompleted = localStorage.getItem('completedPaths');
      
      if (savedCompleted) {
        setCompletedPaths(new Set(JSON.parse(savedCompleted)));
      }
    } catch (err) {
      console.error('Error loading saved data:', err);
    }
  }, []);

  // Save completed paths to localStorage
  useEffect(() => {
    localStorage.setItem('completedPaths', JSON.stringify([...completedPaths]));
  }, [completedPaths]);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      // Watch position continuously for updates
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          // Use GPS heading as fallback when compass is not active
          if (!compassEnabled && position.coords.heading != null && !isNaN(position.coords.heading)) {
            headingRef.current = position.coords.heading;
            setHeading(position.coords.heading);
          }
          setLocationError(null);
        },
        (error) => {
          let errorMessage = 'Unable to get your location. ';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'An unknown error occurred.';
          }
          
          setLocationError(errorMessage);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  }, []);

  // Calculate nearby paths when location or filter changes
  useEffect(() => {
    if (userLocation && paths.length > 0) {
      let candidates = paths;
      if (filterCompleted === 'completed') {
        candidates = paths.filter(p => completedPaths.has(p.id));
      } else if (filterCompleted === 'incomplete') {
        candidates = paths.filter(p => !completedPaths.has(p.id));
      }
      const sorted = [...candidates].sort((a, b) => {
        const da = calculateDistance(userLocation.lat, userLocation.lng, a.start[0], a.start[1]);
        const db = calculateDistance(userLocation.lat, userLocation.lng, b.start[0], b.start[1]);
        return da - db;
      });
      setNearbyPaths(sorted.slice(0, 3));
    }
  }, [userLocation, paths, filterCompleted, completedPaths]);

  // Clean up map when switching views
  useEffect(() => {
    // Whenever view changes, clean up the existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
      userMarkerRef.current = null;
    }
  }, [view]);

  // Initialize map
  useEffect(() => {
    if (view === 'map' && mapRef.current && !mapInstanceRef.current && paths.length > 0 && typeof L !== 'undefined') {
      setTimeout(() => {
        const map = L.map(mapRef.current).setView([37.8715, -122.2730], 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;

        paths.forEach(path => {
          addPathMarker(map, path);
        });

        // Add user location marker if available
        if (userLocation) {
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: buildUserMarkerHtml(headingRef.current),
            iconSize: [48, 48],
            iconAnchor: [24, 24]
          });

          userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
            .addTo(map)
            .bindPopup('Your Location');
        }

        // Center on a specific path if requested, otherwise center on user location
        if (pendingMapFocusRef.current) {
          const focusPath = pendingMapFocusRef.current;
          pendingMapFocusRef.current = null;
          const coords = focusPath.segments ? focusPath.segments.flat() : (focusPath.coordinates || [focusPath.start, focusPath.end]);
          const lats = coords.map(c => c[0]);
          const lngs = coords.map(c => c[1]);
          const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
          map.setView([midLat, midLng], 17);

          // Briefly highlight the path
          setTimeout(() => {
            if (markersRef.current[focusPath.id]) {
              const { line } = markersRef.current[focusPath.id];
              const isCompleted = completedPaths.has(focusPath.id);
              const baseColor = isCompleted ? COLORS.burgundy : COLORS.gold;
              line.setStyle({ weight: 8, opacity: 1, color: baseColor });
              setTimeout(() => line.setStyle({ weight: 4, opacity: 0.8, color: baseColor }), 2000);
            }
          }, 50);
        } else if (inspectMode && paths.length > 0) {
          const p = paths[inspectIndex];
          const coords = p.segments ? p.segments.flat() : (p.coordinates || [p.start, p.end]);
          const lats = coords.map(c => c[0]);
          const lngs = coords.map(c => c[1]);
          map.setView([(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2], 17);
        } else if (userLocation) {
          map.setView([userLocation.lat, userLocation.lng], 17);
        }
      }, 100);
    }
  }, [view, paths, userLocation]);

  // Add/update user location marker
  useEffect(() => {
    if (mapInstanceRef.current && userLocation && typeof L !== 'undefined') {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: buildUserMarkerHtml(headingRef.current),
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      if (!userMarkerRef.current) {
        const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('Your Location');

        userMarkerRef.current = marker;

        // Center map on user location at zoom 17 when first location is obtained (only for map view)
        if (view === 'map') {
          mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17);
        }
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        userMarkerRef.current.setIcon(userIcon);
      }
    }
  }, [userLocation, heading, view, mapInstanceRef.current]);

  // Update path lines when completed status changes
  useEffect(() => {
    if (mapInstanceRef.current && typeof L !== 'undefined' && view === 'map') {
      paths.forEach(path => {
        if (markersRef.current[path.id]) {
          const { line } = markersRef.current[path.id];
          const isCompleted = completedPaths.has(path.id);
          
          const color = isCompleted ? COLORS.burgundy : COLORS.gold;
          line.setStyle({ color: color });

          line.setPopupContent(`
            <div style="min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: 600; color: ${COLORS.burgundy};">${path.name}</h3>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${path.location}</p>
              ${isCompleted ? `<p style="margin: 0; font-size: 12px; color: ${COLORS.burgundy}; font-weight: 600;">✓ Completed</p>` : `<p style="margin: 0; font-size: 12px; color: ${COLORS.gold}; font-weight: 600;">Not completed</p>`}
            </div>
          `);
        }
      });
    }
  }, [completedPaths, paths, view]);

  // Build user location marker HTML
  const buildUserMarkerHtml = (h) => {
    const hasHeading = h !== null && h !== undefined;
    // The wedge wrapper is centered on the dot and rotated as a whole unit.
    // The wedge itself points upward (toward North at 0deg), and the wrapper
    // rotates to match the heading. This avoids transform ordering issues with
    // CSS border-triangles.
    return `
      <div style="width: 48px; height: 48px; position: relative;">
        ${hasHeading ? `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 48px;
          height: 48px;
          transform: translate(-50%, -50%) rotate(${h}deg);
          transform-origin: 50% 50%;
        ">
          <div style="
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-bottom: 16px solid rgba(66, 133, 244, 0.9);
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));
          "></div>
        </div>` : ''}
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(66, 133, 244, 0.15);
          border: 1px solid rgba(66, 133, 244, 0.3);
          border-radius: 50%;
          width: 36px;
          height: 36px;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #4285F4;
          border: 2px solid white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      </div>
    `;
  };

  // Add path line to map
  const addPathMarker = (map, path) => {
    const isCompleted = completedPaths.has(path.id);
    const color = isCompleted ? COLORS.burgundy : COLORS.gold;
    const segments = path.segments || [path.coordinates || [path.start, path.end]];

    const line = L.featureGroup();
    segments.forEach(coords => L.polyline(coords, { color, weight: 4, opacity: 0.8 }).addTo(line));
    line.addTo(map);

    line.bindPopup(`
      <div style="min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-weight: 600; color: ${COLORS.burgundy};">${path.name}</h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${path.location}</p>
        ${isCompleted ? `<p style="margin: 0; font-size: 12px; color: ${COLORS.burgundy}; font-weight: 600;">✓ Completed</p>` : `<p style="margin: 0; font-size: 12px; color: ${COLORS.gold}; font-weight: 600;">Not completed</p>`}
      </div>
    `);

    const invisibleLine = L.featureGroup();
    segments.forEach(coords => L.polyline(coords, { color: 'transparent', weight: 20, opacity: 0 }).addTo(invisibleLine));
    invisibleLine.addTo(map);

    invisibleLine.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      setSelectedPath(path);
      setShowPathDialog(true);
    });

    line.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      setSelectedPath(path);
      setShowPathDialog(true);
    });

    markersRef.current[path.id] = { line, invisibleLine };
  };

  // Calculate distance between two points in miles
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Toggle path completion
  const togglePathCompletion = (pathId) => {
    setCompletedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pathId)) {
        newSet.delete(pathId);
      } else {
        newSet.add(pathId);
        const pct = Math.round((newSet.size / paths.length) * 100);
        const hit = MILESTONES.find(m => {
          if (pct < m.pct) return false;
          const prevPct = Math.round(((newSet.size - 1) / paths.length) * 100);
          return prevPct < m.pct;
        });
        if (hit) {
          const seenKey = `milestone_${hit.pct}`;
          if (!localStorage.getItem(seenKey)) {
            localStorage.setItem(seenKey, 'true');
            setTimeout(() => setMilestone(hit), 300);
          }
        }
      }
      return newSet;
    });
  };

  const focusMapOnPath = (path) => {
    const map = mapInstanceRef.current;
    if (!map || !path) return;
    const coords = path.segments ? path.segments.flat() : (path.coordinates || [path.start, path.end]);
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    map.setView([midLat, midLng], 17);
    if (markersRef.current[path.id]) {
      const { line } = markersRef.current[path.id];
      const baseColor = completedPaths.has(path.id) ? COLORS.burgundy : COLORS.gold;
      line.setStyle({ weight: 8, opacity: 1, color: baseColor });
      setTimeout(() => line.setStyle({ weight: 4, opacity: 0.8, color: baseColor }), 1500);
    }
  };

  // Inspect mode: focus map whenever inspectIndex changes
  useEffect(() => {
    if (inspectMode && paths.length > 0 && mapInstanceRef.current) {
      focusMapOnPath(paths[inspectIndex]);
    }
  }, [inspectIndex, inspectMode, paths, mapInstanceRef.current]);

  // Filter and sort paths
  const getFilteredPaths = () => {
    let filtered = paths;

    if (filterCompleted === 'completed') {
      filtered = filtered.filter(path => completedPaths.has(path.id));
    } else if (filterCompleted === 'incomplete') {
      filtered = filtered.filter(path => !completedPaths.has(path.id));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(path =>
        path.name.toLowerCase().includes(query) ||
        path.location.toLowerCase().includes(query)
      );
    }

    if (sortBy === 'alphabetical') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'distance' && userLocation) {
      filtered = [...filtered].sort((a, b) => {
        const distA = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          a.start[0],
          a.start[1]
        );
        const distB = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          b.start[0],
          b.start[1]
        );
        return distA - distB;
      });
    }

    return filtered;
  };

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    if (paths.length === 0) return 0;
    return Math.round((completedPaths.size / paths.length) * 100);
  };

  // Show path on map
  const showPathOnMap = (path) => {
    pendingMapFocusRef.current = path;
    setView('map');
    setShowPathDialog(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-berkeley-burgundy mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Berkeley Paths...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Error: {error}</p>
          <p className="text-gray-600 mt-2">Please make sure paths-data.json is available</p>
        </div>
      </div>
    );
  }

  const filteredPaths = getFilteredPaths();
  const completionPercentage = getCompletionPercentage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Install prompt modal */}
      {showInstallPrompt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{background: 'rgba(0,0,0,0.5)'}}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-berkeley-burgundy mb-2">Install Berkeley Paths Navigator</h2>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">Add this app to your home screen for the best experience:</p>
            <ul className="text-sm text-gray-700 space-y-2 mb-6">
              <li className="flex gap-2"><span>📍</span><span><strong>Your progress is saved</strong> on your device — no account needed</span></li>
              <li className="flex gap-2"><span>📶</span><span><strong>Works offline</strong> — no cell service needed on the trail</span></li>
              <li className="flex gap-2"><span>⚡</span><span><strong>Opens instantly</strong> from your home screen</span></li>
            </ul>
            {isIOS ? (
              <a
                href="install.html"
                className="block w-full text-center bg-berkeley-burgundy text-white font-semibold py-2.5 rounded-xl mb-3 text-sm"
              >
                Show me how
              </a>
            ) : deferredInstallPrompt ? (
              <button
                onClick={async () => {
                  deferredInstallPrompt.prompt();
                  const { outcome } = await deferredInstallPrompt.userChoice;
                  if (outcome === 'accepted') {
                    localStorage.setItem('installPromptDismissed', 'true');
                    setShowInstallPrompt(false);
                  }
                  setDeferredInstallPrompt(null);
                }}
                className="block w-full text-center bg-berkeley-burgundy text-white font-semibold py-2.5 rounded-xl mb-3 text-sm"
              >
                Install app
              </button>
            ) : (
              <a
                href="install.html"
                className="block w-full text-center bg-berkeley-burgundy text-white font-semibold py-2.5 rounded-xl mb-3 text-sm"
              >
                Show me how
              </a>
            )}
            <button
              onClick={() => {
                localStorage.setItem('installPromptDismissed', 'true');
                setShowInstallPrompt(false);
              }}
              className="block w-full text-center text-gray-400 text-sm py-1"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Milestone modal */}
      {milestone && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{background: 'rgba(0,0,0,0.5)'}}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div style={{fontSize: '4rem', lineHeight: 1, marginBottom: '12px'}}>{milestone.emoji}</div>
            <h2 className="text-xl font-bold text-berkeley-burgundy mb-2">{milestone.title}</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">{milestone.message}</p>
            <button
              onClick={() => setMilestone(null)}
              className="bg-berkeley-burgundy text-white font-semibold py-2.5 px-16 rounded-xl text-sm"
            >
              Keep going!
            </button>
          </div>
        </div>
      )}

      {/* Update banner */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-berkeley-gold text-white text-sm font-medium flex items-center justify-between px-4 py-2.5 shadow-lg">
          <span>A new version is available</span>
          <button
            onClick={() => {
              // Clear all caches and unregister SW, then reload fresh from network
              const cleanup = caches.keys().then(keys =>
                Promise.all(keys.map(k => caches.delete(k)))
              );
              const unreg = navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) return reg.unregister();
              });
              Promise.all([cleanup, unreg]).then(() => window.location.reload());
            }}
            className="ml-4 bg-white text-berkeley-burgundy px-3 py-1 rounded font-semibold text-xs"
          >
            Update now
          </button>
        </div>
      )}
      {/* Header */}
      <header className="bg-berkeley-burgundy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 py-2">
          {/* Title - full width on one line */}
          <h1 className="text-lg font-bold mb-1.5">Berkeley Paths Navigator</h1>
          
          {/* Navigation and completion info - second line */}
          <div className="flex items-center justify-between gap-2">
            {/* Completion info */}
            <div className="text-berkeley-gold text-xs whitespace-nowrap">
              {completedPaths.size}/{paths.length} ({completionPercentage}%)
            </div>
            
            {/* Navigation buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => setView('list')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  view === 'list'
                    ? 'bg-white text-berkeley-burgundy'
                    : 'bg-berkeley-burgundy-dark text-white hover:bg-opacity-80'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  view === 'map'
                    ? 'bg-white text-berkeley-burgundy'
                    : 'bg-berkeley-burgundy-dark text-white hover:bg-opacity-80'
                }`}
              >
                Map
              </button>
            </div>
          </div>

          {/* Compact progress bar - only show on list view */}
          {view === 'list' && (
            <div className="mt-1.5 bg-white bg-opacity-20 rounded-full h-1 overflow-hidden">
              <div
                className="bg-berkeley-gold h-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className={view === 'list' ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6' : ''}>
        {/* Location Error Alert */}
        {locationError && view === 'list' && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {locationError}
                </p>
                {locationError.includes('denied') && (
                  <p className="text-xs text-yellow-600 mt-1">
                    On iOS: Settings → Safari → Location → Allow
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <>
            {/* Search and filters */}
            <div className="mb-6 space-y-4">
              <input
                type="text"
                placeholder="Search paths by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-berkeley-burgundy focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterCompleted('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterCompleted === 'all'
                      ? 'bg-berkeley-burgundy text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All ({paths.length})
                </button>
                <button
                  onClick={() => setFilterCompleted('completed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterCompleted === 'completed'
                      ? 'bg-berkeley-burgundy text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Completed ({completedPaths.size})
                </button>
                <button
                  onClick={() => setFilterCompleted('incomplete')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterCompleted === 'incomplete'
                      ? 'bg-berkeley-burgundy text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Incomplete ({paths.length - completedPaths.size})
                </button>
              </div>

              {/* Sort buttons */}
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <button
                  onClick={() => setSortBy('alphabetical')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    sortBy === 'alphabetical'
                      ? 'bg-berkeley-gold text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  A-Z
                </button>
                <button
                  onClick={() => setSortBy('distance')}
                  disabled={!userLocation}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    sortBy === 'distance'
                      ? 'bg-berkeley-gold text-white'
                      : userLocation
                      ? 'bg-white text-gray-700 hover:bg-gray-100'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  title={!userLocation ? 'Location required for distance sorting' : 'Sort by distance from your location'}
                >
                  📍 Nearest
                </button>
              </div>
            </div>

            {/* Nearby paths section */}
            {nearbyPaths.length > 0 && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">
                  📍 Nearby Paths
                </h2>
                <p className="text-sm text-blue-700 mb-3">
                  Closest paths to your current location
                </p>
                <div className="space-y-2">
                  {nearbyPaths.map(path => (
                    <button
                      key={path.id}
                      onClick={() => setSelectedPath(path)}
                      className="block w-full text-left px-3 py-2 bg-white rounded hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-900">{path.name}</span>
                        {completedPaths.has(path.id) && <span className="text-green-600">✓</span>}
                      </div>
                      <div className="text-sm text-gray-600">{path.location}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}


            {/* Paths list */}
            <div className="space-y-3">
              {filteredPaths.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No paths found matching your criteria
                </div>
              ) : (
                filteredPaths.map(path => {
                  const distance = userLocation ? calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    path.start[0],
                    path.start[1]
                  ) : null;

                  return (
                  <div
                    key={path.id}
                    onClick={() => setSelectedPath(path)}
                    className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4 ${
                      selectedPath?.id === path.id ? 'ring-2 ring-berkeley-burgundy' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {path.name}
                          </h3>
                          {completedPaths.has(path.id) && (
                            <span className="text-green-600 text-xl">✓</span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mt-1">{path.location}</p>
                        {sortBy === 'distance' && distance !== null && (
                          <p className="text-berkeley-gold text-sm font-medium mt-1">
                            📍 {distance < 0.1 ? '< 0.1' : distance.toFixed(1)} miles away
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Map View */}
        {view === 'map' && (
          <div className="fixed inset-0 top-[56px] flex flex-col bg-white">
            {/* Map - full screen */}
            <div className="flex-1 relative">
              <div
                ref={mapRef}
                className="absolute inset-0 w-full h-full"
              ></div>
              
              {/* Re-center button - floating on map */}
              {userLocation && (
                <button
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17);
                    }
                  }}
                  style={{ zIndex: 9999, position: 'absolute', bottom: '64px', right: '12px' }}
                  className="bg-white px-2.5 py-1.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors text-lg"
                  title="Center on my location"
                >
                  📍
                </button>
              )}

              {/* Inspect mode overlay */}
              {inspectMode && paths.length > 0 && (
                <div style={{ zIndex: 9999, position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)' }}
                  className="bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 border border-gray-200"
                >
                  <button
                    onClick={() => setInspectIndex(i => (i - 1 + paths.length) % paths.length)}
                    className="text-xl px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >‹</button>
                  <div className="text-center min-w-[160px]">
                    <div className="font-semibold text-gray-900 text-sm">{paths[inspectIndex].name}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{inspectIndex + 1} / {paths.length}</div>
                  </div>
                  <button
                    onClick={() => setInspectIndex(i => (i + 1) % paths.length)}
                    className="text-xl px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >›</button>
                </div>
              )}

              {/* Compass enable button - always visible until enabled */}
              {!compassEnabled && (
                <button
                  onClick={enableCompass}
                  style={{ zIndex: 9999, position: 'absolute', top: '12px', right: '12px' }}
                  className="bg-white px-2.5 py-1.5 rounded-lg shadow-lg hover:bg-gray-50 transition-colors text-lg"
                  title="Enable compass heading"
                >
                  🧭
                </button>
              )}
            </div>
            
            {/* Legend - compact at bottom */}
            <div className="flex-shrink-0 p-2 bg-gray-50 border-t text-xs text-gray-600">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-berkeley-gold"></span>
                  Incomplete
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-berkeley-burgundy"></span>
                  Completed
                </span>
                {userLocation && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    You
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky bottom sheet for List View selected path */}
      {selectedPath && view === 'list' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-berkeley-burgundy shadow-2xl z-50 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 truncate">{selectedPath.name}</h2>
                <p className="text-xs text-gray-500 truncate">{selectedPath.location}</p>
              </div>
              <button
                onClick={() => setSelectedPath(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl ml-3 flex-shrink-0"
              >
                ×
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => togglePathCompletion(selectedPath.id)}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  completedPaths.has(selectedPath.id)
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-berkeley-burgundy text-white hover:bg-berkeley-burgundy-dark'
                }`}
              >
                {completedPaths.has(selectedPath.id) ? '✓ Completed' : 'Mark as Complete'}
              </button>
              <button
                onClick={() => showPathOnMap(selectedPath)}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Show on Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Path Dialog for Map View */}
      {showPathDialog && selectedPath && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[9999]"
          onClick={() => setShowPathDialog(false)}
        >
          <div 
            className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg sm:mx-4 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedPath.name}
                  </h2>
                  <p className="text-gray-600">{selectedPath.location}</p>
                </div>
                <button
                  onClick={() => setShowPathDialog(false)}
                  className="text-gray-400 hover:text-gray-600 text-3xl leading-none ml-4"
                >
                  ×
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    togglePathCompletion(selectedPath.id);
                  }}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    completedPaths.has(selectedPath.id)
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-berkeley-burgundy text-white hover:bg-berkeley-burgundy-dark'
                  }`}
                >
                  {completedPaths.has(selectedPath.id) ? '✓ Completed' : 'Mark as Complete'}
                </button>
                <button
                  onClick={() => showPathOnMap(selectedPath)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Show on Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 text-sm">
          <p>
            Berkeley Paths Navigator is not affiliated with{' '}
            <a
              href="https://www.berkeleypaths.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-berkeley-burgundy hover:underline"
            >
              the Berkeley Path Wanderers Association
            </a>, but we encourage you to support their work preserving, restoring, and creating public paths in Berkeley
          </p>
          <p className="mt-2">
            Berkeley Paths Navigator v1.0.0 | Made with ❤️ for Berkeley path explorers
          </p>
        </div>
      </footer>
    </div>
  );
};

// Render the app
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<BerkeleyPathsTracker />);
}
