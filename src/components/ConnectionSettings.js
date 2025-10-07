import React, { useState } from 'react';
import { X, Wifi, Check, Download, AlertCircle } from 'lucide-react';

const ConnectionSettings = ({ onClose, onIPChange, currentIP }) => {
  const [ip, setIP] = useState(currentIP || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Validate IP address (supports with/without protocol and port)
  const isValidInput = (input = '') => {
    const cleaned = input.trim().replace(/^https?:\/\//, '').split(':')[0];
    return /^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/.test(cleaned);
  };

  // Build full URL from user input
  const buildURL = (input) => {
    const cleaned = (input || '').trim();
    return cleaned.startsWith('http://') || cleaned.startsWith('https://') 
      ? cleaned 
      : `https://${cleaned}`;
  };

  // Get test URL for troubleshooting link
  const getTestURL = () => {
    if (!ip || !isValidInput(ip)) return '#';
    return `${buildURL(ip)}/api/iobox/info`;
  };

  const handleIPChange = (e) => {
    setIP(e.target.value);
    setTestResult(null); // Clear previous test result
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = buildURL(ip);
      await onIPChange(url);
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const url = buildURL(ip);
      const response = await fetch(`${url}/api/iobox/info`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      await response.json();
      setTestResult({ 
        success: true, 
        message: 'Connection successful! Device responded correctly.' 
      });
    } catch (error) {
      let errorMessage = 'Connection failed: ';
      
      if (error.name === 'AbortError') {
        errorMessage += 'Request timeout (5s) - device not responding or web server not enabled';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage += 'Network error - check if device is powered on and accessible';
      } else {
        errorMessage += error.message;
      }
      
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  const isInputValid = isValidInput(ip);

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
        maxWidth: '520px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h2 style={{ 
            margin: 0, 
            color: '#2c3e50', 
            display: 'inline-flex', 
            alignItems: 'center' 
          }}>
            <Wifi size={20} style={{ marginRight: '10px' }} />
            Connection Settings
          </h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer',
              color: '#666',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Input Form */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            IOBOX IP Address
          </label>
          <input
            type="text"
            value={ip}
            onChange={handleIPChange}
            placeholder="192.168.1.100 or http://192.168.1.100:8080"
            style={{ 
              width: '100%',
              padding: '10px 12px',
              border: `2px solid ${!ip ? '#ddd' : isInputValid ? '#28a745' : '#dc3545'}`,
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          <small style={{ 
            color: '#666', 
            marginTop: '5px', 
            display: 'block',
            fontSize: '13px'
          }}>
            Enter IP address with optional protocol (http/https) and port
          </small>
        </div>

        {/* Test Result */}
        {testResult && (
          <div style={{
            padding: '12px 15px',
            marginBottom: '15px',
            borderRadius: '4px',
            background: testResult.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${testResult.success ? '#c3e6cb' : '#f5c6cb'}`,
            color: testResult.success ? '#155724' : '#721c24',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'flex-end', 
          marginBottom: '20px' 
        }}>
          <button 
            onClick={handleTest}
            disabled={isTesting || !isInputValid}
            onMouseOver={(e) => {
              if (!isTesting && isInputValid) {
                e.currentTarget.style.background = '#e0a800';
              }
            }}
            onMouseOut={(e) => {
              if (!isTesting && isInputValid) {
                e.currentTarget.style.background = '#ffc107';
              }
            }}
            style={{
              padding: '10px 20px',
              background: isTesting || !isInputValid ? '#6c757d' : '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: isTesting || !isInputValid ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: isTesting || !isInputValid ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button 
            onClick={handleSave}
            disabled={!isInputValid || isSaving}
            onMouseOver={(e) => {
              if (isInputValid && !isSaving) {
                e.currentTarget.style.background = '#218838';
              }
            }}
            onMouseOut={(e) => {
              if (isInputValid && !isSaving) {
                e.currentTarget.style.background = '#28a745';
              }
            }}
            style={{
              padding: '10px 20px',
              background: !isInputValid || isSaving ? '#6c757d' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: !isInputValid || isSaving ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              opacity: !isInputValid || isSaving ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            <Check size={16} />
            {isSaving ? 'Saving...' : 'Save & Connect'}
          </button>
        </div>

        {/* Troubleshooting Tips */}
        <div style={{ 
          padding: '15px', 
          background: '#f8f9fa', 
          border: '1px solid #e9ecef', 
          borderRadius: '4px',
          fontSize: '13px',
          marginBottom: '12px'
        }}>
          <strong style={{ color: '#495057' }}>Troubleshooting Tips:</strong>
          <ul style={{ margin: '10px 0 0 20px', color: '#6c757d', lineHeight: '1.6' }}>
            <li>Ensure IOBOX is powered on and connected to the network</li>
            <li>Verify web interface is enabled with HTTPS support</li>
            <li>Try different ports: :8443, :443, or :8080</li>
            <li>Make sure both devices are on the same network</li>
            <li>Test directly in browser: {' '}
              {isInputValid ? (
                <a 
                  href={getTestURL()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#0d6efd', wordBreak: 'break-all' }}
                >
                  {getTestURL()}
                </a>
              ) : (
                <span style={{ color: '#999' }}>https://&lt;device-ip&gt;/api/iobox/info</span>
              )}
            </li>
            <li>Accept self-signed SSL certificates if prompted</li>
          </ul>
        </div>

        {/* Download Section */}
        <div style={{ 
          padding: '12px', 
          background: '#f0f7ff', 
          border: '1px solid #d6e9ff', 
          borderRadius: '6px'
        }}>
          <div style={{ 
            marginBottom: '8px', 
            color: '#0b5ed7', 
            fontWeight: 600,
            fontSize: '14px'
          }}>
            Need to find the device IP on your network?
          </div>
          <a 
            href="/downloads/IOBOX_Manager.zip" 
            download
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px', 
              background: '#0d6efd', 
              color: '#fff', 
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#0b5ed7'}
            onMouseOut={(e) => e.target.style.background = '#0d6efd'}
          >
            <Download size={16} />
            Download IOBOX Manager (IP Scanner)
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConnectionSettings;