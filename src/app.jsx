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

const Map = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);

const X = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// Calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Interactive Map Component
function InteractiveMap({ paths, userLocation, pathData, onPathClick }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const pathLines = useRef([]);
  const hasSetInitialView = useRef(false);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([37.8715, -122.2730], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 19
      }).addTo(leafletMap.current);
    }

    pathLines.current.forEach(line => leafletMap.current.removeLayer(line));
    pathLines.current = [];

    paths.forEach(path => {
      const isCompleted = pathData[path.id]?.completed;
      const isNearby = userLocation && 
        calculateDistance(userLocation.lat, userLocation.lng, path.start[0], path.start[1]) <= 0.5;
      
      const color = isCompleted ? '#941B1E' : isNearby ? '#EAA636' : '#C9984A';
      const weight = isNearby ? 6 : isCompleted ? 5 : 4;
      
      // IMPROVED: Create invisible wider line for easier tapping on mobile
      const invisibleLine = L.polyline([path.start, path.end], {
        color: 'transparent',
        weight: 20, // Much thicker invisible tap target
        opacity: 0,
        interactive: true
      }).addTo(leafletMap.current);
      
      // Create visible line
      const visibleLine = L.polyline([path.start, path.end], {
        color: color,
        weight: weight,
        opacity: 0.5,
        interactive: true
      }).addTo(leafletMap.current);

      // Add popup and click handler to BOTH lines
      const popupContent = `<strong>${path.name}</strong><br>${path.location}`;
      invisibleLine.bindPopup(popupContent);
      visibleLine.bindPopup(popupContent);
      
      const clickHandler = () => onPathClick(path);
      invisibleLine.on('click', clickHandler);
      visibleLine.on('click', clickHandler);
      
      pathLines.current.push(invisibleLine);
      pathLines.current.push(visibleLine);
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
      
      if (!hasSetInitialView.current) {
        leafletMap.current.setView([userLocation.lat, userLocation.lng], 15);
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
  const [sortBy, setSortBy] = useState('distance');
  const [selectedPath, setSelectedPath] = useState(null);
  const [showPathDialog, setShowPathDialog] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('./data/paths-data.json');
        const data = await response.json();
        setPaths(data);
      } catch (error) {
        console.error('Error loading paths:', error);
      }
    };
    fetchData();

    const savedData = localStorage.getItem('berkeleyPathsData');
    if (savedData) {
      setPathData(JSON.parse(savedData));
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.log('Location error:', error)
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('berkeleyPathsData', JSON.stringify(pathData));
  }, [pathData]);

  const togglePathCompletion = (pathId) => {
    setPathData(prev => ({
      ...prev,
      [pathId]: {
        ...prev[pathId],
        completed: !prev[pathId]?.completed
      }
    }));
  };

  const updatePathNotes = (pathId, notes) => {
    setPathData(prev => ({
      ...prev,
      [pathId]: {
        ...prev[pathId],
        notes: notes
      }
    }));
  };

  const handlePathClick = (path) => {
    setSelectedPath(path);
    setShowPathDialog(true);
  };

  const completedCount = Object.values(pathData).filter(p => p?.completed).length;
  const completionPercentage = Math.round((completedCount / paths.length) * 100);

  const getFilteredPaths = () => {
    let filtered = paths;
    
    if (filter === 'completed') {
      filtered = paths.filter(p => pathData[p.id]?.completed);
    } else if (filter === 'incomplete') {
      filtered = paths.filter(p => !pathData[p.id]?.completed);
    } else if (filter === 'nearby' && userLocation) {
      filtered = paths.filter(p => 
        calculateDistance(userLocation.lat, userLocation.lng, p.start[0], p.start[1]) <= 0.5
      );
    }

    if (sortBy === 'alphabetical') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'distance' && userLocation) {
      filtered = [...filtered].sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.start[0], a.start[1]);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.start[0], b.start[1]);
        return distA - distB;
      });
    }

    return filtered;
  };

  const filteredPaths = getFilteredPaths();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-berkeley-burgundy to-red-800 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Berkeley Paths Tracker</h1>
          <p className="text-sm opacity-90 mt-1">
            {completedCount} of {paths.length} paths completed ({completionPercentage}%)
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'map' 
                  ? 'bg-berkeley-burgundy text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Map />
              Map View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-berkeley-burgundy text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <List />
              List View
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-berkeley-burgundy"
            >
              <option value="all">All Paths</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Not Completed</option>
              {userLocation && <option value="nearby">Nearby (0.5 mi)</option>}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-berkeley-burgundy"
            >
              <option value="alphabetical">A-Z</option>
              {userLocation && <option value="distance">Nearest First</option>}
            </select>
          </div>

          {viewMode === 'map' ? (
            <InteractiveMap
              paths={filteredPaths}
              userLocation={userLocation}
              pathData={pathData}
              onPathClick={handlePathClick}
            />
          ) : (
            <div className="space-y-2">
              {filteredPaths.map(path => {
                const isCompleted = pathData[path.id]?.completed;
                const distance = userLocation 
                  ? calculateDistance(userLocation.lat, userLocation.lng, path.start[0], path.start[1])
                  : null;

                return (
                  <div
                    key={path.id}
                    onClick={() => handlePathClick(path)}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePathCompletion(path.id);
                      }}
                      className="mt-1"
                    >
                      {isCompleted ? (
                        <CheckCircle className="text-green-500" />
                      ) : (
                        <Circle className="text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                        {path.name}
                      </h3>
                      <p className="text-sm text-gray-600">{path.location}</p>
                      {distance !== null && (
                        <p className="text-xs text-berkeley-gold mt-1">
                          📍 {distance.toFixed(2)} miles away
                        </p>
                      )}
                    </div>
                    <MapPin className="text-berkeley-burgundy" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showPathDialog && selectedPath && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">{selectedPath.name}</h2>
              <button
                onClick={() => setShowPathDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">{selectedPath.location}</p>

            <button
              onClick={() => togglePathCompletion(selectedPath.id)}
              className={`w-full py-3 px-4 rounded-lg font-semibold mb-4 transition-colors ${
                pathData[selectedPath.id]?.completed
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-berkeley-burgundy text-white hover:bg-red-800'
              }`}
            >
              {pathData[selectedPath.id]?.completed ? '✓ Completed' : 'Mark as Completed'}
            </button>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Personal Notes
              </label>
              <textarea
                value={pathData[selectedPath.id]?.notes || ''}
                onChange={(e) => updatePathNotes(selectedPath.id, e.target.value)}
                placeholder="Add notes about this path..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-berkeley-burgundy"
                rows="4"
              />
            </div>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPath.start[0]},${selectedPath.start[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-3 px-4 bg-berkeley-gold text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
            >
              Get Directions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
