import React, { useEffect, useState, useCallback } from 'react';
import { Button, Alert, Select, Switch, Spin, Card, Segmented } from 'antd';
import { AppstoreOutlined, ReloadOutlined, ThunderboltOutlined, DashboardOutlined, ControlOutlined, SettingOutlined, SendOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import ioboxAPI from '../services/ioboxApi';

const IOPanel = () => {
  const [ioData, setIOData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(1500);
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

  const renderIOGroup = (type, values, title, description) => {
    const Icon = getIOIcon(type);
    const color = getIOColor(type, values);

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
                <span className={chipClass(val === 1)}>
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
            <Switch size="small" checked={autoRefresh} onChange={(checked) => setAutoRefresh(checked)} />
            {autoRefresh && (
              <Select
                size="small"
                value={refreshInterval}
                onChange={(val) => setRefreshInterval(Number(val))}
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
            {renderIOGroup('AI', ioData.AI, 'Analog Input', '1 channel - Voltage/Current measurement')}
            {renderIOGroup('DI', ioData.DI, 'Digital Input', '4 channels - Digital input states')}
            {renderIOGroup('AIB', ioData.AIB, 'AIBox Input', '4 channels - Controllable input states')}
            {renderIOGroup('SI', ioData.SI, 'System Input', '4 channels - System input states')}
            {renderIOGroup('DO', ioData.DO, 'Digital Output', '4 channels - Digital output states')}
          </div>

          <div className="row-between" style={{ margin: '24px 0 12px' }}>
            <h3 style={{ margin: 0 }}>
              <SettingOutlined style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Input Control
            </h3>
            <Segmented
              size="middle"
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              options={[
                { label: 'AIB', value: 'AIB' },
                { label: 'SI', value: 'SI' }
              ]}
            />
          </div>

          <Card bordered style={{ background: '#ffffff', borderRadius: 12, boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }} bodyStyle={{ padding: 16 }}>
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
                    {value === 1 ? <CheckOutlined /> : <CloseOutlined />}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Button size="small" type="primary" onClick={() => handleSetAll(selectedType, 1)}>
                Set All ON
              </Button>
              <Button size="small" danger onClick={() => handleSetAll(selectedType, 0)}>
                Set All OFF
              </Button>
              <Button type="primary" onClick={handleSend} disabled={sending} style={{ marginLeft: 'auto', borderRadius: 10 }} icon={<SendOutlined />}>
                {sending ? 'Sending...' : `Send ${selectedType} Changes`}
              </Button>
            </div>
          </Card>

          {message && (
            <Alert style={{ marginTop: 12 }} type={message.type === 'warning' ? 'warning' : message.type === 'success' ? 'success' : 'error'} message={message.text} showIcon />
          )}

          <Alert style={{ marginTop: 16 }} type="warning" message="Note" description="AIB and SI are controllable inputs. Only changed values are sent." showIcon />
        </>
      ) : (
        <div className="loading">No IO data available</div>
      )}
    </div>
  );
};

export default IOPanel;


