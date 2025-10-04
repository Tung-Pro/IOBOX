import React, { useState } from 'react';
import { Card, Button, Row, Col, Typography, Tag, Empty, Modal } from 'antd';
import { 
  ReloadOutlined, 
  DesktopOutlined, 
  NumberOutlined, 
  WifiOutlined, 
  GlobalOutlined, 
  BuildOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import ioboxAPI from '../services/ioboxApi';

const DeviceInfo = ({ deviceInfo, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!deviceInfo) {
    return (
      <Card 
        title={
          <Typography.Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <DesktopOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Device Information
          </Typography.Title>
        }
        extra={
          <Button 
            type="primary" 
            icon={<ReloadOutlined spin={isRefreshing} />}
            onClick={handleRefresh} 
            loading={isRefreshing}
          >
            Refresh
          </Button>
        }
      >
        <Empty 
          description="No device information available. Please check your connection."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const infoItems = [
    {
      icon: <DesktopOutlined />,
      label: 'Model',
      value: deviceInfo.Model,
      description: 'Device model name'
    },
    {
      icon: <NumberOutlined />,
      label: 'Serial Number',
      value: deviceInfo.Serial,
      description: 'Device serial number'
    },
    {
      icon: <ThunderboltOutlined />,
      label: 'MCU Serial',
      value: deviceInfo.SerialMcu,
      description: 'Microcontroller serial number'
    },
    {
      icon: <BuildOutlined />,
      label: 'Hardware Version',
      value: deviceInfo.HwVer,
      description: 'Hardware version'
    },
    {
      icon: <BuildOutlined />,
      label: 'Firmware Version',
      value: deviceInfo.FwVer,
      description: 'Main firmware version'
    },
    {
      icon: <BuildOutlined />,
      label: 'MCU Firmware',
      value: deviceInfo.McuFwVer,
      description: 'MCU firmware version'
    },
    {
      icon: <WifiOutlined />,
      label: 'MAC Address',
      value: deviceInfo.macAddr,
      description: 'Device MAC address'
    },
    {
      icon: <GlobalOutlined />,
      label: 'Local IP',
      value: deviceInfo.localIp,
      description: 'Current IP address'
    }
  ];

  return (
    <Card 
      title={
        <Typography.Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          <DesktopOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Device Information
        </Typography.Title>
      }
      extra={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button 
            danger
            loading={isResetting}
            onClick={() => {
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
            }}
          >
            Factory Reset
          </Button>
          <Button 
            type="primary" 
            icon={<ReloadOutlined spin={isRefreshing} />}
            onClick={handleRefresh} 
            loading={isRefreshing}
          >
            Refresh
          </Button>
        </div>
      }
    >
      <Row gutter={[16, 16]}>
        {infoItems.map((item, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card 
              size="small" 
              hoverable
              style={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ marginRight: '8px', color: '#1890ff', fontSize: '16px' }}>
                  {item.icon}
                </span>
                <Typography.Text strong style={{ color: '#262626' }}>
                  {item.label}
                </Typography.Text>
              </div>
              <Typography.Text 
                copyable={{ text: String(item.value ?? '') }}
                style={{ 
                fontSize: '16px', 
                fontWeight: '500', 
                display: 'block',
                marginBottom: '4px',
                color: '#595959'
              }}>
                {item.value}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                {item.description}
              </Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      {deviceInfo.socks && deviceInfo.socks.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <Typography.Title level={4} style={{ marginBottom: '16px', color: '#262626' }}>
            Available Sockets
          </Typography.Title>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {deviceInfo.socks.map((socket, index) => (
              <Tag key={index} color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
                Socket {socket}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default DeviceInfo;
