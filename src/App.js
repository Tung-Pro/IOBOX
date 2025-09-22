import React, { useState, useEffect } from 'react';
import { Wifi, Cpu, Settings, Activity, Zap, Network } from 'lucide-react';
import ioboxAPI from './services/ioboxApi';
import DeviceInfo from './components/DeviceInfo';
import NetworkConfig from './components/NetworkConfig';
import IOMonitor from './components/IOMonitor';
import InputControl from './components/InputControl';
import LogicConfig from './components/LogicConfig';
import ConnectionSettings from './components/ConnectionSettings';

function App() {
  const [activeTab, setActiveTab] = useState('device');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [showConnectionSettings, setShowConnectionSettings] = useState(false);

  const tabs = [
    { id: 'device', label: 'Device Info', icon: Cpu },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'io', label: 'IO Monitor', icon: Activity },
    { id: 'control', label: 'Input Control', icon: Settings },
    { id: 'logic', label: 'Logic Config', icon: Zap },
  ];

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setConnectionError(null);
      const info = await ioboxAPI.getDeviceInfo();
      setDeviceInfo(info.info);
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
      setConnectionError(error.message);
      setDeviceInfo(null);
    }
  };

  const handleIPChange = (newIP) => {
    ioboxAPI.updateBaseURL(`http://${newIP}`);
    checkConnection();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'device':
        return <DeviceInfo deviceInfo={deviceInfo} onRefresh={checkConnection} />;
      case 'network':
        return <NetworkConfig />;
      case 'io':
        return <IOMonitor />;
      case 'control':
        return <InputControl />;
      case 'logic':
        return <LogicConfig />;
      default:
        return <DeviceInfo deviceInfo={deviceInfo} onRefresh={checkConnection} />;
    }
  };

  return (
    <div className="App">
      <nav className="navbar">
        <div className="container">
          <h1>
            <Cpu size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            IOBOX Controller
          </h1>
          <div className="device-info">
            {isConnected ? (
              <>
                <span className="status-indicator status-online"></span>
                {deviceInfo ? `${deviceInfo.Model} - ${deviceInfo.localIp}` : 'Connected'}
              </>
            ) : (
              <>
                <span className="status-indicator status-offline"></span>
                Disconnected
              </>
            )}
            <button 
              className="btn" 
              style={{ marginLeft: '15px', padding: '5px 10px', fontSize: '12px' }}
              onClick={() => setShowConnectionSettings(true)}
            >
              <Wifi size={14} style={{ marginRight: '5px' }} />
              Settings
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        {connectionError && (
          <div className="alert alert-error">
            <strong>Connection Error:</strong> {connectionError}
            <button className="btn" style={{ marginLeft: '10px' }} onClick={checkConnection}>
              Retry Connection
            </button>
          </div>
        )}

        <div className="tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <div
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                {tab.label}
              </div>
            );
          })}
        </div>

        <div className="tab-content active">
          {renderTabContent()}
        </div>
      </div>

      {showConnectionSettings && (
        <ConnectionSettings
          onClose={() => setShowConnectionSettings(false)}
          onIPChange={handleIPChange}
          currentIP="192.168.101.34"
        />
      )}
    </div>
  );
}

export default App;
