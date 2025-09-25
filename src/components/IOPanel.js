import React, { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, Zap, Gauge, ToggleLeft, ToggleRight, Settings, Send, Check, X } from 'lucide-react';
import ioboxAPI from '../services/ioboxApi';

const IOPanel = () => {
  const [ioData, setIOData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [selectedType, setSelectedType] = useState('AIB');
  const [controls, setControls] = useState({ AIB: [0, 0, 0, 0], SI: [0, 0, 0, 0] });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasPendingEdits, setHasPendingEdits] = useState(false);

  const loadIOData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ioboxAPI.getIOStatus('all');
      setIOData(data.io);
      if (!hasPendingEdits && !sending) {
        setControls({
          AIB: (data.io && data.io.AIB) || [0, 0, 0, 0],
          SI: (data.io && data.io.SI) || [0, 0, 0, 0]
        });
      }
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hasPendingEdits, sending]);

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
      case 'AI': return Gauge;
      case 'DI': return ToggleLeft;
      case 'AIB': return ToggleRight;
      case 'SI': return ToggleRight;
      case 'DO': return Zap;
      default: return Activity;
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

  const chipStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    color: active ? '#155724' : '#721c24',
    background: active ? '#d4edda' : '#f8d7da',
    border: `1px solid ${active ? '#c3e6cb' : '#f5c6cb'}`
  });

  const sectionCard = {
    background: '#ffffff',
    border: '1px solid #eef2f7',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 1px 2px rgba(16,24,40,0.04)'
  };

  const renderIOGroup = (type, values, title, description) => {
    const Icon = getIOIcon(type);
    const color = getIOColor(type, values);

    return (
      <div key={type} style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon size={18} style={{ color }} />
            <h4 style={{ margin: 0, color: '#111827', fontSize: 14 }}>{title}</h4>
          </div>
          {type !== 'AI' && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>{description}</span>
          )}
        </div>

        {type === 'AI' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>AI1</span>
              <Dot color={color} />
              <span style={{ fontFamily: 'monospace', color: '#111827', fontWeight: 600 }}>
                {Array.isArray(values) ? values[0]?.toFixed?.(2) ?? values[0] : (typeof values === 'number' ? values.toFixed(2) : values)}
              </span>
            </div>
            <div style={{ height: 8, background: '#f3f4f6', borderRadius: 9999 }}>
              <div style={{
                height: 8,
                width: `${Math.min(100, Math.max(0, (Array.isArray(values) ? Number(values[0]) : Number(values)) * 20))}%`,
                background: color,
                borderRadius: 9999
              }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            {values.map((val, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: '1px solid #eef2f7', borderRadius: 10, background: '#fafbfd' }}>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{type}{index + 1}</span>
                <span style={chipStyle(val === 1)}>
                  <Dot color={val === 1 ? '#16a34a' : '#ef4444'} />
                  {val === 1 ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleToggle = (type, index) => {
    setControls(prev => ({
      ...prev,
      [type]: prev[type].map((val, i) => i === index ? (val === 1 ? 0 : 1) : val)
    }));
    setHasPendingEdits(true);
  };

  const handleSetAll = (type, value) => {
    setControls(prev => ({
      ...prev,
      [type]: [value, value, value, value]
    }));
    setHasPendingEdits(true);
  };

  const handleSend = async () => {
    if (!ioData) return;
    setSending(true);
    setMessage(null);
    try {
      const currentValues = controls[selectedType];
      const indices = [];
      const values = [];

      const originalValues = ioData[selectedType] || [0, 0, 0, 0];
      currentValues.forEach((val, index) => {
        if (val !== originalValues[index]) {
          indices.push(index + 1);
          values.push(val);
        }
      });

      if (indices.length === 0) {
        setMessage({ type: 'warning', text: 'No changes to send' });
        return;
      }

      await ioboxAPI.controlInput(selectedType, indices, values);
      setMessage({ type: 'success', text: `Successfully updated ${indices.length} ${selectedType} input(s)` });
      setHasPendingEdits(false);
      setTimeout(loadIOData, 500);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSending(false);
    }
  };

  if (error) {
    return (
      <div className="card">
        <h2>
          <Activity size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          IO Monitor & Control
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
    <div className="card" style={{ borderRadius: 16, border: '1px solid #eef2f7', boxShadow: '0 2px 6px rgba(16,24,40,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e8f4fd', display: 'grid', placeItems: 'center' }}>
            <Activity size={18} color="#0ea5e9" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: '#111827' }}>Status</h2>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: 10, padding: '6px 10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#111827' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto refresh
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                style={{ padding: '4px 8px', fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' }}
              >
                <option value={500}>0.5s</option>
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
                <option value={5000}>5s</option>
              </select>
            )}
          </div>
          <button className="btn" onClick={loadIOData} disabled={loading} style={{ borderRadius: 10 }}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} style={{ marginRight: 8 }} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && !ioData ? (
        <div className="loading">Loading IO data...</div>
      ) : ioData ? (
        <>
          <div className="io-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: 12 }}>
            {renderIOGroup('AI', ioData.AI, 'Analog Input', '1 channel - Voltage/Current measurement')}
            {renderIOGroup('DI', ioData.DI, 'Digital Input', '4 channels - Digital input states')}
            {renderIOGroup('AIB', ioData.AIB, 'AIBox Input', '4 channels - Controllable input states')}
            {renderIOGroup('SI', ioData.SI, 'System Input', '4 channels - System input states')}
            {renderIOGroup('DO', ioData.DO, 'Digital Output', '4 channels - Digital output states')}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 12px' }}>
            <h3 style={{ margin: 0 }}>
              <Settings size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Input Control
            </h3>
            <div>
              <button
                className={`btn ${selectedType === 'AIB' ? 'btn-success' : ''}`}
                onClick={() => setSelectedType('AIB')}
                style={{ fontSize: '12px', marginRight: '8px' }}
              >
                AIB
              </button>
              <button
                className={`btn ${selectedType === 'SI' ? 'btn-success' : ''}`}
                onClick={() => setSelectedType('SI')}
                style={{ fontSize: '12px' }}
              >
                SI
              </button>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid #eef2f7', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
              {controls[selectedType].map((value, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px', fontWeight: '500' }}>
                    {selectedType} {index + 1}
                  </div>
                  <button
                    onClick={() => handleToggle(selectedType, index)}
                    style={{
                      width: 72,
                      height: 40,
                      border: `1px solid ${value === 1 ? '#86efac' : '#fecaca'}`,
                      borderRadius: 9999,
                      background: value === 1 ? '#dcfce7' : '#fee2e2',
                      color: value === 1 ? '#166534' : '#991b1b',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none',
                      outlineOffset: 0,
                      boxShadow: 'none',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {value === 1 ? <Check size={20} /> : <X size={20} />}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button className="btn btn-success" onClick={() => handleSetAll(selectedType, 1)} style={{ fontSize: '12px', padding: '5px 10px' }}>
                Set All ON
              </button>
              <button className="btn btn-danger" onClick={() => handleSetAll(selectedType, 0)} style={{ fontSize: '12px', padding: '5px 10px' }}>
                Set All OFF
              </button>
              <button className="btn btn-success" onClick={handleSend} disabled={sending} style={{ marginLeft: 'auto', borderRadius: 10 }}>
                <Send size={16} style={{ marginRight: '8px' }} />
                {sending ? 'Sending...' : `Send ${selectedType} Changes`}
              </button>
            </div>
          </div>

          {message && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : message.type === 'warning' ? 'alert-warning' : 'alert-error'}`} style={{ marginTop: '12px' }}>
              {message.text}
            </div>
          )}

          <div style={{ marginTop: 16, padding: 12, background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: 10, color: '#856404' }}>
            <strong>Note:</strong> AIB and SI are controllable inputs. Only changed values are sent.
          </div>
        </>
      ) : (
        <div className="loading">No IO data available</div>
      )}
    </div>
  );
};

export default IOPanel;


