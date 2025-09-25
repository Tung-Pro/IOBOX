import React, { useState, useEffect } from 'react';
import { Layout, Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ioboxAPI from './services/ioboxApi';
import DeviceInfo from './components/DeviceInfo';
import NetworkConfig from './components/NetworkConfig';
import IOPanel from './components/IOPanel';
import LogicConfig from './components/LogicConfig';
import ConnectionSettings from './components/ConnectionSettings';
import Sidebar from './components/Sidebar';

function App() {
  const [activeTab, setActiveTab] = useState('device');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [showConnectionSettings, setShowConnectionSettings] = useState(false);


  useEffect(() => {
    const url = ioboxAPI.getBaseURL();
    if (url) {
      checkConnection();
    } else {
      setShowConnectionSettings(true);
    }
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
    ioboxAPI.updateBaseURL(newIP);
    checkConnection();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'device':
        return <DeviceInfo deviceInfo={deviceInfo} onRefresh={checkConnection} />;
      case 'network':
        return <NetworkConfig />;
      case 'io':
        return <IOPanel />;
      case 'control':
        return <IOPanel />;
      case 'logic':
        return <LogicConfig />;
      default:
        return <DeviceInfo deviceInfo={deviceInfo} onRefresh={checkConnection} />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        deviceInfo={deviceInfo}
        onSettingsClick={() => setShowConnectionSettings(true)}
      />
      
      <Layout style={{ marginLeft: 250 }}>
        <Layout.Content style={{ padding: '24px', background: '#f5f5f5' }}>
          {connectionError && (
            <Alert
              message="Connection Error"
              description={connectionError}
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
              action={
                <Button 
                  size="small" 
                  icon={<ReloadOutlined />}
                  onClick={checkConnection}
                >
                  Retry
                </Button>
              }
            />
          )}

          <div style={{ 
            background: '#fff', 
            padding: '24px', 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            minHeight: 'calc(100vh - 120px)'
          }}>
            {renderTabContent()}
          </div>
        </Layout.Content>
      </Layout>

      {showConnectionSettings && (
        <ConnectionSettings
          onClose={() => setShowConnectionSettings(false)}
          onIPChange={handleIPChange}
          currentIP={ioboxAPI.getBaseURL()}
        />
      )}
    </Layout>
  );
}

export default App;
