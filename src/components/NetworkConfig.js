import React, { useState, useEffect } from 'react';
import { Network, RefreshCw, Save, Wifi, WifiOff } from 'lucide-react';
import ioboxAPI from '../services/ioboxApi';

const NetworkConfig = () => {
  const [currentConfig, setCurrentConfig] = useState(null);
  const [staticConfig, setStaticConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    enableStaticIp: false,
    ip: '',
    subnet: '',
    gateway: ''
  });

  useEffect(() => {
    loadNetworkConfig();
  }, []);

  const loadNetworkConfig = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [current, staticCfg] = await Promise.all([
        ioboxAPI.getNetworkConfig('current'),
        ioboxAPI.getNetworkConfig('staticConfig')
      ]);
      
      setCurrentConfig(current.config);
      setStaticConfig(staticCfg.config);
      
      // Populate form with static config if available
      if (staticCfg.config) {
        setFormData({
          enableStaticIp: staticCfg.config.enableStaticIp || false,
          ip: staticCfg.config.ip || '',
          subnet: staticCfg.config.subnet || '',
          gateway: staticCfg.config.gateway || ''
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      await ioboxAPI.configureNetwork(formData);
      setMessage({ type: 'success', text: 'Network configuration updated successfully!' });
      // Reload config to show updated values
      setTimeout(() => {
        loadNetworkConfig();
      }, 1000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const formatConfigDisplay = (config, title) => (
    <div style={{ 
      background: '#f8f9fa', 
      padding: '15px', 
      borderRadius: '6px', 
      border: '1px solid #e9ecef',
      marginBottom: '15px'
    }}>
      <h4 style={{ marginBottom: '10px', color: '#2c3e50' }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        <div>
          <strong>IP Address:</strong><br />
          <span style={{ fontFamily: 'monospace' }}>{config.ip}</span>
        </div>
        <div>
          <strong>Subnet Mask:</strong><br />
          <span style={{ fontFamily: 'monospace' }}>{config.subnet}</span>
        </div>
        <div>
          <strong>Gateway:</strong><br />
          <span style={{ fontFamily: 'monospace' }}>{config.gateway}</span>
        </div>
        {config.isStatic !== undefined && (
          <div>
            <strong>Mode:</strong><br />
            <span style={{ 
              color: config.isStatic ? '#27ae60' : '#f39c12',
              fontWeight: '500'
            }}>
              {config.isStatic ? 'Static IP' : 'DHCP'}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>
          <Network size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Network Configuration
        </h2>
        <button className="btn" onClick={loadNetworkConfig} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} style={{ marginRight: '8px' }} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading network configuration...</div>
      ) : (
        <>
          {/* Current Configuration */}
          {currentConfig && formatConfigDisplay(currentConfig, 'Current Network Configuration')}
          
          {/* Static Configuration */}
          {staticConfig && formatConfigDisplay(staticConfig, 'Saved Static Configuration')}

          {/* Configuration Form */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '6px', 
            border: '1px solid #e9ecef' 
          }}>
            <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Configure Static IP</h3>
            
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="enableStaticIp"
                  checked={formData.enableStaticIp}
                  onChange={handleInputChange}
                  style={{ marginRight: '8px' }}
                />
                <Wifi size={16} style={{ marginRight: '8px' }} />
                Enable Static IP Configuration
              </label>
            </div>

            {formData.enableStaticIp && (
              <>
                <div className="form-group">
                  <label>IP Address</label>
                  <input
                    type="text"
                    name="ip"
                    value={formData.ip}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="192.168.1.100"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div className="form-group">
                  <label>Subnet Mask</label>
                  <input
                    type="text"
                    name="subnet"
                    value={formData.subnet}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="255.255.255.0"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div className="form-group">
                  <label>Gateway</label>
                  <input
                    type="text"
                    name="gateway"
                    value={formData.gateway}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="192.168.1.1"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </>
            )}

            <button 
              className="btn btn-success" 
              onClick={handleSave}
              disabled={saving || (formData.enableStaticIp && (!formData.ip || !formData.subnet || !formData.gateway))}
            >
              <Save size={16} style={{ marginRight: '8px' }} />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: '4px',
            color: '#856404'
          }}>
            <strong>Note:</strong> Changing network configuration may temporarily disconnect the device. 
            Make sure you can access the device on the new IP address before applying changes.
          </div>
        </>
      )}
    </div>
  );
};

export default NetworkConfig;
