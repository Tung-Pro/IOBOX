import React from 'react';
import { Layout, Menu } from 'antd';
import { 
  DesktopOutlined, 
  GlobalOutlined, 
  MonitorOutlined, 
  ControlOutlined, 
  ThunderboltOutlined,
  WifiOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar = ({ activeTab, setActiveTab, isConnected, deviceInfo, onSettingsClick }) => {
  const menuItems = [
    {
      key: 'device',
      icon: <DesktopOutlined />,
      label: 'Device Info',
    },
    {
      key: 'network',
      icon: <GlobalOutlined />,
      label: 'Network',
    },
    {
      key: 'io',
      icon: <MonitorOutlined />,
      label: 'IO Monitor',
    },
    {
      key: 'control',
      icon: <ControlOutlined />,
      label: 'Input Control',
    },
    {
      key: 'logic',
      icon: <ThunderboltOutlined />,
      label: 'Logic Config',
    },
  ];

  return (
    <Sider 
      width={250} 
      style={{
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        zIndex: 1000,
      }}
    >
      <div style={{ 
        padding: '24px 16px', 
        borderBottom: '1px solid #f0f0f0',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          color: '#1890ff',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <img src="/logo.png" alt="Logo" style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '8px' }} />
          IOBOX Controller
        </div>
        
        {/* Connection Status */}
        <div style={{ 
          padding: '8px 12px', 
          borderRadius: '6px',
          backgroundColor: isConnected ? '#f6ffed' : '#fff2f0',
          border: `1px solid ${isConnected ? '#b7eb8f' : '#ffccc7'}`,
          marginBottom: '16px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '12px',
            color: isConnected ? '#52c41a' : '#ff4d4f'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#52c41a' : '#ff4d4f',
              marginRight: '6px'
            }} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          {isConnected && deviceInfo && (
            <div style={{ 
              fontSize: '11px', 
              color: '#666',
              marginTop: '4px'
            }}>
              {deviceInfo.Model} - {deviceInfo.localIp}
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button 
          onClick={onSettingsClick}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#1890ff';
            e.target.style.color = '#1890ff';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#d9d9d9';
            e.target.style.color = 'inherit';
          }}
        >
          <WifiOutlined style={{ marginRight: '6px' }} />
          Settings
        </button>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[activeTab]}
        items={menuItems}
        onClick={({ key }) => setActiveTab(key)}
        style={{
          border: 'none',
          background: 'transparent'
        }}
      />
    </Sider>
  );
};

export default Sidebar;
