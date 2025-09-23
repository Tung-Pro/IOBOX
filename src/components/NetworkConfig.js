import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Typography, Form, Input, Switch, Alert, Spin, Tag } from 'antd';
import { 
  GlobalOutlined, 
  ReloadOutlined, 
  SaveOutlined, 
  WifiOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
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

  const formatConfigDisplay = (config, title, icon) => (
    <Card 
      title={
        <Typography.Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          {icon}
          <span style={{ marginLeft: '8px' }}>{title}</span>
        </Typography.Title>
      }
      size="small"
      style={{ height: '100%' }}
    >
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div>
            <Typography.Text type="secondary">IP Address</Typography.Text>
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '16px', 
              fontWeight: '500',
              marginTop: '4px'
            }}>
              {config.ip}
            </div>
          </div>
        </Col>
        <Col span={12}>
          <div>
            <Typography.Text type="secondary">Subnet Mask</Typography.Text>
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '16px', 
              fontWeight: '500',
              marginTop: '4px'
            }}>
              {config.subnet}
            </div>
          </div>
        </Col>
        <Col span={12}>
          <div>
            <Typography.Text type="secondary">Gateway</Typography.Text>
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '16px', 
              fontWeight: '500',
              marginTop: '4px'
            }}>
              {config.gateway}
            </div>
          </div>
        </Col>
        <Col span={12}>
          <div>
            <Typography.Text type="secondary">Mode</Typography.Text>
            <div style={{ marginTop: '4px' }}>
              <Tag 
                color={config.isStatic !== undefined ? (config.isStatic ? 'green' : 'orange') : 'blue'}
                style={{ fontSize: '12px' }}
              >
                {config.isStatic !== undefined ? (config.isStatic ? 'Static IP' : 'DHCP') : 'Static Config'}
              </Tag>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );

  return (
    <Card 
      title={
        <Typography.Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          <GlobalOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Network Configuration
        </Typography.Title>
      }
      extra={
        <Button 
          type="primary" 
          icon={<ReloadOutlined spin={loading} />}
          onClick={loadNetworkConfig} 
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      {message && (
        <Alert
          message={message.type === 'success' ? 'Success' : 'Error'}
          description={message.text}
          type={message.type === 'success' ? 'success' : 'error'}
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>Loading network configuration...</div>
        </div>
      ) : (
        <>
          {/* Network Information Display - Side by Side */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              {currentConfig && formatConfigDisplay(
                currentConfig, 
                'Current Network', 
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              )}
            </Col>
            <Col xs={24} lg={12}>
              {staticConfig && formatConfigDisplay(
                staticConfig, 
                'Saved Static Config', 
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
              )}
            </Col>
          </Row>

          {/* Configuration Form */}
          <Card 
            title={
              <Typography.Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <WifiOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Configure Static IP
              </Typography.Title>
            }
            size="small"
          >
            <Form layout="vertical">
              <Form.Item>
                <Switch
                  checked={formData.enableStaticIp}
                  onChange={(checked) => setFormData(prev => ({ ...prev, enableStaticIp: checked }))}
                  checkedChildren="Static IP"
                  unCheckedChildren="DHCP"
                />
              </Form.Item>

              {formData.enableStaticIp && (
                <>
                  <Form.Item label="IP Address">
                    <Input
                      name="ip"
                      value={formData.ip}
                      onChange={handleInputChange}
                      placeholder="192.168.1.100"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>

                  <Form.Item label="Subnet Mask">
                    <Input
                      name="subnet"
                      value={formData.subnet}
                      onChange={handleInputChange}
                      placeholder="255.255.255.0"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>

                  <Form.Item label="Gateway">
                    <Input
                      name="gateway"
                      value={formData.gateway}
                      onChange={handleInputChange}
                      placeholder="192.168.1.1"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </>
              )}

              <Form.Item>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={saving}
                  disabled={formData.enableStaticIp && (!formData.ip || !formData.subnet || !formData.gateway)}
                >
                  Save Configuration
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Alert
            message="Important Note"
            description="Changing network configuration may temporarily disconnect the device. Make sure you can access the device on the new IP address before applying changes."
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </>
      )}
    </Card>
  );
};

export default NetworkConfig;
