import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Space } from 'antd';
import { WifiOutlined, CheckOutlined, DownloadOutlined, ExclamationCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const ConnectionSettings = ({ onClose, onIPChange, currentIP }) => {
  const extractIPFromURL = (url = '') => {
    if (!url) return '';
    return url.trim().replace(/^https?:\/\//, '').split('/')[0];
  };

  const [ip, setIP] = useState(extractIPFromURL(currentIP));
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

  const handleOpenInBrowser = () => {
    const testURL = getTestURL();
    if (testURL && testURL !== '#') {
      window.open(testURL, '_blank', 'noopener,noreferrer');
    }
  };

  const isInputValid = isValidInput(ip);

  return (
    <Modal
      title={(
        <Space>
          <WifiOutlined />
          <span>Connection Settings</span>
        </Space>
      )}
      open
      onCancel={onClose}
      maskClosable={false}
      destroyOnClose
      footer={null}
      width={500}
    >
      <Form layout="vertical">
        <Form.Item
          label="IOBOX IP Address"
          validateStatus={!ip ? undefined : isInputValid ? 'success' : 'error'}
          help={!ip ? 'Enter IP address' : isInputValid ? undefined : 'Invalid IP format'}
        >
          <Input
            value={ip}
            onChange={handleIPChange}
            placeholder="192.168.1.100"
            allowClear
          />
        </Form.Item>

        {testResult && (
          <Alert
            style={{ marginBottom: 16 }}
            message={testResult.message}
            type={testResult.success ? 'success' : 'error'}
            showIcon
            icon={<ExclamationCircleOutlined />}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Button
            icon={<SafetyCertificateOutlined />}
            onClick={handleOpenInBrowser}
            disabled={!isInputValid}
          >
            Trust Certificate
          </Button>
          <Button
            onClick={handleTest}
            disabled={isTesting || !isInputValid}
            loading={isTesting}
          >
            Test Connection
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleSave}
            disabled={!isInputValid}
            loading={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save & Connect'}
          </Button>
        </div>

        <div style={{ 
          padding: 12, 
          background: '#f8f9fa', 
          border: '1px solid #e9ecef', 
          borderRadius: 4,
          fontSize: 13,
          marginBottom: 12
        }}>
          <strong style={{ color: '#495057' }}>Troubleshooting Tips:</strong>
          <ul style={{ margin: '10px 0 0 20px', color: '#6c757d', lineHeight: 1.6 }}>
            <li>Ensure IOBOX is powered on and connected to the network</li>
            <li>Verify web interface is enabled with HTTPS support</li>
            <li>Make sure both devices are on the same network</li>
            <li>Use the "Trust Certificate" button above to open the API endpoint in browser and accept the certificate</li>
            <li>Accept self-signed SSL certificates if prompted</li>
          </ul>
        </div>

        <div style={{ 
          padding: 12, 
          background: '#f0f7ff', 
          border: '1px solid #d6e9ff', 
          borderRadius: 6
        }}>
          <div style={{ 
            marginBottom: 8, 
            color: '#0b5ed7', 
            fontWeight: 600,
            fontSize: 14
          }}>
            Need to find the device IP on your network?
          </div>
          <a 
            href="/downloads/IOBOX_Manager.zip" 
            download
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px', 
              background: '#1677ff', 
              color: '#fff', 
              borderRadius: 4,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            <DownloadOutlined />
            Download IOBOX Manager (IP Scanner)
          </a>
        </div>
      </Form>
    </Modal>
  );
};

export default ConnectionSettings;