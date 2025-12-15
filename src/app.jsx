const { useState, useEffect, useRef } = React;

const BerkeleyPathsTracker = () => {
  // State management
  const [paths, setPaths] = useState([]);
  const [completedPaths, setCompletedPaths] = useState(new Set());
  const [pathNotes, setPathNotes] = useState({});
  const [selectedPath, setSelectedPath] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [userHeading, setUserHeading] = useState(null);
  const [nearbyPaths, setNearbyPaths] = useState([]);
  const [view, setView] = useState('map'); // 'list' or 'map'
  const [filterCompleted, setFilterCompleted] = useState('all'); // 'all', 'completed', 'incomplete'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);

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
      const savedNotes = localStorage.getItem('pathNotes');
      
      if (savedCompleted) {
        setCompletedPaths(new Set(JSON.parse(savedCompleted)));
      }
      if (savedNotes) {
        setPathNotes(JSON.parse(savedNotes));
      }
    } catch (err) {
      console.error('Error loading saved data:', err);
    }
  }, []);

  // Save completed paths to localStorage
  useEffect(() => {
    localStorage.setItem('completedPaths', JSON.stringify([...completedPaths]));
  }, [completedPaths]);

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem('pathNotes', JSON.stringify(pathNotes));
  }, [pathNotes]);

  // Get user's location and track orientation
  useEffect(() => {
    if (navigator.geolocation) {
      // Watch position continuously for updates
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          
          // Some devices provide heading from GPS
          if (position.coords.heading !== null && position.coords.heading !== undefined) {
            setUserHeading(position.coords.heading);
          }
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );

      // Also try to get device orientation (compass heading)
      const handleOrientation = (event) => {
        if (event.webkitCompassHeading !== undefined) {
          // iOS
          setUserHeading(event.webkitCompassHeading);
        } else if (event.alpha !== null) {
          // Android - alpha is 0-360 degrees
          // Convert to compass heading (0 = North)
          const heading = 360 - event.alpha;
          setUserHeading(heading);
        }
      };

      // Request permission for iOS 13+
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(console.error);
      } else {
        // Non-iOS devices
        window.addEventListener('deviceorientation', handleOrientation);
      }

      return () => {
        navigator.geolocation.clearWatch(watchId);
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }
  }, []);

  // Calculate nearby paths when location changes
  useEffect(() => {
    if (userLocation && paths.length > 0) {
      const nearby = paths.filter(path => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          path.start[0],
          path.start[1]
        );
        return distance <= 0.5; // Within 0.5 miles
      });
      setNearbyPaths(nearby);
    }
  }, [userLocation, paths]);

  // Initialize map
  useEffect(() => {
    if (view === 'map' && mapRef.current && !mapInstanceRef.current && paths.length > 0 && typeof L !== 'undefined') {
      // Create map centered on user location if available, otherwise Berkeley
      const center = userLocation ? [userLocation.lat, userLocation.lng] : [37.8715, -122.2730];
      const zoom = userLocation ? 17 : 13;
      const map = L.map(mapRef.current).setView(center, zoom);
      
      // Add tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add user location marker if available
      if (userLocation) {
        const rotation = userHeading !== null ? userHeading : 0;
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="width: 60px; height: 60px; position: relative;">
              ${userHeading !== null ? `
                <!-- Directional beam (cone of vision) -->
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(${rotation}deg);
                  width: 0;
                  height: 0;
                  border-left: 30px solid transparent;
                  border-right: 30px solid transparent;
                  border-bottom: 50px solid rgba(59, 130, 246, 0.25);
                  transform-origin: 50% 100%;
                "></div>
              ` : ''}
              <!-- Center dot with pulse ring -->
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(59, 130, 246, 0.2);
                border-radius: 50%;
                width: 28px;
                height: 28px;
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #3B82F6;
                border: 3px solid white;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                box-shadow: 0 0 0 rgba(59, 130, 246, 0.4);
                animation: pulse 2s infinite;
              "></div>
            </div>
          `,
          iconSize: [60, 60],
          iconAnchor: [30, 30]
        });
        
        const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup('Your Location');
        
        userMarkerRef.current = marker;
      }

      // Add path markers
      paths.forEach(path => {
        addPathMarker(map, path);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
      }
    };
  }, [view, paths, userLocation]);

  // Update path lines when completed status changes
  useEffect(() => {
    if (mapInstanceRef.current && typeof L !== 'undefined') {
      paths.forEach(path => {
        if (markersRef.current[path.id]) {
          const { line } = markersRef.current[path.id];
          const isCompleted = completedPaths.has(path.id);
          
          // Update line color: burgundy for completed, gold for incomplete
          const color = isCompleted ? '#941B1E' : '#EAA636';
          line.setStyle({ color: color });
          
          // Update popup content
          line.setPopupContent(`
            <div style="min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #941B1E;">${path.name}</h3>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${path.location}</p>
              ${isCompleted ? '<p style="margin: 0; font-size: 12px; color: #941B1E; font-weight: 600;">✓ Completed</p>' : '<p style="margin: 0; font-size: 12px; color: #EAA636; font-weight: 600;">Not completed</p>'}
            </div>
          `);
        }
      });
    }
  }, [completedPaths, paths]);

  // Update user location marker when position or heading changes
  useEffect(() => {
    if (userMarkerRef.current && userLocation && typeof L !== 'undefined') {
      const rotation = userHeading !== null ? userHeading : 0;
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="width: 60px; height: 60px; position: relative;">
            ${userHeading !== null ? `
              <!-- Directional beam (cone of vision) -->
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(${rotation}deg);
                width: 0;
                height: 0;
                border-left: 30px solid transparent;
                border-right: 30px solid transparent;
                border-bottom: 50px solid rgba(59, 130, 246, 0.25);
                transform-origin: 50% 100%;
              "></div>
            ` : ''}
            <!-- Center dot with pulse ring -->
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(59, 130, 246, 0.2);
              border-radius: 50%;
              width: 28px;
              height: 28px;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: #3B82F6;
              border: 3px solid white;
              border-radius: 50%;
              width: 16px;
              height: 16px;
              box-shadow: 0 0 0 rgba(59, 130, 246, 0.4);
            "></div>
          </div>
        `,
        iconSize: [60, 60],
        iconAnchor: [30, 30]
      });
      
      // Update marker position and icon
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      userMarkerRef.current.setIcon(userIcon);
    }
  }, [userLocation, userHeading]);

  // Add path line to map (no markers, just lines)
  const addPathMarker = (map, path) => {
    const isCompleted = completedPaths.has(path.id);
    
    // Use Berkeley colors: burgundy (#941B1E) for completed, gold (#EAA636) for incomplete
    const color = isCompleted ? '#941B1E' : '#EAA636';

    // Draw visible line between start and end
    const line = L.polyline([path.start, path.end], {
      color: color,
      weight: 4,
      opacity: 0.8,
      className: `path-line-${path.id}`
    }).addTo(map);

    // Add popup to the line
    line.bindPopup(`
      <div style="min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #941B1E;">${path.name}</h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${path.location}</p>
        ${isCompleted ? '<p style="margin: 0; font-size: 12px; color: #941B1E; font-weight: 600;">✓ Completed</p>' : '<p style="margin: 0; font-size: 12px; color: #EAA636; font-weight: 600;">Not completed</p>'}
      </div>
    `);

    // Create invisible clickable area around the line (wider hit area)
    const invisibleLine = L.polyline([path.start, path.end], {
      color: 'transparent',
      weight: 20, // Much wider for easier clicking
      opacity: 0,
      className: `path-line-invisible-${path.id}`
    }).addTo(map);

    // Add click handler to invisible line
    invisibleLine.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      setSelectedPath(path);
      setView('list');
    });

    // Also make the visible line clickable
    line.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      setSelectedPath(path);
      setView('list');
    });

    // Store both lines for updates
    markersRef.current[path.id] = { line, invisibleLine };
  };

  // Calculate distance between two points in miles
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
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
      }
      return newSet;
    });
  };

  // Update path notes
  const updatePathNotes = (pathId, notes) => {
    setPathNotes(prev => ({
      ...prev,
      [pathId]: notes
    }));
  };

  // Filter paths based on criteria
  const getFilteredPaths = () => {
    let filtered = paths;

    // Filter by completion status
    if (filterCompleted === 'completed') {
      filtered = filtered.filter(path => completedPaths.has(path.id));
    } else if (filterCompleted === 'incomplete') {
      filtered = filtered.filter(path => !completedPaths.has(path.id));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(path =>
        path.name.toLowerCase().includes(query) ||
        path.location.toLowerCase().includes(query)
      );
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
    setView('map');
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([path.start[0], path.start[1]], 16);
        if (markersRef.current[path.id]) {
          markersRef.current[path.id].openPopup();
        }
      }
    }, 100);
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
      {/* Header */}
      <header className="bg-berkeley-burgundy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Berkeley Paths Tracker</h1>
              <p className="text-berkeley-gold text-sm mt-1">
                {completedPaths.size} of {paths.length} paths completed ({completionPercentage}%)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'list'
                    ? 'bg-white text-berkeley-burgundy'
                    : 'bg-berkeley-burgundy-dark text-white hover:bg-opacity-80'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'map'
                    ? 'bg-white text-berkeley-burgundy'
                    : 'bg-berkeley-burgundy-dark text-white hover:bg-opacity-80'
                }`}
              >
                Map
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 bg-white bg-opacity-20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-berkeley-gold h-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'list' ? (
          <>
            {/* Search and filters */}
            <div className="mb-6 space-y-4">
              <input
                type="text"
                placeholder="Search paths by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-berkeley-burgundy focus:border-transparent"
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
            </div>

            {/* Nearby paths section */}
            {nearbyPaths.length > 0 && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">
                  📍 Nearby Paths ({nearbyPaths.length})
                </h2>
                <p className="text-sm text-blue-700 mb-3">
                  Paths within 0.5 miles of your location
                </p>
                <div className="space-y-2">
                  {nearbyPaths.slice(0, 3).map(path => (
                    <button
                      key={path.id}
                      onClick={() => setSelectedPath(path)}
                      className="block w-full text-left px-3 py-2 bg-white rounded hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-blue-900">{path.name}</div>
                      <div className="text-sm text-gray-600">{path.location}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected path detail */}
            {selectedPath && (
              <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedPath.name}
                    </h2>
                    <p className="text-gray-600">{selectedPath.location}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPath(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => togglePathCompletion(selectedPath.id)}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={pathNotes[selectedPath.id] || ''}
                      onChange={(e) => updatePathNotes(selectedPath.id, e.target.value)}
                      placeholder="Add notes about difficulty, highlights, memorable moments..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-berkeley-burgundy focus:border-transparent"
                      rows={4}
                    />
                  </div>
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
                filteredPaths.map(path => (
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
                        {pathNotes[path.id] && (
                          <p className="text-gray-500 text-sm mt-2 italic">
                            📝 {pathNotes[path.id].slice(0, 100)}
                            {pathNotes[path.id].length > 100 ? '...' : ''}
                          </p>
                        )}
                      </div>
                      <div className="text-gray-400 text-sm ml-4">
                        #{path.id}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Map view */
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="relative">
              <div
                ref={mapRef}
                className="w-full"
                style={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}
              ></div>
              
              {/* Re-center button */}
              {userLocation && (
                <button
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17);
                    }
                  }}
                  className="absolute bottom-4 right-4 bg-white text-berkeley-burgundy px-4 py-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                  title="Center on my location"
                >
                  📍 My Location
                </button>
              )}
            </div>
            <div className="p-4 bg-gray-50 text-sm text-gray-600">
              <p>
                <span className="font-medium">Legend:</span>{' '}
                <span className="inline-block w-3 h-3 rounded-full bg-berkeley-gold mr-1"></span> Incomplete{' '}
                <span className="inline-block w-3 h-3 rounded-full bg-berkeley-burgundy ml-3 mr-1"></span> Completed
                {userLocation && <span className="ml-3">🔵 Your location {userHeading !== null ? '(with direction beam)' : ''}</span>}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 text-sm">
          <p>
            Data sourced from{' '}
            <a
              href="https://www.berkeleypath.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-berkeley-burgundy hover:underline"
            >
              berkeleypath.org
            </a>
          </p>
          <p className="mt-2">
            Berkeley Paths Tracker v1.0.0 | Made with ❤️ for Berkeley path explorers
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
