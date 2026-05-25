import { useState, useEffect } from 'react';
import './App.css';

const TARKOV_API = 'https://api.tarkov.dev/graphql';

const QUERY = `
  query {
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

// --- Master Shopping List (Read-Only Summary) ---
const ItemTable = ({ items, progress, completedProjects, consumedCounts }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ marginBottom: '40px', animation: 'fadeIn 0.3s' }}>
      <p style={{ color: '#aaa', marginBottom: '15px' }}>
        <em>This is your Master Shopping List. Items used in Completed stations/quests are removed from these totals.</em>
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
            <th style={{ padding: '10px', textAlign: 'center' }}>Pending Gathered</th>
            <th style={{ padding: '10px' }}>Remaining Hideout Need</th>
            <th style={{ padding: '10px' }}>Remaining Task Need</th>
            <th style={{ padding: '10px' }}>Flea Value</th>
            <th style={{ padding: '10px' }}>Trader Value</th>
            <th style={{ padding: '10px', color: '#ff9900' }}>Value / Square</th>
            <th style={{ padding: '10px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map(item => {
            const consumed = consumedCounts[item.id] || { hideout: 0, quest: 0 };
            const activeHideoutNeed = Math.max(0, item.hideoutNeeded - consumed.hideout);
            const activeQuestNeed = Math.max(0, item.questNeeded - consumed.quest);
            const totalNeeded = activeHideoutNeed + activeQuestNeed;

            const activeGathered = Object.entries(progress).reduce((sum, [key, count]) => {
              if (!key.endsWith(`_${item.id}`)) return sum;
              const projectPrefix = key.substring(0, key.lastIndexOf('_'));
              if (completedProjects.has(projectPrefix)) return sum; 
              return sum + count;
            }, 0);

            const hasEnough = activeGathered >= totalNeeded && totalNeeded > 0;
            const isHighValue = item.price > 40000 || item.traderPrice > 40000;
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
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: hasEnough ? '#00ff00' : '#eaeaea' }}>
                    {activeGathered} / {totalNeeded}
                  </span>
                </td>

                <td style={{ padding: '10px' }}>{activeHideoutNeed > 0 ? activeHideoutNeed : '-'}</td>
                <td style={{ padding: '10px' }}>{activeQuestNeed > 0 ? activeQuestNeed : '-'}</td>
                <td style={{ padding: '10px', color: '#eaeaea' }}>₽{item.price.toLocaleString()}</td>
                <td style={{ padding: '10px', color: isTraderHigher ? '#00ff00' : '#aaa', fontWeight: isTraderHigher ? 'bold' : 'normal' }}>
                  ₽{item.traderPrice.toLocaleString()}
                </td>
                
                <td style={{ padding: '10px', color: '#ff9900', fontWeight: 'bold' }}>
                  ₽{item.valuePerSquare.toLocaleString()}
                </td>

                <td style={{ padding: '10px' }}>
                  {(isHighValue && activeGathered >= totalNeeded) || (isHighValue && totalNeeded === 0) ? (
                    <span style={{ backgroundColor: '#ff9900', color: 'black', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {isTraderHigher ? 'SELL (Trader)' : 'SELL (Flea)'}
                    </span>
                  ) : activeGathered < totalNeeded ? (
                    <span style={{ backgroundColor: '#3366cc', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>KEEP</span>
                  ) : (
                    <span style={{ color: '#888' }}>Done</span>
                  )}
                </td>
              </tr>
            );
          })}
          {filteredItems.length === 0 && (
            <tr>
              <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                No items found matching "{searchTerm}"
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// --- Hideout Station Allocation View ---
const StationBreakdown = ({ stationsData, progress, updateProgress, completedProjects }) => {
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
        placeholder="Search for a station or item (e.g., Corrugated hose)..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#222', color: '#eaeaea', fontSize: '16px', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredStations.map(station => {
          const isExpanded = expanded[station.name];
          const allLevelsComplete = station.levels.length > 0 && station.levels.every(lvl => completedProjects.has(`hideout_${station.name}_${lvl.level}`));
          
          // Determine if the next available level for this station is currently locked
          const nextLevel = station.levels.find(lvl => !completedProjects.has(`hideout_${station.name}_${lvl.level}`));
          let isStationLocked = false;
          let missingReqs = [];
          
          if (nextLevel) {
            missingReqs = nextLevel.stationReqs.filter(req => !completedProjects.has(`hideout_${req.name}_${req.level}`));
            isStationLocked = missingReqs.length > 0;
          }

          // Darken background if completed OR if currently locked
          const cardBg = allLevelsComplete ? '#111' : (isStationLocked ? '#1a1a1a' : '#222');
          
          // Determine Title Color
          let titleColor = '#ff9900'; // Default Bright Orange
          if (allLevelsComplete) titleColor = '#666'; // Gray out if done
          else if (isStationLocked) titleColor = '#885522'; // Darken to muted brown/orange if locked

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
                  {/* Show Locked Warning right under the station title */}
                  {isStationLocked && (
                    <span style={{ fontSize: '0.85em', color: '#a85c5c', display: 'block', marginTop: '6px' }}>
                      Locked - Needs: {missingReqs.map(r => `${r.name} Lv${r.level}`).join(', ')}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '1.5em', color: '#aaa', fontWeight: 'bold', marginLeft: '10px' }}>{isExpanded ? '-' : '+'}</span>
              </div>
              
              {isExpanded && station.levels.map(lvl => {
                const isLevelComplete = completedProjects.has(`hideout_${station.name}_${lvl.level}`);
                const levelMissingReqs = lvl.stationReqs.filter(req => !completedProjects.has(`hideout_${req.name}_${req.level}`));
                const isLevelLocked = levelMissingReqs.length > 0 && !isLevelComplete;
                
                let headerColor = '#aaa';
                if (isLevelComplete) headerColor = '#666';
                if (isLevelLocked) headerColor = '#a85c5c'; 

                return (
                  <div key={lvl.level} style={{ 
                    marginBottom: '15px', 
                    opacity: isLevelComplete ? 0.4 : 1, 
                    transition: 'all 0.3s' 
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', color: headerColor }}>
                      Level {lvl.level} 
                      {isLevelComplete && <span style={{fontSize: '0.8em', color: '#00ff00', marginLeft: '8px'}}>(Built)</span>}
                    </h4>

                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                      {lvl.items.map(item => {
                        const progressKey = `hideout_${station.name}_${lvl.level}_${item.id}`;
                        const allocatedCount = progress[progressKey] || 0;
                        const hasEnough = allocatedCount >= item.count;
                        const isItemMatch = searchTerm && item.name.toLowerCase().includes(searchTerm.toLowerCase());

                        return (
                          <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '5px', backgroundColor: hasEnough ? '#1a331a' : (isItemMatch ? '#4a3b1a' : 'transparent'), borderRadius: '4px', border: isItemMatch ? '1px solid #ff9900' : 'none' }}>
                            <span style={{ flex: 1, fontWeight: isItemMatch ? 'bold' : 'normal', color: isItemMatch ? '#ff9900' : '#eaeaea' }}>{item.name}</span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button onClick={() => updateProgress(progressKey, -1)} style={{ backgroundColor: '#444', color: 'white', border: 'none', padding: '2px 8px', cursor: 'pointer', borderRadius: '4px' }}>-</button>
                              <span style={{ color: hasEnough ? '#00ff00' : '#eaeaea', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>
                                {allocatedCount} / {item.count}
                              </span>
                              <button onClick={() => updateProgress(progressKey, 1, item.count)} style={{ backgroundColor: '#444', color: 'white', border: 'none', padding: '2px 8px', cursor: 'pointer', borderRadius: '4px' }}>+</button>
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
const TaskBreakdown = ({ tasksData, progress, updateProgress, completedProjects }) => {
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
        placeholder="Search for a quest or item (e.g., Gas analyzer)..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#222', color: '#eaeaea', fontSize: '16px', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredTasks.map(task => {
          const isExpanded = expanded[task.name];
          const isTaskComplete = completedProjects.has(`quest_${task.name}`);
          const cardBg = isTaskComplete ? '#111' : '#222';
          const titleColor = isTaskComplete ? '#666' : '#3366cc';

          return (
            <div key={task.name} style={{ backgroundColor: cardBg, borderRadius: '8px', padding: '15px', border: '1px solid #444', opacity: isTaskComplete ? 0.6 : 1, transition: 'all 0.3s' }}>
              <div 
                onClick={() => toggle(task.name)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #444' : 'none', paddingBottom: isExpanded ? '10px' : '0', marginBottom: isExpanded ? '15px' : '0' }}
              >
                <h3 style={{ margin: 0, color: titleColor, textDecoration: isTaskComplete ? 'line-through' : 'none' }}>
                  {task.name} {isTaskComplete && <span style={{fontSize: '0.6em', color: '#00ff00', textDecoration: 'none'}}>(Turned In)</span>}
                </h3>
                <span style={{ fontSize: '1.5em', color: '#aaa', fontWeight: 'bold' }}>{isExpanded ? '-' : '+'}</span>
              </div>
              
              {isExpanded && (
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                  {task.items.map(item => {
                    const progressKey = `quest_${task.name}_${item.id}`;
                    const allocatedCount = progress[progressKey] || 0;
                    const hasEnough = allocatedCount >= item.count;
                    const isItemMatch = searchTerm && item.name.toLowerCase().includes(searchTerm.toLowerCase());

                    return (
                      <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '5px', backgroundColor: hasEnough ? '#1a331a' : (isItemMatch ? '#283655' : 'transparent'), borderRadius: '4px', border: isItemMatch ? '1px solid #3366cc' : 'none' }}>
                        <span style={{ flex: 1, fontWeight: isItemMatch ? 'bold' : 'normal', color: isItemMatch ? '#6699ff' : '#eaeaea' }}>
                          {item.name}
                          {item.foundInRaid && <span style={{ marginLeft: '8px', color: '#ff4d4d', fontSize: '0.7em', border: '1px solid #ff4d4d', padding: '1px 3px', borderRadius: '3px' }}>FiR</span>}
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => updateProgress(progressKey, -1)} style={{ backgroundColor: '#444', color: 'white', border: 'none', padding: '2px 8px', cursor: 'pointer', borderRadius: '4px' }}>-</button>
                          <span style={{ color: hasEnough ? '#00ff00' : '#eaeaea', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>
                            {allocatedCount} / {item.count}
                          </span>
                          <button onClick={() => updateProgress(progressKey, 1, item.count)} style={{ backgroundColor: '#444', color: 'white', border: 'none', padding: '2px 8px', cursor: 'pointer', borderRadius: '4px' }}>+</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
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
  const [stationsData, setStationsData] = useState([]);
  const [tasksData, setTasksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('Hideout Stations');
  const tabs = ['Hideout Stations', 'Early Quests', 'Master Shopping List'];
  
  const [progress, setProgress] = useState(() => {
    const savedProgress = localStorage.getItem('tarkov-progress');
    return savedProgress ? JSON.parse(savedProgress) : {};
  });

  useEffect(() => {
    localStorage.setItem('tarkov-progress', JSON.stringify(progress));
  }, [progress]);

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
        console.error(err);
      }
    };

    fetchData();
  }, []);

  const processApiData = (data) => {
    const itemMap = new Map();
    const stationHierarchy = []; 
    const tasksHierarchy = []; 

    const getHighestTraderPrice = (itemData) => {
      if (!itemData.sellFor) return 0;
      const traderPrices = itemData.sellFor
        .filter(s => s.vendor && s.vendor.name !== 'Flea Market')
        .map(s => s.price);
      return traderPrices.length > 0 ? Math.max(...traderPrices) : 0;
    };

    const setupItemData = (reqItem) => {
      const itemId = reqItem.id;
      if (!itemMap.has(itemId)) {
        const price = reqItem.avg24hPrice || 0;
        const traderPrice = getHighestTraderPrice(reqItem);
        const bestPrice = Math.max(price, traderPrice);
        const squares = (reqItem.width || 1) * (reqItem.height || 1); 
        const valuePerSquare = Math.round(bestPrice / squares);

        itemMap.set(itemId, { 
          id: itemId, name: reqItem.name, price: price, traderPrice: traderPrice, 
          squares: squares, valuePerSquare: valuePerSquare,
          hideoutNeeded: 0, questNeeded: 0, foundInRaidRequired: false 
        });
      }
      return itemMap.get(itemId);
    };

    data.hideoutStations.forEach(station => {
      const currentStationObj = { name: station.name, levels: [] };

      station.levels.forEach(levelObj => {
        const levelNum = levelObj.level;
        
        const stationReqs = levelObj.stationLevelRequirements ? levelObj.stationLevelRequirements.map(req => ({
          name: req.station.name,
          level: req.level
        })) : [];

        if (levelObj.itemRequirements && levelObj.itemRequirements.length > 0) {
          const levelItemsForHierarchy = []; 
          levelObj.itemRequirements.forEach(req => {
            const itemData = setupItemData(req.item);
            itemData.hideoutNeeded += req.count;
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
          itemData.questNeeded += obj.count;
          if (obj.foundInRaid) itemData.foundInRaidRequired = true;
          currentTaskItems.push({ id: obj.item.id, name: obj.item.name, count: obj.count, foundInRaid: obj.foundInRaid });
        }
      });
      if (currentTaskItems.length > 0) tasksHierarchy.push({ name: task.name, items: currentTaskItems });
    });

    const combinedList = Array.from(itemMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    setTrackedItems(combinedList);
    stationHierarchy.sort((a, b) => a.name.localeCompare(b.name));
    setStationsData(stationHierarchy);
    tasksHierarchy.sort((a, b) => a.name.localeCompare(b.name));
    setTasksData(tasksHierarchy);
    setLoading(false);
  };

  const updateProgress = (key, amount, maxLimit) => {
    setProgress(prev => {
      const currentCount = prev[key] || 0;
      let newCount = currentCount + amount;
      if (newCount < 0) newCount = 0;
      if (maxLimit !== undefined && newCount > maxLimit) newCount = maxLimit;
      return { ...prev, [key]: newCount };
    });
  };

  if (loading) return <div style={{ padding: '20px', color: 'white', backgroundColor: '#1e1e1e', minHeight: '100vh' }}>Loading Tarkov Data...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red', backgroundColor: '#1e1e1e', minHeight: '100vh' }}>{error}</div>;

  const completedProjects = new Set();
  const consumedCounts = {}; 

  stationsData.forEach(station => {
    station.levels.forEach(lvl => {
      const projectKey = `hideout_${station.name}_${lvl.level}`;
      const isComplete = lvl.items.length > 0 && lvl.items.every(item => (progress[`${projectKey}_${item.id}`] || 0) >= item.count);
      
      if (isComplete) {
        completedProjects.add(projectKey);
        lvl.items.forEach(item => {
          if (!consumedCounts[item.id]) consumedCounts[item.id] = { hideout: 0, quest: 0 };
          consumedCounts[item.id].hideout += item.count;
        });
      }
    });
  });

  tasksData.forEach(task => {
    const projectKey = `quest_${task.name}`;
    const isComplete = task.items.length > 0 && task.items.every(item => (progress[`${projectKey}_${item.id}`] || 0) >= item.count);
    
    if (isComplete) {
      completedProjects.add(projectKey);
      task.items.forEach(item => {
        if (!consumedCounts[item.id]) consumedCounts[item.id] = { hideout: 0, quest: 0 };
        consumedCounts[item.id].quest += item.count;
      });
    }
  });

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

      {activeTab === 'Hideout Stations' && <StationBreakdown stationsData={stationsData} progress={progress} updateProgress={updateProgress} completedProjects={completedProjects} />}
      {activeTab === 'Early Quests' && <TaskBreakdown tasksData={tasksData} progress={progress} updateProgress={updateProgress} completedProjects={completedProjects} />}
      {activeTab === 'Master Shopping List' && <ItemTable items={trackedItems} progress={progress} completedProjects={completedProjects} consumedCounts={consumedCounts} />}

    </div>
  );
}

export default App;