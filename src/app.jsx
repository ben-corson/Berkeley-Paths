const { useState, useEffect, useRef } = React;

const BerkeleyPathsTracker = () => {
  // State management
  const [paths, setPaths] = useState([]);
  const [completedPaths, setCompletedPaths] = useState(new Set());
  const [selectedPath, setSelectedPath] = useState(null);
  const [showPathDialog, setShowPathDialog] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userHeading, setUserHeading] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [nearbyPaths, setNearbyPaths] = useState([]);
  const [view, setView] = useState('map'); // 'list' or 'map'
  const [filterCompleted, setFilterCompleted] = useState('all'); // 'all', 'completed', 'incomplete'
  const [sortBy, setSortBy] = useState('alphabetical'); // 'alphabetical' or 'distance'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugMessages, setDebugMessages] = useState([]);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);

  // Helper to add debug messages
  const addDebug = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugMessages(prev => [...prev.slice(-4), `${timestamp}: ${message}`]); // Keep last 5 messages
    console.log(message);
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

  // Get user's location and track orientation
  useEffect(() => {
    addDebug('Starting geolocation setup');
    if (navigator.geolocation) {
      // Watch position continuously for updates
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          addDebug(`Location obtained: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(null); // Clear any previous errors
          
          // Some devices provide heading from GPS
          if (position.coords.heading !== null && position.coords.heading !== undefined) {
            addDebug(`GPS heading: ${position.coords.heading}`);
            setUserHeading(position.coords.heading);
          }
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
          
          addDebug(`Geolocation error: ${error.code}`);
          setLocationError(errorMessage);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000 // Increase timeout to 10 seconds
        }
      );

      // Also try to get device orientation (compass heading)
      const handleOrientation = (event) => {
        if (event.webkitCompassHeading !== undefined) {
          // iOS
          console.log('iOS compass heading:', event.webkitCompassHeading);
          setUserHeading(event.webkitCompassHeading);
        } else if (event.alpha !== null) {
          // Android - alpha is 0-360 degrees
          // Convert to compass heading (0 = North)
          const heading = 360 - event.alpha;
          console.log('Android heading:', heading);
          setUserHeading(heading);
        }
      };

      // Request permission for iOS 13+
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            console.log('Device orientation permission:', permissionState);
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(err => {
            console.log('Device orientation permission denied:', err);
          });
      } else {
        // Non-iOS devices
        window.addEventListener('deviceorientation', handleOrientation);
      }

      return () => {
        navigator.geolocation.clearWatch(watchId);
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      console.log('Geolocation not supported');
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
    addDebug(`Map init - view:${view} mapRef:${!!mapRef.current} instance:${!!mapInstanceRef.current} paths:${paths.length}`);
    if (view === 'map' && mapRef.current && !mapInstanceRef.current && paths.length > 0 && typeof L !== 'undefined') {
      addDebug('Creating map instance');
      // Create map centered on Berkeley initially (will update when location comes in)
      const map = L.map(mapRef.current).setView([37.8715, -122.2730], 13);
      
      // Add tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      addDebug('Map created successfully');

      // Add path markers
      paths.forEach(path => {
        addPathMarker(map, path);
      });
      addDebug(`Added ${paths.length} path lines`);
    }

    return () => {
      if (mapInstanceRef.current) {
        addDebug('Cleaning up map');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
        userMarkerRef.current = null;
      }
    };
  }, [view, paths]);

  // Add/update user location marker when location is available
  useEffect(() => {
    addDebug(`User marker effect - hasLocation:${!!userLocation} hasMap:${!!mapInstanceRef.current}`);
    if (mapInstanceRef.current && userLocation && typeof L !== 'undefined') {
      addDebug(`Adding marker at ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
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
      
      // If marker doesn't exist, create it and center map on user location
      if (!userMarkerRef.current) {
        addDebug('Creating new user marker, centering at zoom 17');
        const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('Your Location');
        
        userMarkerRef.current = marker;
        
        // Center map on user location at zoom 17 when first location is obtained
        mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17);
        addDebug('Map centered on user location');
      } else {
        addDebug('Updating existing marker position');
        // Update existing marker position and icon
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        userMarkerRef.current.setIcon(userIcon);
      }
    }
  }, [userLocation, userHeading]);

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
      setShowPathDialog(true);
    });

    // Also make the visible line clickable
    line.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      setSelectedPath(path);
      setShowPathDialog(true);
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

  // Filter and sort paths based on criteria
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

    // Sort paths
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
        // Calculate midpoint between start and end
        const midLat = (path.start[0] + path.end[0]) / 2;
        const midLng = (path.start[1] + path.end[1]) / 2;
        
        // Center on path at zoom level 17
        mapInstanceRef.current.setView([midLat, midLng], 17);
        
        // Highlight the selected path
        if (markersRef.current[path.id]) {
          const { line } = markersRef.current[path.id];
          const isCompleted = completedPaths.has(path.id);
          const baseColor = isCompleted ? '#941B1E' : '#EAA636';
          
          // Make the line thicker and more opaque temporarily
          line.setStyle({ 
            weight: 8, 
            opacity: 1,
            color: baseColor
          });
          
          // Reset after 2 seconds
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
            {selectedPath && view === 'list' && (
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
        ) : (
          /* Map view */
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="relative">
              <div
                ref={mapRef}
                className="w-full"
                style={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}
              ></div>
              
              {/* Debug Panel */}
              {debugMessages.length > 0 && (
                <div className="absolute top-4 left-4 right-4 bg-black bg-opacity-75 text-white text-xs p-3 rounded-lg max-h-32 overflow-auto z-[1000]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">Debug Info:</span>
                    <button 
                      onClick={() => setDebugMessages([])}
                      className="text-white hover:text-gray-300"
                    >
                      Clear
                    </button>
                  </div>
                  {debugMessages.map((msg, i) => (
                    <div key={i} className="mb-1">{msg}</div>
                  ))}
                </div>
              )}
              
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
                {userLocation && <span className="ml-3">🔵 Your location {userHeading !== null ? '(with direction beam)' : ''}</span>}
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
