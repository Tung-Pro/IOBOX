import React, { useEffect, useState, useCallback } from 'react';
import { Button, Alert, Select, Switch, Spin } from 'antd';
import { AppstoreOutlined, ReloadOutlined, ThunderboltOutlined, DashboardOutlined, ControlOutlined } from '@ant-design/icons';
import ioboxAPI from '../services/ioboxApi';

const IOPanel = () => {
  const [ioData, setIOData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(1500);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sending, setSending] = useState({});
  const [message, setMessage] = useState(null);

  const loadIOData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ioboxAPI.getIOStatus('all');
      setIOData(data.io);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load saved auto-refresh settings (persisted via ioboxAPI)
  useEffect(() => {
    const saved = ioboxAPI.getAutoRefreshSettings({ autoRefresh: false, refreshInterval: 1500 });
    setAutoRefresh(Boolean(saved.autoRefresh));
    setRefreshInterval(Number(saved.refreshInterval) || 1500);
  }, []);

  useEffect(() => {
    loadIOData();
  }, [loadIOData]);

  useEffect(() => {
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(loadIOData, refreshInterval);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, loadIOData]);

  const getIOIcon = (type) => {
    switch (type) {
      case 'AI': return DashboardOutlined;
      case 'DI': return ControlOutlined;
      case 'AIB': return ControlOutlined;
      case 'SI': return ControlOutlined;
      case 'DO': return ThunderboltOutlined;
      default: return AppstoreOutlined;
    }
  };

  const getIOColor = (type, value) => {
    if (type === 'AI') return '#3498db';
    if (Array.isArray(value)) {
      return value.some(v => v === 1) ? '#27ae60' : '#e74c3c';
    }
    return value === 1 ? '#27ae60' : '#e74c3c';
  };

  // removed old formatValue helper

  const Dot = ({ color }) => (
    <span style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: 9999,
      background: color,
      boxShadow: `0 0 0 3px ${color}22`
    }} />
  );

  const chipClass = (active) => `badge ${active ? 'badge-success' : 'badge-error'}`;

  const sectionCardClass = 'section-card';

  const handleDirectToggle = async (type, index) => {
    // Only allow toggling for AIB and SI
    if (type !== 'AIB' && type !== 'SI') return;
    
    if (!ioData) return;
    
    const key = `${type}-${index}`;
    if (sending[key]) return; // Prevent multiple clicks while sending
    
    setSending(prev => ({ ...prev, [key]: true }));
    setMessage(null);
    
    try {
      const currentValue = ioData[type][index];
      const newValue = currentValue === 1 ? 0 : 1;
      
      await ioboxAPI.controlInput(type, [index + 1], [newValue]);
      setMessage({ type: 'success', text: `${type}${index + 1} set to ${newValue === 1 ? 'ON' : 'OFF'}` });
      
      // Refresh data after a short delay
      setTimeout(loadIOData, 300);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSending(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  };

  const renderIOGroup = (type, values, title, description) => {
    const Icon = getIOIcon(type);
    const color = getIOColor(type, values);
    const isControllable = type === 'AIB' || type === 'SI';

    return (
      <div key={type} className={sectionCardClass}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <Icon size={18} style={{ color }} />
            <h4 style={{ margin: 0, color: '#111827', fontSize: 14 }}>{title}</h4>
          </div>
          {type !== 'AI' && (
            <span className="muted-text" style={{ fontSize: 12 }}>{description}</span>
          )}
        </div>

        {type === 'AI' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {[0, 1].map((idx) => {
              const val = Array.isArray(values) ? values[idx] : (idx === 0 ? values : null);
              const vNum = typeof val === 'number' ? val : Number(val);
              const barWidth = Number.isFinite(vNum)
                ? Math.min(100, Math.max(0, vNum * 20))
                : 0;
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{`AI${idx + 1}`}</span>
                    <Dot color={color} />
                    <span style={{ fontFamily: 'monospace', color: '#111827', fontWeight: 600 }}>
                      {Number.isFinite(vNum) ? vNum.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#f3f4f6', borderRadius: 9999 }}>
                    <div style={{
                      height: 8,
                      width: `${barWidth}%`,
                      background: color,
                      borderRadius: 9999
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            {values.map((val, index) => {
              const key = `${type}-${index}`;
              const isSending = sending[key];
              return (
                <div 
                  key={index} 
                  onClick={() => isControllable && handleDirectToggle(type, index)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '8px 10px', 
                    border: '1px solid #eef2f7',
                    borderRadius: 10, 
                    background: '#fafbfd',
                    cursor: isControllable ? (isSending ? 'wait' : 'pointer') : 'default',
                    opacity: isSending ? 0.6 : 1,
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  title={isControllable ? `Click to toggle ${type}${index + 1}` : undefined}
                >
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{type}{index + 1}</span>
                  <span className={chipClass(val === 1)}>
                    {isSending ? (
                      <Spin size="small" />
                    ) : (
                      <>
                        <Dot color={val === 1 ? '#16a34a' : '#ef4444'} />
                        {val === 1 ? 'ON' : 'OFF'}
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="card">
        <h2>
          <AppstoreOutlined style={{ marginRight: 10, verticalAlign: 'middle' }} />
          IO Monitor & Control
        </h2>
        <Alert
          type="error"
          message="Error"
          description={error}
          action={<Button size="small" onClick={loadIOData}>Retry</Button>}
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
          <div className="row" style={{ gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e8f4fd', display: 'grid', placeItems: 'center' }}>
              <AppstoreOutlined style={{ fontSize: 18, color: '#0ea5e9' }} />
            </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: '#111827' }}>Status</h2>
            <div className="muted-text" style={{ fontSize: 12 }}>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</div>
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: 10, padding: '6px 10px', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#111827' }}>Auto refresh</span>
            <Switch
              size="small"
              checked={autoRefresh}
              onChange={(checked) => {
                setAutoRefresh(checked);
                ioboxAPI.setAutoRefreshEnabled(checked);
              }}
            />
            {autoRefresh && (
              <Select
                size="small"
                value={refreshInterval}
                onChange={(val) => {
                  const num = Number(val);
                  setRefreshInterval(num);
                  ioboxAPI.setAutoRefreshInterval(num);
                }}
                style={{ width: 90 }}
                options={[
                  { value: 1500, label: '1.5s' },
                  { value: 2000, label: '2s' },
                  { value: 5000, label: '5s' },
                  { value: 10000, label: '10s' }
                ]}
              />
            )}
          </div>
          <Button 
            type="primary" 
            icon={<ReloadOutlined spin={loading} />}
            onClick={loadIOData} 
            loading={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading && !ioData ? (
        <div className="loading" style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <Spin tip="Loading IO data..." />
        </div>
      ) : ioData ? (
        <>
          <div className="io-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: 12 }}>
            {renderIOGroup('AI', ioData.AI, 'Analog Input', '2 channels - Voltage/Current measurement')}
            {renderIOGroup('DI', ioData.DI, 'Digital Input', '4 channels - Digital input states')}
            {renderIOGroup('AIB', ioData.AIB, 'AIBox Input', '4 channels - Click to toggle')}
            {renderIOGroup('SI', ioData.SI, 'System Input', '4 channels - Click to toggle')}
            {renderIOGroup('DO', ioData.DO, 'Digital Output', '4 channels - Digital output states')}
          </div>

          {message && (
            <Alert style={{ marginTop: 12 }} type={message.type === 'warning' ? 'warning' : message.type === 'success' ? 'success' : 'error'} message={message.text} showIcon />
          )}
        </>
      ) : (
        <div className="loading">No IO data available</div>
      )}
    </div>
  );
};

export default IOPanel;


