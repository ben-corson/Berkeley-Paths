const { useState, useEffect, useRef } = React;

// Load paths data
let pathsData = [];
fetch('./data/paths-data.json')
  .then(response => response.json())
  .then(data => {
    pathsData = data;
  })
  .catch(error => console.error('Error loading paths data:', error));

// Icons
const MapPin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const CheckCircle = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const Circle = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
  </svg>
);

const List = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const Calendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const StickyNote = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/>
    <path d="M15 3v6h6"/>
  </svg>
);

const X = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

function InteractiveMap({ paths, userLocation, pathData, onPathClick, mapInstanceRef }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const pathLines = useRef([]);
  const hasSetInitialView = useRef(false);

  useEffect(() => {
    if (!leafletMap.current && mapRef.current) {
      leafletMap.current = L.map(mapRef.current).setView([37.8792, -122.2595], 18);
      
      // Expose map instance to parent
      if (mapInstanceRef) {
        mapInstanceRef.current = leafletMap.current;
      }
      
      // Use a more artistic/vintage map style similar to the Berkeley Paths map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CartoDB',
        maxZoom: 19
      }).addTo(leafletMap.current);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!leafletMap.current) return;

    pathLines.current.forEach(line => line.remove());
    pathLines.current = [];

    paths.forEach(path => {
      const isCompleted = pathData[path.id]?.completed;
      const isNearby = path.distance && path.distance < 0.5;
      
      const color = isCompleted ? '#941B1E' : isNearby ? '#EAA636' : '#C9984A';
      const weight = isNearby ? 6 : isCompleted ? 5 : 4;
      
      // Draw line from start to end
      const polyline = L.polyline([path.start, path.end], {
        color: color,
        weight: weight,
        opacity: 0.5
      }).addTo(leafletMap.current);

      polyline.bindPopup(`<strong>${path.name}</strong><br>${path.location}`);
      polyline.on('click', () => onPathClick(path));
      
      pathLines.current.push(polyline);
    });

    if (userLocation && !pathLines.current.some(line => line instanceof L.CircleMarker)) {
      const userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 10,
        fillColor: '#ef4444',
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      }).addTo(leafletMap.current);

      userMarker.bindPopup('<strong>You are here</strong>');
      pathLines.current.push(userMarker);
      
      // Only set view to user location on very first load
      if (!hasSetInitialView.current) {
        leafletMap.current.setView([userLocation.lat, userLocation.lng], 18);
        hasSetInitialView.current = true;
      }
    }
  }, [paths, userLocation, pathData, onPathClick]);

  return (
    <div>
      <div id="map" ref={mapRef}></div>
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1" style={{backgroundColor: '#C9984A'}}></div>
            <span>Not completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1" style={{height: '5px', backgroundColor: '#EAA636'}}></div>
            <span>Nearby (within 0.5 mi)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1" style={{height: '4px', backgroundColor: '#941B1E'}}></div>
            <span>Completed</span>
          </div>
          {userLocation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
              <span>Your location</span>
            </div>
          )}
        </div>
      </div>
      {!userLocation && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            📍 Enable location to see your position and nearby paths
          </p>
        </div>
      )}
    </div>
  );
}

function App() {
  const [paths, setPaths] = useState([]);
  const [pathData, setPathData] = useState({});
  const [viewMode, setViewMode] = useState('map');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('distance'); // 'distance' or 'alphabetical'
  const [selectedPath, setSelectedPath] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Load paths data
    fetch('./data/paths-data.json')
      .then(response => response.json())
      .then(data => setPaths(data))
      .catch(error => console.error('Error loading paths data:', error));

    const saved = localStorage.getItem('berkeleyPathsData');
    if (saved) {
      setPathData(JSON.parse(saved));
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }
      );
      
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const saveData = (newData) => {
    setPathData(newData);
    localStorage.setItem('berkeleyPathsData', JSON.stringify(newData));
  };

  const togglePath = (pathId) => {
    const currentData = pathData[pathId] || {};
    const newData = {
      ...pathData,
      [pathId]: {
        ...currentData,
        completed: !currentData.completed,
        dateCompleted: !currentData.completed ? new Date().toISOString() : null
      }
    };
    saveData(newData);
  };

  const updatePathNotes = (pathId, notes) => {
    const currentData = pathData[pathId] || {};
    const newData = {
      ...pathData,
      [pathId]: {
        ...currentData,
        notes: notes
      }
    };
    saveData(newData);
  };

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

  const pathsWithDistance = userLocation ? paths.map(path => ({
    ...path,
    distance: calculateDistance(userLocation.lat, userLocation.lng, path.start[0], path.start[1])
  })) : paths;

  const completedCount = Object.values(pathData).filter(d => d.completed).length;
  const totalPaths = paths.length;
  const percentage = Math.round((completedCount / totalPaths) * 100);

  const filteredPaths = pathsWithDistance.filter(path => {
    if (filter === 'completed') return pathData[path.id]?.completed;
    if (filter === 'remaining') return !pathData[path.id]?.completed;
    if (filter === 'nearby') return path.distance && path.distance < 0.5;
    return true;
  });

  // Apply sorting based on sortBy state
  const sortedPaths = [...filteredPaths].sort((a, b) => {
    if (sortBy === 'alphabetical') {
      return a.name.localeCompare(b.name);
    } else {
      // Sort by distance (default)
      if (!a.distance && !b.distance) return 0;
      if (!a.distance) return 1;
      if (!b.distance) return -1;
      return a.distance - b.distance;
    }
  });

  const handlePathNameClick = (path) => {
    setSelectedPath(path);
    setViewMode('map');
    // Longer delay to ensure map is fully rendered and ref is set
    setTimeout(() => {
      if (mapRef.current) {
        // Calculate center point between start and end
        const centerLat = (path.start[0] + path.end[0]) / 2;
        const centerLng = (path.start[1] + path.end[1]) / 2;
        mapRef.current.setView([centerLat, centerLng], 18);
      }
    }, 300);
  };

  const handleMapPathClick = (path) => {
    setSelectedPath(path);
    // Center the map on the clicked path
    if (mapRef.current) {
      const centerLat = (path.start[0] + path.end[0]) / 2;
      const centerLng = (path.start[1] + path.end[1]) / 2;
      mapRef.current.setView([centerLat, centerLng], 18);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
      <div className="berkeley-burgundy-bg shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="app-title text-xl font-bold flex items-center gap-2">
            <MapPin />
            Berkeley Paths Tracker
          </h1>
          <div className="mt-3">
            <div className="flex justify-between text-sm text-gray-100 mb-1">
              <span>{completedCount} of {totalPaths} paths</span>
              <span className="font-semibold berkeley-gold-text">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="berkeley-gold-bg h-3 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-2 justify-between flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                viewMode === 'list' 
                  ? 'berkeley-gold-bg berkeley-burgundy-text shadow-md' 
                  : 'bg-white text-gray-700'
              }`}
            >
              <List /> List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                viewMode === 'map' 
                  ? 'berkeley-gold-bg berkeley-burgundy-text shadow-md' 
                  : 'bg-white text-gray-700'
              }`}
            >
              <MapPin /> Map
            </button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {viewMode === 'list' && (
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700"
              >
                <option value="distance">Sort: Distance</option>
                <option value="alphabetical">Sort: A-Z</option>
              </select>
            )}
            
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700"
            >
              <option value="all">All Paths ({totalPaths})</option>
              <option value="nearby">Nearby ({pathsWithDistance.filter(p => p.distance && p.distance < 0.5).length})</option>
              <option value="completed">Completed ({completedCount})</option>
              <option value="remaining">Remaining ({totalPaths - completedCount})</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8">
        {viewMode === 'list' ? (
          <div className="space-y-2">
            {sortedPaths.map(path => (
              <div
                key={path.id}
                className={`bg-white rounded-lg p-4 shadow-sm transition-all hover:shadow-md ${
                  pathData[path.id]?.completed ? 'border-l-4' : ''
                }`}
                style={pathData[path.id]?.completed ? {borderColor: '#941B1E'} : {}}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap cursor-pointer" onClick={() => handlePathNameClick(path)}>
                      <h3 className={`font-semibold text-lg hover:text-blue-600 transition-colors ${
                        pathData[path.id]?.completed ? 'text-gray-500 line-through' : 'text-gray-800'
                      }`}>
                        {path.name}
                      </h3>
                      {path.distance && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          path.distance < 0.5 ? 'text-gray-800' : 'bg-gray-100 text-gray-600'
                        }`
                        style={path.distance < 0.5 ? {backgroundColor: '#EAA636'} : {}}>
                          {path.distance.toFixed(1)} mi
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{path.location}</p>
                    {pathData[path.id]?.dateCompleted && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{color: '#941B1E'}}>
                        <Calendar />
                        Completed {new Date(pathData[path.id].dateCompleted).toLocaleDateString()}
                      </p>
                    )}
                    {pathData[path.id]?.notes && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <StickyNote />
                        {pathData[path.id].notes.substring(0, 60)}{pathData[path.id].notes.length > 60 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    <button onClick={() => togglePath(path.id)}>
                      {pathData[path.id]?.completed ? <CheckCircle /> : <Circle />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden p-4">
            <InteractiveMap 
              paths={sortedPaths} 
              userLocation={userLocation}
              pathData={pathData}
              onPathClick={handleMapPathClick}
              mapInstanceRef={mapRef}
            />
          </div>
        )}
      </div>

      {selectedPath && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedPath(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedPath.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedPath.location}</p>
                </div>
                <button onClick={() => setSelectedPath(null)} className="text-gray-500 hover:text-gray-700">
                  <X />
                </button>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => togglePath(selectedPath.id)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                    pathData[selectedPath.id]?.completed
                      ? 'berkeley-gold-bg berkeley-burgundy-text hover:opacity-90'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {pathData[selectedPath.id]?.completed ? (
                    <>✓ Completed on {new Date(pathData[selectedPath.id].dateCompleted).toLocaleDateString()}</>
                  ) : (
                    'Mark as Completed'
                  )}
                </button>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                    <StickyNote /> Notes
                  </label>
                  <textarea
                    value={pathData[selectedPath.id]?.notes || ''}
                    onChange={(e) => updatePathNotes(selectedPath.id, e.target.value)}
                    placeholder="Add your thoughts, difficulty level, highlights..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:border-transparent"
                    style={{'--tw-ring-color': '#941B1E'}}
                    rows="4"
                  />
                </div>

                <div className="border-t pt-4">
                  <a
                    href={`https://www.google.com/maps/dir/${selectedPath.start[0]},${selectedPath.start[1]}/${selectedPath.end[0]},${selectedPath.end[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all berkeley-gold-bg hover:opacity-90"
                  >
                    <MapPin /> Get Directions in Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {completedCount === 0 && viewMode === 'list' && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Getting Started</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click any path name to view details and add notes</li>
              <li>• Tap the circle icon to mark a path as completed</li>
              <li>• Use the "Nearby" filter to see paths within 0.5 miles</li>
              <li>• Switch to Map view to see actual path routes highlighted</li>
              <li>• On iPhone: Add to Home Screen for the best experience!</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('app'));
