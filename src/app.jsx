const { useState, useEffect, useRef } = React;

const BerkeleyPathsTracker = () => {
  // State management
  const [paths, setPaths] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [completedPaths, setCompletedPaths] = useState(new Set());
  const [selectedPath, setSelectedPath] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showPathDialog, setShowPathDialog] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [nearbyPaths, setNearbyPaths] = useState([]);
  const [view, setView] = useState('map'); // 'list', 'map', or 'routes'
  const [filterCompleted, setFilterCompleted] = useState('all'); // 'all', 'completed', 'incomplete'
  const [sortBy, setSortBy] = useState('alphabetical'); // 'alphabetical' or 'distance'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

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

  // Load routes data
  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const response = await fetch('./data/routes-data.json');
        if (response.ok) {
          const data = await response.json();
          setRoutes(data);
        }
      } catch (err) {
        console.error('Routes data not available:', err);
      }
    };
    loadRoutes();
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
        return distance <= 0.5;
      });
      setNearbyPaths(nearby);
    }
  }, [userLocation, paths]);

  // Initialize map
  useEffect(() => {
    if (view === 'map' && mapRef.current && !mapInstanceRef.current && paths.length > 0 && typeof L !== 'undefined') {
      const map = L.map(mapRef.current).setView([37.8715, -122.2730], 13);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      paths.forEach(path => {
        addPathMarker(map, path);
      });
    }

    return () => {
      if (mapInstanceRef.current && view !== 'routes') {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
        userMarkerRef.current = null;
      }
    };
  }, [view, paths]);

  // Initialize routes map
  useEffect(() => {
    if (view === 'routes' && selectedRoute && mapRef.current && typeof L !== 'undefined') {
      setTimeout(() => {
        if (!mapInstanceRef.current) {
          const map = L.map(mapRef.current).setView([37.8870, -122.2600], 14);
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19
          }).addTo(map);

          mapInstanceRef.current = map;
        }

        // Remove existing route line
        if (routeLineRef.current) {
          routeLineRef.current.remove();
        }

        // Draw route
        routeLineRef.current = L.polyline(selectedRoute.route_coordinates, {
          color: '#8B4789',
          weight: 5,
          opacity: 0.85
        }).addTo(mapInstanceRef.current);

        // Add start marker
        L.marker(selectedRoute.route_coordinates[0], {
          icon: L.divIcon({
            className: 'start-marker',
            html: '<div style="background: #8B4789; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">S</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(mapInstanceRef.current).bindPopup(`<strong>Start</strong><br>${selectedRoute.start_location}`);

        // Fit map to route
        mapInstanceRef.current.fitBounds(routeLineRef.current.getBounds(), { padding: [50, 50] });

        // Add user location marker if available
        if (userLocation && !userMarkerRef.current) {
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div style="background: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup('Your Location');
        }
      }, 100);

      return () => {
        if (mapInstanceRef.current && view === 'routes') {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          routeLineRef.current = null;
          userMarkerRef.current = null;
        }
      };
    }
  }, [view, selectedRoute, userLocation]);

  // Add/update user location marker
  useEffect(() => {
    if (mapInstanceRef.current && userLocation && typeof L !== 'undefined') {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: view === 'routes' 
          ? '<div style="background: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>'
          : `
          <div style="width: 40px; height: 40px; position: relative;">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(66, 133, 244, 0.15);
              border: 1px solid rgba(66, 133, 244, 0.3);
              border-radius: 50%;
              width: 32px;
              height: 32px;
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
        `,
        iconSize: view === 'routes' ? [16, 16] : [40, 40],
        iconAnchor: view === 'routes' ? [8, 8] : [20, 20]
      });
      
      if (!userMarkerRef.current) {
        const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('Your Location');
        
        userMarkerRef.current = marker;
        
        if (view !== 'routes') {
          mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17);
        }
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        userMarkerRef.current.setIcon(userIcon);
      }
    }
  }, [userLocation, view]);

  // Update path lines when completed status changes
  useEffect(() => {
    if (mapInstanceRef.current && typeof L !== 'undefined' && view === 'map') {
      paths.forEach(path => {
        if (markersRef.current[path.id]) {
          const { line } = markersRef.current[path.id];
          const isCompleted = completedPaths.has(path.id);
          
          const color = isCompleted ? '#941B1E' : '#EAA636';
          line.setStyle({ color: color });
          
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
  }, [completedPaths, paths, view]);

  // Add path line to map
  const addPathMarker = (map, path) => {
    const isCompleted = completedPaths.has(path.id);
    const color = isCompleted ? '#941B1E' : '#EAA636';

    const line = L.polyline([path.start, path.end], {
      color: color,
      weight: 4,
      opacity: 0.8,
      className: `path-line-${path.id}`
    }).addTo(map);

    line.bindPopup(`
      <div style="min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #941B1E;">${path.name}</h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${path.location}</p>
        ${isCompleted ? '<p style="margin: 0; font-size: 12px; color: #941B1E; font-weight: 600;">✓ Completed</p>' : '<p style="margin: 0; font-size: 12px; color: #EAA636; font-weight: 600;">Not completed</p>'}
      </div>
    `);

    const invisibleLine = L.polyline([path.start, path.end], {
      color: 'transparent',
      weight: 20,
      opacity: 0,
      className: `path-line-invisible-${path.id}`
    }).addTo(map);

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
      }
      return newSet;
    });
  };

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
    setView('map');
    setShowPathDialog(false);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        const midLat = (path.start[0] + path.end[0]) / 2;
        const midLng = (path.start[1] + path.end[1]) / 2;
        
        mapInstanceRef.current.setView([midLat, midLng], 17);
        
        if (markersRef.current[path.id]) {
          const { line } = markersRef.current[path.id];
          const isCompleted = completedPaths.has(path.id);
          const baseColor = isCompleted ? '#941B1E' : '#EAA636';
          
          line.setStyle({ 
            weight: 8, 
            opacity: 1,
            color: baseColor
          });
          
          setTimeout(() => {
            line.setStyle({ 
              weight: 4, 
              opacity: 0.8,
              color: baseColor
            });
          }, 2000);
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
                onClick={() => {
                  setView('list');
                  setSelectedRoute(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'list'
                    ? 'bg-white text-berkeley-burgundy'
                    : 'bg-berkeley-burgundy-dark text-white hover:bg-opacity-80'
                }`}
              >
                List
              </button>
              <button
                onClick={() => {
                  setView('map');
                  setSelectedRoute(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'map'
                    ? 'bg-white text-berkeley-burgundy'
                    : 'bg-berkeley-burgundy-dark text-white hover:bg-opacity-80'
                }`}
              >
                Map
              </button>
              <button
                onClick={() => {
                  setView('routes');
                  setSelectedRoute(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'routes'
                    ? 'bg-white text-berkeley-burgundy'
                    : 'bg-berkeley-burgundy-dark text-white hover:bg-opacity-80'
                }`}
              >
                Routes
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
        {/* Location Error Alert */}
        {locationError && (
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

        {/* Routes View */}
        {view === 'routes' && (
          <>
            {!selectedRoute ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-berkeley-burgundy mb-4">
                  Walking Routes
                </h2>
                <p className="text-gray-600 mb-6">
                  Organized walks through Berkeley's paths from the Berkeley Path Wanderers Association
                </p>
                
                {routes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No routes available. Add routes-data.json to your data folder.
                  </div>
                ) : (
                  routes.map((route) => (
                    <div
                      key={route.id}
                      className="border-2 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer bg-white"
                      style={{ borderColor: '#8B4789' }}
                      onClick={() => setSelectedRoute(route)}
                    >
                      <h3 className="text-xl font-bold mb-3" style={{ color: '#8B4789' }}>
                        {route.name}
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 mb-3">
                        <div>📏 {route.distance}</div>
                        <div>🥾 {route.difficulty}</div>
                        <div>🚶 {route.estimated_time}</div>
                        <div>⛰️ {route.elevation_gain}</div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{route.description}</p>
                      <div className="text-sm font-medium" style={{ color: '#EAA636' }}>
                        Includes {route.paths_count} paths →
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div>
                {/* Route header */}
                <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#8B4789' }}>
                  <button
                    onClick={() => setSelectedRoute(null)}
                    className="text-white mb-2 flex items-center gap-2 hover:underline"
                  >
                    ← Back to Routes
                  </button>
                  <h2 className="text-xl font-bold text-white mb-2">{selectedRoute.name}</h2>
                  <div className="flex gap-4 text-sm text-white opacity-95">
                    <span>📏 {selectedRoute.distance}</span>
                    <span>🥾 {selectedRoute.difficulty}</span>
                    <span>⏱️ {selectedRoute.estimated_time}</span>
                  </div>
                </div>

                {/* Map */}
                <div className="rounded-lg overflow-hidden shadow-lg mb-4">
                  <div
                    ref={mapRef}
                    className="w-full"
                    style={{ height: '60vh', minHeight: '400px' }}
                  ></div>
                </div>

                {/* Info panel */}
                <div className="p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-700 mb-3">{selectedRoute.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={selectedRoute.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                      style={{ backgroundColor: '#8B4789' }}
                    >
                      📄 View PDF Directions
                    </a>
                    {userLocation && (
                      <button
                        onClick={() => {
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 16);
                          }
                        }}
                        className="px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors"
                        style={{ borderColor: '#8B4789', color: '#8B4789' }}
                      >
                        📍 Show My Location
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
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
                      <div className="text-gray-400 text-sm ml-4">
                        #{path.id}
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
                {!userLocation && !locationError && <span className="ml-3">📍 Getting your location...</span>}
                {userLocation && <span className="ml-3">🔵 Your location</span>}
              </p>
            </div>
          </div>
        )}
      </main>

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
