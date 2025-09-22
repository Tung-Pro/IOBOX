import React, { useState, useEffect } from 'react';
import { Settings, Send, RefreshCw, ToggleLeft, ToggleRight, Check, X } from 'lucide-react';
import ioboxAPI from '../services/ioboxApi';

const InputControl = () => {
  const [ioData, setIOData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedType, setSelectedType] = useState('AIB');
  const [controls, setControls] = useState({
    AIB: [0, 0, 0, 0],
    SI: [0, 0, 0, 0]
  });

  useEffect(() => {
    loadIOData();
  }, []);

  const loadIOData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await ioboxAPI.getIOStatus('all');
      setIOData(data.io);
      // Update controls with current values
      setControls({
        AIB: data.io.AIB || [0, 0, 0, 0],
        SI: data.io.SI || [0, 0, 0, 0]
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (type, index) => {
    setControls(prev => ({
      ...prev,
      [type]: prev[type].map((val, i) => i === index ? (val === 1 ? 0 : 1) : val)
    }));
  };

  const handleSetAll = (type, value) => {
    setControls(prev => ({
      ...prev,
      [type]: [value, value, value, value]
    }));
  };

  const handleSend = async () => {
    setSending(true);
    setMessage(null);
    
    try {
      const currentValues = controls[selectedType];
      const indices = [];
      const values = [];
      
      // Only send changed values
      const originalValues = ioData[selectedType] || [0, 0, 0, 0];
      currentValues.forEach((val, index) => {
        if (val !== originalValues[index]) {
          indices.push(index + 1); // API uses 1-based indexing
          values.push(val);
        }
      });

      if (indices.length === 0) {
        setMessage({ type: 'warning', text: 'No changes to send' });
        return;
      }

      await ioboxAPI.controlInput(selectedType, indices, values);
      setMessage({ type: 'success', text: `Successfully updated ${indices.length} ${selectedType} input(s)` });
      
      // Refresh data to show updated values
      setTimeout(() => {
        loadIOData();
      }, 500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSending(false);
    }
  };

  const renderControlGroup = (type, title, description) => {
    const values = controls[type];
    const Icon = type === 'AIB' ? ToggleRight : ToggleRight;
    
    return (
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '6px', 
        border: '1px solid #e9ecef',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
          <Icon size={20} style={{ marginRight: '10px', color: '#3498db' }} />
          <div>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>{title}</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6c757d' }}>{description}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '15px' }}>
          {values.map((value, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#6c757d', 
                marginBottom: '5px',
                fontWeight: '500'
              }}>
                {type} {index + 1}
              </div>
              <button
                onClick={() => handleToggle(type, index)}
                style={{
                  width: '60px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '6px',
                  background: value === 1 ? '#27ae60' : '#e74c3c',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                {value === 1 ? <Check size={20} /> : <X size={20} />}
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-success"
            onClick={() => handleSetAll(type, 1)}
            style={{ fontSize: '12px', padding: '5px 10px' }}
          >
            Set All ON
          </button>
          <button 
            className="btn btn-danger"
            onClick={() => handleSetAll(type, 0)}
            style={{ fontSize: '12px', padding: '5px 10px' }}
          >
            Set All OFF
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>
          <Settings size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Input Control
        </h2>
        <button className="btn" onClick={loadIOData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} style={{ marginRight: '8px' }} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : message.type === 'warning' ? 'alert-warning' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500', color: '#2c3e50' }}>
          Select Input Type to Control:
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={`btn ${selectedType === 'AIB' ? 'btn-success' : ''}`}
            onClick={() => setSelectedType('AIB')}
            style={{ fontSize: '14px' }}
          >
            AIBox Input (AIB)
          </button>
          <button
            className={`btn ${selectedType === 'SI' ? 'btn-success' : ''}`}
            onClick={() => setSelectedType('SI')}
            style={{ fontSize: '14px' }}
          >
            System Input (SI)
          </button>
        </div>
      </div>

      {loading && !ioData ? (
        <div className="loading">Loading current IO states...</div>
      ) : (
        <>
          {renderControlGroup('AIB', 'AIBox Input Control', 'Control AIBox input states (4 channels)')}
          {renderControlGroup('SI', 'System Input Control', 'Control system input states (4 channels)')}

          <div style={{ 
            background: '#e8f4fd', 
            padding: '15px', 
            borderRadius: '6px', 
            border: '1px solid #bee5eb',
            marginTop: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>Current Selection: {selectedType}</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                className="btn btn-success" 
                onClick={handleSend}
                disabled={sending}
              >
                <Send size={16} style={{ marginRight: '8px' }} />
                {sending ? 'Sending...' : `Send ${selectedType} Changes`}
              </button>
              <span style={{ fontSize: '14px', color: '#6c757d' }}>
                Only changed values will be sent to the device
              </span>
            </div>
          </div>

          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: '4px',
            color: '#856404'
          }}>
            <strong>Note:</strong> This control allows you to set the state of AIBox Input (AIB) and System Input (SI) channels. 
            These are controllable inputs that can be used in logic configurations.
          </div>
        </>
      )}
    </div>
  );
};

export default InputControl;
