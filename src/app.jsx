const { useState, useEffect, useRef } = React;

const BerkeleyPathsTracker = () => {
  // State management
  const [paths, setPaths] = useState([]);
  const [completedPaths, setCompletedPaths] = useState(new Set());
  const [pathNotes, setPathNotes] = useState({});
  const [selectedPath, setSelectedPath] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyPaths, setNearbyPaths] = useState([]);
  const [view, setView] = useState('list'); // 'list' or 'map'
  const [filterCompleted, setFilterCompleted] = useState('all'); // 'all', 'completed', 'incomplete'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

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

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
        }
      );
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
      // Create map centered on Berkeley
      const map = L.map(mapRef.current).setView([37.8715, -122.2730], 13);
      
      // Add tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add user location marker if available
      if (userLocation) {
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: '<div style="background: #3B82F6; border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup('Your Location');
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

  // Update markers when completed status changes
  useEffect(() => {
    if (mapInstanceRef.current && typeof L !== 'undefined') {
      paths.forEach(path => {
        if (markersRef.current[path.id]) {
          const marker = markersRef.current[path.id];
          const isCompleted = completedPaths.has(path.id);
          
          // Update marker color
          const icon = createPathIcon(isCompleted);
          marker.setIcon(icon);
        }
      });
    }
  }, [completedPaths, paths]);

  // Helper function to create path marker icon
  const createPathIcon = (isCompleted) => {
    const color = isCompleted ? '#10B981' : '#941B1E'; // Green if completed, Berkeley burgundy if not
    return L.divIcon({
      className: 'path-marker',
      html: `<div style="background: ${color}; border: 2px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  };

  // Add path marker to map
  const addPathMarker = (map, path) => {
    const isCompleted = completedPaths.has(path.id);
    const icon = createPathIcon(isCompleted);

    // Create marker for start point
    const marker = L.marker([path.start[0], path.start[1]], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #941B1E;">${path.name}</h3>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${path.location}</p>
          ${isCompleted ? '<p style="margin: 0; font-size: 12px; color: #10B981; font-weight: 600;">✓ Completed</p>' : ''}
        </div>
      `);

    marker.on('click', () => {
      setSelectedPath(path);
      setView('list');
    });

    // Draw line between start and end
    const line = L.polyline([path.start, path.end], {
      color: isCompleted ? '#10B981' : '#941B1E',
      weight: 3,
      opacity: 0.6
    }).addTo(map);

    markersRef.current[path.id] = marker;
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
            <div
              ref={mapRef}
              className="w-full"
              style={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}
            ></div>
            <div className="p-4 bg-gray-50 text-sm text-gray-600">
              <p>
                <span className="font-medium">Legend:</span>{' '}
                <span className="inline-block w-3 h-3 rounded-full bg-berkeley-burgundy mr-1"></span> Incomplete{' '}
                <span className="inline-block w-3 h-3 rounded-full bg-green-600 ml-3 mr-1"></span> Completed
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
