import React, { useState } from 'react';
import { Card, Button, Upload, message, Alert, Typography, Row, Col, Divider, Tag, Space, Modal } from 'antd';
import { 
  DownloadOutlined, 
  UploadOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import ioboxAPI from '../services/ioboxApi';

const { Title, Text } = Typography;

const ConfigManager = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [configData, setConfigData] = useState(null);
  const [lastExportTime, setLastExportTime] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  // Thu thập tất cả cấu hình từ thiết bị
  const collectAllConfig = async () => {
    setLoading(true);
    try {
      const [deviceInfo, networkConfig, ioStatus, logicConfig] = await Promise.allSettled([
        ioboxAPI.getDeviceInfo(),
        ioboxAPI.getNetworkConfig('current'),
        ioboxAPI.getIOStatus('all'),
        ioboxAPI.getLogicConfig('all')
      ]);

      const config = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          deviceType: 'IOBOX',
          exportedBy: 'IOBOX Controller App'
        },
        deviceInfo: deviceInfo.status === 'fulfilled' ? deviceInfo.value : null,
        networkConfig: networkConfig.status === 'fulfilled' ? networkConfig.value : null,
        ioStatus: ioStatus.status === 'fulfilled' ? ioStatus.value : null,
        logicConfig: logicConfig.status === 'fulfilled' ? logicConfig.value : null,
        errors: {
          deviceInfo: deviceInfo.status === 'rejected' ? deviceInfo.reason?.message : null,
          networkConfig: networkConfig.status === 'rejected' ? networkConfig.reason?.message : null,
          ioStatus: ioStatus.status === 'rejected' ? ioStatus.reason?.message : null,
          logicConfig: logicConfig.status === 'rejected' ? logicConfig.reason?.message : null
        }
      };

      setConfigData(config);
      return config;
    } catch (error) {
      message.error(`Failed to collect configuration: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Xuất cấu hình ra file JSON
  const handleExportConfig = async () => {
    setExporting(true);
    try {
      const config = await collectAllConfig();
      
      // Tạo tên file với timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `iobox-config-${timestamp}.json`;
      
      // Tạo và tải file
      const dataStr = JSON.stringify(config, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      setLastExportTime(new Date().toLocaleString());
      message.success(`Configuration exported successfully as ${filename}`);
    } catch (error) {
      message.error(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Đọc và xác thực file cấu hình
  const handleFileRead = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          
          // Xác thực cấu trúc file
          if (!config.exportInfo || !config.exportInfo.timestamp) {
            throw new Error('Invalid configuration file format');
          }
          
          resolve(config);
        } catch (error) {
          reject(new Error(`Invalid JSON file: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Nhập cấu hình từ file
  const handleImportConfig = async (file) => {
    setImporting(true);
    try {
      const config = await handleFileRead(file);
      
      // Hiển thị thông tin file trước khi import
      setConfigData(config);
      
      message.success('Configuration file loaded successfully. Review the details below before applying.');
      return false; // Ngăn upload tự động
    } catch (error) {
      message.error(`Import failed: ${error.message}`);
      return false;
    } finally {
      setImporting(false);
    }
  };

  // Áp dụng cấu hình đã import
  const handleApplyConfig = async () => {
    if (!configData) return;
    
    setImporting(true);
    try {
      const results = [];
      
      // Áp dụng cấu hình logic nếu có
      if (configData.logicConfig?.rules) {
        try {
          await ioboxAPI.configureLogic(configData.logicConfig.rules);
          results.push('Logic configuration applied');
        } catch (error) {
          results.push(`Logic config failed: ${error.message}`);
        }
      }
      
      message.success(`Configuration applied successfully! Results: ${results.join(', ')}`);
      setConfigData(null);
    } catch (error) {
      message.error(`Apply configuration failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Factory Reset
  const handleFactoryReset = () => {
    Modal.confirm({
      title: 'Factory Reset',
      icon: <ExclamationCircleOutlined />,
      content: 'This will reset the device to factory settings. The device may reboot and change its IP/network settings. Do you want to proceed?',
      okText: 'Yes, reset',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        setIsResetting(true);
        try {
          const res = await ioboxAPI.factoryReset();
          Modal.success({
            title: 'Reset Command Sent',
            content: (res && res.message) || 'Factory reset initiated. The device may become temporarily unreachable.',
          });
        } catch (err) {
          Modal.error({
            title: 'Reset Failed',
            content: err.message,
          });
        } finally {
          setIsResetting(false);
        }
      }
    });
  };

  // Hiển thị thông tin cấu hình
  const renderConfigInfo = () => {
    if (!configData) return null;

    const { exportInfo, deviceInfo, networkConfig, ioStatus, logicConfig, errors } = configData;

    return (
      <Card title="Configuration Details" style={{ marginTop: '16px' }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Title level={5}>Export Information</Title>
            <Text type="secondary">
              <strong>Exported:</strong> {new Date(exportInfo.timestamp).toLocaleString()}<br/>
              <strong>Version:</strong> {exportInfo.version}<br/>
              <strong>Device:</strong> {exportInfo.deviceType}
            </Text>
          </Col>
          
          <Col span={12}>
            <Title level={5}>Device Information</Title>
            {deviceInfo ? (
              <Text type="success">
                <CheckCircleOutlined /> Device info available
              </Text>
            ) : (
              <Text type="danger">
                <ExclamationCircleOutlined /> {errors.deviceInfo || 'Not available'}
              </Text>
            )}
          </Col>
          
          <Col span={12}>
            <Title level={5}>Network Configuration</Title>
            {networkConfig ? (
              <Text type="success">
                <CheckCircleOutlined /> Network config available
              </Text>
            ) : (
              <Text type="danger">
                <ExclamationCircleOutlined /> {errors.networkConfig || 'Not available'}
              </Text>
            )}
          </Col>
          
          <Col span={12}>
            <Title level={5}>IO Status</Title>
            {ioStatus ? (
              <Text type="success">
                <CheckCircleOutlined /> IO status available
              </Text>
            ) : (
              <Text type="danger">
                <ExclamationCircleOutlined /> {errors.ioStatus || 'Not available'}
              </Text>
            )}
          </Col>
          
          <Col span={12}>
            <Title level={5}>Logic Configuration</Title>
            {logicConfig ? (
              <Text type="success">
                <CheckCircleOutlined /> Logic config available
                {logicConfig.rules && (
                  <Tag color="blue" style={{ marginLeft: '8px' }}>
                    {logicConfig.rules.length} rules
                  </Tag>
                )}
              </Text>
            ) : (
              <Text type="danger">
                <ExclamationCircleOutlined /> {errors.logicConfig || 'Not available'}
              </Text>
            )}
          </Col>
        </Row>
        
        {configData && (
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setConfigData(null)}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                onClick={handleApplyConfig}
                loading={importing}
                disabled={!configData}
              >
                Apply Configuration
              </Button>
            </Space>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div>
      <Card 
        title={
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <FileTextOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Configuration Manager
          </Title>
        }
      >
        <Alert
          message="Configuration Export/Import"
          description="Export your current device configuration to a file, or import a configuration file to apply logic rules only (network settings are ignored)."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card size="small" title="Export Configuration">
              <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                Export current device configuration including network settings, IO status, and logic rules.
              </Text>
              
              <Button 
                type="primary" 
                icon={<DownloadOutlined />}
                onClick={handleExportConfig}
                loading={exporting}
                disabled={loading}
                block
              >
                {exporting ? 'Exporting...' : 'Export Configuration'}
              </Button>
              
              {lastExportTime && (
                <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '12px' }}>
                  Last exported: {lastExportTime}
                </Text>
              )}
            </Card>
          </Col>
          
          <Col xs={24} md={8}>
            <Card size="small" title="Import Configuration">
              <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                Import a configuration file to apply logic rules only. Network settings will be ignored.
              </Text>
              
              <Upload
                accept=".json"
                beforeUpload={handleImportConfig}
                showUploadList={false}
                disabled={importing}
              >
                <Button 
                  icon={<UploadOutlined />}
                  loading={importing}
                  block
                >
                  {importing ? 'Importing...' : 'Select Configuration File'}
                </Button>
              </Upload>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card size="small" title="Factory Reset">
              <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                Reset the device to factory settings. This will clear all configurations and may change network settings.
              </Text>
              
              <Button 
                danger
                icon={<ReloadOutlined />}
                onClick={handleFactoryReset}
                loading={isResetting}
                block
              >
                {isResetting ? 'Resetting...' : 'Factory Reset'}
              </Button>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Alert
          message="Important Notes"
          description={
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Export includes all current device settings and configurations</li>
              <li>Import applies only logic rules; network settings are ignored</li>
              <li>Logic rules will be applied immediately after import</li>
              <li>Consider exporting first as a backup before importing</li>
              <li>To change network settings, configure them separately in Network settings</li>
            </ul>
          }
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
        />

        {renderConfigInfo()}
      </Card>
    </div>
  );
};

export default ConfigManager;
