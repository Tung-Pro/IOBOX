import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Zap, Gauge, ToggleLeft, ToggleRight } from 'lucide-react';
import ioboxAPI from '../services/ioboxApi';

const IOMonitor = () => {
  const [ioData, setIOData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadIOData();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadIOData, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const loadIOData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ioboxAPI.getIOStatus('all');
      setIOData(data.io);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getIOIcon = (type) => {
    switch (type) {
      case 'AI': return Gauge;
      case 'DI': return ToggleLeft;
      case 'AIB': return ToggleRight;
      case 'SI': return ToggleRight;
      case 'DO': return Zap;
      default: return Activity;
    }
  };

  const getIOColor = (type, value) => {
    if (type === 'AI') return '#3498db'; // Blue for analog
    if (Array.isArray(value)) {
      return value.some(v => v === 1) ? '#27ae60' : '#e74c3c'; // Green if any ON, red if all OFF
    }
    return value === 1 ? '#27ae60' : '#e74c3c'; // Green for ON, red for OFF
  };

  const formatValue = (type, value) => {
    if (type === 'AI') {
      return Array.isArray(value) ? value.map(v => v.toFixed(2)).join(', ') : value.toFixed(2);
    }
    if (Array.isArray(value)) {
      return value.map(v => v === 1 ? 'ON' : 'OFF').join(', ');
    }
    return value === 1 ? 'ON' : 'OFF';
  };

  const renderIOGroup = (type, values, title, description) => {
    const Icon = getIOIcon(type);
    const color = getIOColor(type, values);
    
    return (
      <div key={type} className="io-item">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <Icon size={20} style={{ marginRight: '8px', color: color }} />
          <h4 style={{ margin: 0, color: '#495057' }}>{title}</h4>
        </div>
        <div className="io-value" style={{ color: color }}>
          {formatValue(type, values)}
        </div>
        <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '10px' }}>
          {description}
        </div>
        {Array.isArray(values) && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {values.map((val, index) => (
              <span 
                key={index}
                style={{
                  background: val === 1 ? '#27ae60' : '#e74c3c',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}
              >
                {type === 'AI' ? val.toFixed(2) : (val === 1 ? 'ON' : 'OFF')}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="card">
        <h2>
          <Activity size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          IO Monitor
        </h2>
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
          <button className="btn" style={{ marginLeft: '10px' }} onClick={loadIOData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>
          <Activity size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          IO Monitor
        </h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Auto Refresh
          </label>
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{ padding: '5px', fontSize: '12px' }}
            >
              <option value={500}>0.5s</option>
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
            </select>
          )}
          <button className="btn" onClick={loadIOData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} style={{ marginRight: '8px' }} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && !ioData ? (
        <div className="loading">Loading IO data...</div>
      ) : ioData ? (
        <>
          <div className="io-grid">
            {renderIOGroup('AI', ioData.AI, 'Analog Input', '1 channel - Voltage/Current measurement')}
            {renderIOGroup('DI', ioData.DI, 'Digital Input', '4 channels - Digital input states')}
            {renderIOGroup('AIB', ioData.AIB, 'AIBox Input', '4 channels - Controllable input states')}
            {renderIOGroup('SI', ioData.SI, 'System Input', '4 channels - System input states')}
            {renderIOGroup('DO', ioData.DO, 'Digital Output', '4 channels - Digital output states')}
          </div>

          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#e8f4fd', 
            border: '1px solid #bee5eb', 
            borderRadius: '4px',
            color: '#0c5460'
          }}>
            <strong>Legend:</strong>
            <ul style={{ margin: '10px 0 0 20px' }}>
              <li><strong>AI (Analog Input):</strong> Continuous voltage/current measurement</li>
              <li><strong>DI (Digital Input):</strong> Read-only digital input states</li>
              <li><strong>AIB (AIBox Input):</strong> Controllable input states</li>
              <li><strong>SI (System Input):</strong> System-level input states</li>
              <li><strong>DO (Digital Output):</strong> Digital output control</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="loading">No IO data available</div>
      )}
    </div>
  );
};

export default IOMonitor;
