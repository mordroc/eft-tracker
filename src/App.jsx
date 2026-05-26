import { useState, useEffect } from 'react';
import './App.css';

const TARKOV_API = 'https://api.tarkov.dev/graphql';

const QUERY = `
  query {
    items {
      id, name, shortName, width, height, avg24hPrice
      sellFor { price, vendor { name } }
    }
    hideoutStations {
      name
      levels {
        level
        itemRequirements {
          count
          item { 
            id, name, shortName, width, height, avg24hPrice 
            sellFor { price, vendor { name } }
          }
        }
        stationLevelRequirements {
          station { name }
          level
        }
      }
    }
    tasks {
      name
      minPlayerLevel
      objectives {
        ... on TaskObjectiveItem {
          count
          foundInRaid
          item { 
            id, name, shortName, width, height, avg24hPrice 
            sellFor { price, vendor { name } }
          }
        }
      }
    }
  }
`;

// --- Top Values Dashboard ---
const TopValuesTab = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedByFlea = [...filteredItems].sort((a, b) => b.price - a.price).slice(0, 100);
  const sortedByTrader = [...filteredItems].sort((a, b) => b.traderPrice - a.traderPrice).slice(0, 100);

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <p style={{ color: '#aaa', marginBottom: '15px' }}>
        <em>Global Loot Dictionary. Search any item in the game to find its best vendor. (Showing top 100 matches).</em>
      </p>
      
      <input 
        type="text" 
        placeholder="Search for an item (e.g., RAM stick, GPU)..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ 
          width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '4px', 
          border: '1px solid #555', backgroundColor: '#222', color: '#eaeaea',
          fontSize: '16px', boxSizing: 'border-box'
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: '#222', borderRadius: '8px', padding: '20px', border: '1px solid #444', maxHeight: '70vh', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#ff9900', borderBottom: '1px solid #444', paddingBottom: '10px', position: 'sticky', top: 0, backgroundColor: '#222' }}>
            Flea Market Value
          </h3>
          <ol style={{ margin: 0, paddingLeft: '25px', color: '#eaeaea' }}>
            {sortedByFlea.map(item => (
              <li key={`flea-${item.id}`} style={{ marginBottom: '12px', borderBottom: '1px dashed #333', paddingBottom: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                  <span style={{ color: '#ff9900', fontWeight: 'bold' }}>₽{item.price.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.8em', color: '#888' }}>
                  Value/Square: ₽{item.valuePerSquare.toLocaleString()}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div style={{ backgroundColor: '#222', borderRadius: '8px', padding: '20px', border: '1px solid #444', maxHeight: '70vh', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#00ff00', borderBottom: '1px solid #444', paddingBottom: '10px', position: 'sticky', top: 0, backgroundColor: '#222' }}>
            Trader Value
          </h3>
          <ol style={{ margin: 0, paddingLeft: '25px', color: '#eaeaea' }}>
            {sortedByTrader.map(item => (
              <li key={`trader-${item.id}`} style={{ marginBottom: '12px', borderBottom: '1px dashed #333', paddingBottom: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                  <span style={{ color: '#00ff00', fontWeight: 'bold' }}>₽{item.traderPrice.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.8em', color: '#888' }}>
                  Value/Square: ₽{item.valuePerSquare.toLocaleString()}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

// --- Master Shopping List (Global Stash Input) ---
const ItemTable = ({ items, stash, updateStash, stationsData, tasksData, completedProjects }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const remainingHideoutNeed = {};
  const remainingQuestNeed = {};

  stationsData.forEach(station => {
    station.levels.forEach(lvl => {
      if (!completedProjects.includes(`hideout_${station.name}_${lvl.level}`)) {
        lvl.items.forEach(req => {
          remainingHideoutNeed[req.id] = (remainingHideoutNeed[req.id] || 0) + req.count;
        });
      }
    });
  });

  tasksData.forEach(task => {
    if (!completedProjects.includes(`quest_${task.name}`)) {
      task.items.forEach(req => {
        remainingQuestNeed[req.id] = (remainingQuestNeed[req.id] || 0) + req.count;
      });
    }
  });

  return (
    <div style={{ marginBottom: '40px', animation: 'fadeIn 0.3s' }}>
      <p style={{ color: '#aaa', marginBottom: '15px' }}>
        <em>Global Stash Manager. Add items here. Needs are dynamically calculated based on unbuilt stations.</em>
      </p>

      <input 
        type="text" 
        placeholder="Search for an item..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ 
          width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '4px', 
          border: '1px solid #555', backgroundColor: '#222', color: '#eaeaea',
          fontSize: '16px', boxSizing: 'border-box'
        }}
      />

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #444', backgroundColor: '#222' }}>
            <th style={{ padding: '10px' }}>Item Name</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>In Stash</th>
            <th style={{ padding: '10px' }}>Remaining Hideout Need</th>
            <th style={{ padding: '10px' }}>Remaining Task Need</th>
            <th style={{ padding: '10px' }}>Flea Value</th>
            <th style={{ padding: '10px' }}>Trader Value</th>
            <th style={{ padding: '10px', color: '#ff9900' }}>Value / Square</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map(item => {
            const activeHideoutNeed = remainingHideoutNeed[item.id] || 0;
            const activeQuestNeed = remainingQuestNeed[item.id] || 0;
            const totalNeeded = activeHideoutNeed + activeQuestNeed;
            const stashCount = stash[item.id] || 0;

            const hasEnough = stashCount >= totalNeeded && totalNeeded > 0;
            const needsFiR = item.foundInRaidRequired;
            const isTraderHigher = item.traderPrice > item.price;

            let rowBg = 'transparent';
            if (hasEnough) {
              rowBg = '#1a331a'; 
            } else if (isTraderHigher) {
              rowBg = '#1e4d2b'; 
            }

            return (
              <tr key={item.id} style={{ borderBottom: '1px solid #333', backgroundColor: rowBg }}>
                <td style={{ padding: '10px' }}>
                  <strong>{item.name}</strong>
                  {needsFiR && <span style={{ marginLeft: '10px', color: '#ff4d4d', fontSize: '0.8em', border: '1px solid #ff4d4d', padding: '2px 4px', borderRadius: '3px' }}>FiR Needed</span>}
                </td>
                
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <button onClick={() => updateStash(item.id, stashCount - 1)} style={{ backgroundColor: '#444', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px' }}>-</button>
                    <input 
                      type="number" 
                      min="0"
                      value={stashCount || ''} 
                      placeholder="0"
                      onChange={(e) => updateStash(item.id, parseInt(e.target.value) || 0)}
                      style={{ width: '80px', textAlign: 'center', backgroundColor: '#333', color: 'white', border: '1px solid #555', padding: '4px', borderRadius: '4px' }}
                    />
                    <button onClick={() => updateStash(item.id, stashCount + 1)} style={{ backgroundColor: '#444', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px' }}>+</button>
                  </div>
                </td>

                <td style={{ padding: '10px' }}>{activeHideoutNeed > 0 ? activeHideoutNeed.toLocaleString() : '-'}</td>
                <td style={{ padding: '10px' }}>{activeQuestNeed > 0 ? activeQuestNeed.toLocaleString() : '-'}</td>
                <td style={{ padding: '10px', color: '#eaeaea' }}>₽{item.price.toLocaleString()}</td>
                <td style={{ padding: '10px', color: isTraderHigher ? '#00ff00' : '#aaa', fontWeight: isTraderHigher ? 'bold' : 'normal' }}>
                  ₽{item.traderPrice.toLocaleString()}
                </td>
                <td style={{ padding: '10px', color: '#ff9900', fontWeight: 'bold' }}>
                  ₽{item.valuePerSquare.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// --- Hideout Station Allocation View ---
const StationBreakdown = ({ stationsData, stash, handleBuild, completedProjects }) => {
  const [expanded, setExpanded] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggle = (name) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));

  const filteredStations = stationsData.filter(station => {
    const searchLower = searchTerm.toLowerCase();
    if (station.name.toLowerCase().includes(searchLower)) return true;
    return station.levels.some(lvl => lvl.items.some(item => item.name.toLowerCase().includes(searchLower)));
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <input 
        type="text" 
        placeholder="Search for a station or item..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#222', color: '#eaeaea', fontSize: '16px', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredStations.map(station => {
          const isExpanded = expanded[station.name];
          const allLevelsComplete = station.levels.length > 0 && station.levels.every(lvl => completedProjects.includes(`hideout_${station.name}_${lvl.level}`));
          
          const nextLevel = station.levels.find(lvl => !completedProjects.includes(`hideout_${station.name}_${lvl.level}`));
          let isStationLocked = false;
          let missingReqs = [];
          let canBuildNextLevel = false;
          
          if (nextLevel) {
            missingReqs = nextLevel.stationReqs.filter(req => !completedProjects.includes(`hideout_${req.name}_${req.level}`));
            isStationLocked = missingReqs.length > 0;
            
            if (!isStationLocked) {
              canBuildNextLevel = nextLevel.items.every(item => (stash[item.id] || 0) >= item.count);
            }
          }

          const cardBg = allLevelsComplete ? '#111' : (isStationLocked ? '#1a1a1a' : '#222');
          
          let titleColor = '#ff9900'; 
          if (allLevelsComplete) titleColor = '#666'; 
          else if (isStationLocked) titleColor = '#885522'; 
          else if (canBuildNextLevel) titleColor = '#00ff00'; // NEW GREEN LOGIC

          return (
            <div key={station.name} style={{ backgroundColor: cardBg, borderRadius: '8px', padding: '15px', border: '1px solid #444', transition: 'all 0.3s' }}>
              <div 
                onClick={() => toggle(station.name)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #444' : 'none', paddingBottom: isExpanded ? '10px' : '0', marginBottom: isExpanded ? '15px' : '0' }}
              >
                <div>
                  <h3 style={{ margin: 0, color: titleColor, textDecoration: allLevelsComplete ? 'line-through' : 'none' }}>
                    {station.name}
                  </h3>
                  {isStationLocked && (
                    <span style={{ fontSize: '0.85em', color: '#a85c5c', display: 'block', marginTop: '6px' }}>
                      Locked - Needs: {missingReqs.map(r => `${r.name} Lv${r.level}`).join(', ')}
                    </span>
                  )}
                  {canBuildNextLevel && !allLevelsComplete && (
                    <span style={{ fontSize: '0.85em', color: '#00ff00', display: 'block', marginTop: '6px' }}>
                      Ready to Build!
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '1.5em', color: '#aaa', fontWeight: 'bold', marginLeft: '10px' }}>{isExpanded ? '-' : '+'}</span>
              </div>
              
              {isExpanded && station.levels.map(lvl => {
                const projectKey = `hideout_${station.name}_${lvl.level}`;
                const isLevelComplete = completedProjects.includes(projectKey);
                
                const levelMissingReqs = lvl.stationReqs.filter(req => !completedProjects.includes(`hideout_${req.name}_${req.level}`));
                const isLevelLocked = levelMissingReqs.length > 0 && !isLevelComplete;
                
                const canBuild = !isLevelLocked && lvl.items.every(item => (stash[item.id] || 0) >= item.count);

                return (
                  <div key={lvl.level} style={{ marginBottom: '15px', opacity: isLevelComplete ? 0.4 : 1, transition: 'all 0.3s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0, color: isLevelComplete ? '#666' : (isLevelLocked ? '#a85c5c' : '#aaa') }}>
                        Level {lvl.level}
                      </h4>
                      
                      <label style={{ 
                        color: canBuild || isLevelComplete ? '#00ff00' : '#666', 
                        cursor: canBuild || isLevelComplete ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px'
                      }}>
                        <input 
                          type="checkbox" 
                          checked={isLevelComplete} 
                          disabled={!isLevelComplete && !canBuild} 
                          onChange={(e) => handleBuild(projectKey, lvl.items, e.target.checked)} 
                        />
                        {isLevelComplete ? 'Built!' : 'Build Station'}
                      </label>
                    </div>

                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                      {lvl.items.map(item => {
                        const stashCount = stash[item.id] || 0;
                        const hasEnough = stashCount >= item.count;
                        const isItemMatch = searchTerm && item.name.toLowerCase().includes(searchTerm.toLowerCase());
                        
                        const itemBgColor = isLevelComplete ? '#1a331a' : (hasEnough ? '#1a331a' : (isItemMatch ? '#4a3b1a' : 'transparent'));

                        return (
                          <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '5px', backgroundColor: itemBgColor, borderRadius: '4px', border: isItemMatch ? '1px solid #ff9900' : 'none' }}>
                            <span style={{ flex: 1, fontWeight: isItemMatch ? 'bold' : 'normal', color: isItemMatch ? '#ff9900' : '#eaeaea' }}>{item.name}</span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isLevelComplete ? (
                                <span style={{ color: '#00ff00', fontWeight: 'bold' }}>✓ Consumed</span>
                              ) : (
                                <span style={{ color: hasEnough ? '#00ff00' : '#eaeaea', fontWeight: 'bold', width: '90px', textAlign: 'right' }}>
                                  {stashCount.toLocaleString()} / {item.count.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Task/Quest Allocation View ---
const TaskBreakdown = ({ tasksData, stash, handleBuild, completedProjects }) => {
  const [expanded, setExpanded] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggle = (name) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));

  const filteredTasks = tasksData.filter(task => {
    const searchLower = searchTerm.toLowerCase();
    if (task.name.toLowerCase().includes(searchLower)) return true;
    return task.items.some(item => item.name.toLowerCase().includes(searchLower));
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <input 
        type="text" 
        placeholder="Search for a quest or item..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#222', color: '#eaeaea', fontSize: '16px', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredTasks.map(task => {
          const isExpanded = expanded[task.name];
          const projectKey = `quest_${task.name}`;
          const isTaskComplete = completedProjects.includes(projectKey);
          
          const canBuild = task.items.every(item => (stash[item.id] || 0) >= item.count);

          const cardBg = isTaskComplete ? '#111' : '#222';
          
          let titleColor = '#3366cc';
          if (isTaskComplete) titleColor = '#666';
          else if (canBuild) titleColor = '#00ff00'; // NEW GREEN LOGIC

          return (
            <div key={task.name} style={{ backgroundColor: cardBg, borderRadius: '8px', padding: '15px', border: '1px solid #444', opacity: isTaskComplete ? 0.6 : 1, transition: 'all 0.3s' }}>
              <div 
                onClick={() => toggle(task.name)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #444' : 'none', paddingBottom: isExpanded ? '10px' : '0', marginBottom: isExpanded ? '15px' : '0' }}
              >
                <div>
                  <h3 style={{ margin: 0, color: titleColor, textDecoration: isTaskComplete ? 'line-through' : 'none' }}>
                    {task.name} {isTaskComplete && <span style={{fontSize: '0.6em', color: '#00ff00', textDecoration: 'none'}}>(Turned In)</span>}
                  </h3>
                  {canBuild && !isTaskComplete && (
                    <span style={{ fontSize: '0.85em', color: '#00ff00', display: 'block', marginTop: '6px' }}>
                      Ready to Turn In!
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '1.5em', color: '#aaa', fontWeight: 'bold' }}>{isExpanded ? '-' : '+'}</span>
              </div>
              
              {isExpanded && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <label style={{ 
                      color: canBuild || isTaskComplete ? '#00ff00' : '#666', 
                      cursor: canBuild || isTaskComplete ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={isTaskComplete} 
                        disabled={!isTaskComplete && !canBuild} 
                        onChange={(e) => handleBuild(projectKey, task.items, e.target.checked)} 
                      />
                      {isTaskComplete ? 'Turned In!' : 'Turn In Quest'}
                    </label>
                  </div>

                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                    {task.items.map(item => {
                      const stashCount = stash[item.id] || 0;
                      const hasEnough = stashCount >= item.count;
                      const isItemMatch = searchTerm && item.name.toLowerCase().includes(searchTerm.toLowerCase());
                      
                      const itemBgColor = isTaskComplete ? '#1a331a' : (hasEnough ? '#1a331a' : (isItemMatch ? '#283655' : 'transparent'));

                      return (
                        <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '5px', backgroundColor: itemBgColor, borderRadius: '4px', border: isItemMatch ? '1px solid #3366cc' : 'none' }}>
                          <span style={{ flex: 1, fontWeight: isItemMatch ? 'bold' : 'normal', color: isItemMatch ? '#6699ff' : '#eaeaea' }}>
                            {item.name}
                            {item.foundInRaid && <span style={{ marginLeft: '8px', color: '#ff4d4d', fontSize: '0.7em', border: '1px solid #ff4d4d', padding: '1px 3px', borderRadius: '3px' }}>FiR</span>}
                          </span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isTaskComplete ? (
                              <span style={{ color: '#00ff00', fontWeight: 'bold' }}>✓ Handed Over</span>
                            ) : (
                              <span style={{ color: hasEnough ? '#00ff00' : '#eaeaea', fontWeight: 'bold', width: '90px', textAlign: 'right' }}>
                                {stashCount.toLocaleString()} / {item.count.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function App() {
  const [trackedItems, setTrackedItems] = useState([]);
  const [globalItems, setGlobalItems] = useState([]);
  const [stationsData, setStationsData] = useState([]);
  const [tasksData, setTasksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('Hideout Stations');
  const tabs = ['Hideout Stations', 'Early Quests', 'Master Shopping List', 'Top Values'];
  
  const [stash, setStash] = useState(() => {
    const saved = localStorage.getItem('tarkov-tracker-stash-v2');
    return saved ? JSON.parse(saved) : {};
  });
  const [completedProjects, setCompletedProjects] = useState(() => {
    const saved = localStorage.getItem('tarkov-tracker-completed-v2');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('tarkov-tracker-stash-v2', JSON.stringify(stash));
  }, [stash]);

  useEffect(() => {
    localStorage.setItem('tarkov-tracker-completed-v2', JSON.stringify(completedProjects));
  }, [completedProjects]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(TARKOV_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: QUERY }),
        });
        const json = await response.json();
        processApiData(json.data);
      } catch (err) {
        setError('Failed to fetch data from tarkov.dev');
      }
    };
    fetchData();
  }, []);

  const processApiData = (data) => {
    const itemMap = new Map();
    const stationHierarchy = []; 
    const tasksHierarchy = []; 
    const allItemsArray = []; 

    const getHighestTraderPrice = (itemData) => {
      if (!itemData.sellFor) return 0;
      const traderPrices = itemData.sellFor.filter(s => s.vendor && s.vendor.name !== 'Flea Market').map(s => s.price);
      return traderPrices.length > 0 ? Math.max(...traderPrices) : 0;
    };

    if (data.items) {
      data.items.forEach(apiItem => {
        const price = apiItem.avg24hPrice || 0;
        const traderPrice = getHighestTraderPrice(apiItem);
        const bestPrice = Math.max(price, traderPrice);
        if (bestPrice > 0) {
          const squares = (apiItem.width || 1) * (apiItem.height || 1);
          allItemsArray.push({
            id: apiItem.id, name: apiItem.name, price: price, traderPrice: traderPrice, valuePerSquare: Math.round(bestPrice / squares)
          });
        }
      });
      setGlobalItems(allItemsArray);
    }

    const setupItemData = (reqItem) => {
      const itemId = reqItem.id;
      if (!itemMap.has(itemId)) {
        const price = reqItem.avg24hPrice || 0;
        const traderPrice = getHighestTraderPrice(reqItem);
        const bestPrice = Math.max(price, traderPrice);
        const squares = (reqItem.width || 1) * (reqItem.height || 1); 
        itemMap.set(itemId, { 
          id: itemId, name: reqItem.name, price: price, traderPrice: traderPrice, 
          squares: squares, valuePerSquare: Math.round(bestPrice / squares),
          foundInRaidRequired: false 
        });
      }
      return itemMap.get(itemId);
    };

    data.hideoutStations.forEach(station => {
      const currentStationObj = { name: station.name, levels: [] };
      station.levels.forEach(levelObj => {
        const levelNum = levelObj.level;
        const stationReqs = levelObj.stationLevelRequirements ? levelObj.stationLevelRequirements.map(req => ({ name: req.station.name, level: req.level })) : [];

        if (levelObj.itemRequirements && levelObj.itemRequirements.length > 0) {
          const levelItemsForHierarchy = []; 
          levelObj.itemRequirements.forEach(req => {
            setupItemData(req.item);
            levelItemsForHierarchy.push({ id: req.item.id, name: req.item.name, count: req.count });
          });
          currentStationObj.levels.push({ level: levelNum, items: levelItemsForHierarchy, stationReqs });
        }
      });
      if (currentStationObj.levels.length > 0) stationHierarchy.push(currentStationObj);
    });

    data.tasks.filter(task => task.minPlayerLevel <= 15).forEach(task => {
      const currentTaskItems = [];
      task.objectives.forEach(obj => {
        if (obj.item) {
          const itemData = setupItemData(obj.item);
          if (obj.foundInRaid) itemData.foundInRaidRequired = true;
          currentTaskItems.push({ id: obj.item.id, name: obj.item.name, count: obj.count, foundInRaid: obj.foundInRaid });
        }
      });
      if (currentTaskItems.length > 0) tasksHierarchy.push({ name: task.name, items: currentTaskItems });
    });

    setTrackedItems(Array.from(itemMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    setStationsData(stationHierarchy.sort((a, b) => a.name.localeCompare(b.name)));
    setTasksData(tasksHierarchy.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  };

  const updateStash = (itemId, newCount) => {
    setStash(prev => ({ ...prev, [itemId]: Math.max(0, newCount) }));
  };

  const handleBuild = (projectId, requiredItems, isBuilding) => {
    if (isBuilding) {
      setStash(prev => {
        const newStash = { ...prev };
        requiredItems.forEach(req => {
          newStash[req.id] = Math.max(0, (newStash[req.id] || 0) - req.count);
        });
        return newStash;
      });
      setCompletedProjects(prev => [...prev, projectId]);
    } else {
      setStash(prev => {
        const newStash = { ...prev };
        requiredItems.forEach(req => {
          newStash[req.id] = (newStash[req.id] || 0) + req.count;
        });
        return newStash;
      });
      setCompletedProjects(prev => prev.filter(id => id !== projectId));
    }
  };

  if (loading) return <div style={{ padding: '20px', color: 'white', backgroundColor: '#1e1e1e', minHeight: '100vh' }}>Loading Tarkov Data...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red', backgroundColor: '#1e1e1e', minHeight: '100vh' }}>{error}</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#1e1e1e', color: '#eaeaea', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h2>Tarkov Tracker Dashboard</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #444', paddingBottom: '15px', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', backgroundColor: activeTab === tab ? '#ff9900' : '#333',
              color: activeTab === tab ? 'black' : '#eaeaea', border: 'none', borderRadius: '4px',
              cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'background-color 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Hideout Stations' && <StationBreakdown stationsData={stationsData} stash={stash} handleBuild={handleBuild} completedProjects={completedProjects} />}
      {activeTab === 'Early Quests' && <TaskBreakdown tasksData={tasksData} stash={stash} handleBuild={handleBuild} completedProjects={completedProjects} />}
      {activeTab === 'Master Shopping List' && <ItemTable items={trackedItems} stash={stash} updateStash={updateStash} stationsData={stationsData} tasksData={tasksData} completedProjects={completedProjects} />}
      {activeTab === 'Top Values' && <TopValuesTab items={globalItems} />}

    </div>
  );
}

export default App;