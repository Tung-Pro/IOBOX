import React, { useState } from 'react';
import { X, Wifi, Check } from 'lucide-react';

const ConnectionSettings = ({ onClose, onIPChange, currentIP }) => {
  // Work with full URL entered by user (e.g., http://192.168.1.34:8080)
  const [ip, setIP] = useState(currentIP || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSave = () => {
    const cleaned = (ip || '').trim();
    const url = cleaned.startsWith('http://') || cleaned.startsWith('https://') ? cleaned : `https://${cleaned}`;
    onIPChange(url);
    onClose();
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // First test basic connectivity with HTTPS
      const cleaned = (ip || '').trim();
      const url = cleaned.startsWith('http://') || cleaned.startsWith('https://') ? cleaned : `https://${cleaned}`;
      const pingResponse = await fetch(`${url}/api/iobox/info`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // Increased timeout for HTTPS
      });
      
      if (!pingResponse.ok) {
        throw new Error(`HTTP ${pingResponse.status}: ${pingResponse.statusText}`);
      }
      
      await pingResponse.json();
      setTestResult({ success: true, message: 'Connection successful! Device responded correctly.' });
    } catch (error) {
      let errorMessage = 'Connection failed: ';
      
      if (error.name === 'AbortError') {
        errorMessage += 'Request timeout - device may not be responding or web server not enabled';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error - check if device is powered on and web interface is enabled';
      } else if (error.message.includes('CORS')) {
        errorMessage += 'CORS error - device may not allow browser connections';
      } else {
        errorMessage += error.message;
      }
      
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>
            <Wifi size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            Connection Settings
          </h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer',
              color: '#666'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="form-group">
          <label>IOBOX IP Address</label>
          <input
            type="text"
            className="form-control"
            value={ip}
            onChange={(e) => setIP(e.target.value)}
            placeholder="192.168.1.100"
            style={{ fontFamily: 'monospace' }}
          />
          <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
            Enter the IP address of your IOBOX device
          </small>
        </div>

        {testResult && (
          <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`}>
            {testResult.message}
          </div>
        )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button 
              className="btn btn-warning" 
              onClick={handleTest}
              disabled={isTesting || !ip}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button 
              className="btn btn-success" 
              onClick={handleSave}
              disabled={!ip}
            >
              <Check size={16} style={{ marginRight: '8px' }} />
              Save & Connect
            </button>
          </div>

          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#f8f9fa', 
            border: '1px solid #e9ecef', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <strong>Troubleshooting Tips:</strong>
            <ul style={{ margin: '10px 0 0 20px', color: '#6c757d' }}>
              <li>Ensure the IOBOX device is powered on and connected to the network</li>
              <li>Verify the device has its web interface enabled with HTTPS support</li>
              <li>Check if the device is using a different port (try adding :8443 or :443 to the IP)</li>
              <li>Make sure your computer and IOBOX are on the same network</li>
              <li>Try accessing the device directly in a browser: <a href={`${(ip?.startsWith('http') ? ip : `https://${ip}`) || 'https://<device-ip>'}/api/iobox/info`} target="_blank" rel="noopener noreferrer">{`${(ip?.startsWith('http') ? ip : `https://${ip}`) || 'https://<device-ip>'}/api/iobox/info`}</a></li>
              <li>If you get SSL certificate warnings, accept the self-signed certificate</li>
            </ul>
          </div>
      </div>
    </div>
  );
};

export default ConnectionSettings;
