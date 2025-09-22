import React, { useState } from 'react';
import { RefreshCw, Cpu, Hash, Wifi, Globe, Layers } from 'lucide-react';

const DeviceInfo = ({ deviceInfo, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!deviceInfo) {
    return (
      <div className="card">
        <h2>
          <Cpu size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Device Information
        </h2>
        <div className="loading">
          <p>No device information available. Please check your connection.</p>
          <button className="btn" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} style={{ marginRight: '8px' }} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    );
  }

  const infoItems = [
    {
      icon: Cpu,
      label: 'Model',
      value: deviceInfo.Model,
      description: 'Device model name'
    },
    {
      icon: Hash,
      label: 'Serial Number',
      value: deviceInfo.Serial,
      description: 'Device serial number'
    },
    {
      icon: Cpu,
      label: 'MCU Serial',
      value: deviceInfo.SerialMcu,
      description: 'Microcontroller serial number'
    },
    {
      icon: Layers,
      label: 'Hardware Version',
      value: deviceInfo.HwVer,
      description: 'Hardware version'
    },
    {
      icon: Layers,
      label: 'Firmware Version',
      value: deviceInfo.FwVer,
      description: 'Main firmware version'
    },
    {
      icon: Layers,
      label: 'MCU Firmware',
      value: deviceInfo.McuFwVer,
      description: 'MCU firmware version'
    },
    {
      icon: Wifi,
      label: 'MAC Address',
      value: deviceInfo.macAddr,
      description: 'Device MAC address'
    },
    {
      icon: Globe,
      label: 'Local IP',
      value: deviceInfo.localIp,
      description: 'Current IP address'
    }
  ];

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>
          <Cpu size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Device Information
        </h2>
        <button className="btn" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} style={{ marginRight: '8px' }} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-2">
        {infoItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="info-item" style={{ 
              background: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '6px', 
              border: '1px solid #e9ecef' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <Icon size={18} style={{ marginRight: '10px', color: '#3498db' }} />
                <strong style={{ color: '#2c3e50' }}>{item.label}</strong>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '5px', color: '#495057' }}>
                {item.value}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                {item.description}
              </div>
            </div>
          );
        })}
      </div>

      {deviceInfo.socks && deviceInfo.socks.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '10px', color: '#2c3e50' }}>Available Sockets</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {deviceInfo.socks.map((socket, index) => (
              <span 
                key={index}
                style={{
                  background: '#3498db',
                  color: 'white',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                Socket {socket}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceInfo;
