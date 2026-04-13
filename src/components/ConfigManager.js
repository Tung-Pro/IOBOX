import React, { useState } from 'react';
import { Card, Button, Upload, message, Alert, Typography, Row, Col, Divider, Modal, Tag, List, Collapse, Descriptions, Space } from 'antd';
import { 
  DownloadOutlined, 
  InboxOutlined,
  FileTextOutlined, 
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import ioboxAPI from '../services/ioboxApi';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const ConfigManager = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastExportTime, setLastExportTime] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  const normalizeAnalogType = (raw) => {
    const t = String(raw || '').toLowerCase().trim();
    if (t === 'in_range' || t === 'inrange' || t === 'in' || t === 'in-range') return 'in_range';
    if (t === 'out_range' || t === 'outrange' || t === 'out' || t === 'out-range') return 'out_range';
    return 'in_range';
  };

  const createDefaultAnalog = () => ({
    min: 0,
    max: 100,
    type: 'in_range'
  });

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

          resolve(config);
        } catch (error) {
          reject(new Error(`Invalid JSON file: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const getStableString = (value) => {
    if (Array.isArray(value)) {
      return `[${value.map(getStableString).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      const keys = Object.keys(value).sort();
      return `{${keys.map((key) => `${JSON.stringify(key)}:${getStableString(value[key])}`).join(',')}}`;
    }

    return JSON.stringify(value);
  };

  const extractLogicRules = (config) => {
    if (Array.isArray(config?.logicConfig?.rules)) {
      return config.logicConfig.rules;
    }

    if (Array.isArray(config?.rules)) {
      return config.rules;
    }

    throw new Error('File does not contain valid logic rules');
  };

  const summarizeRuleChanges = (currentRules, importedRules) => {
    const currentSet = new Set(currentRules.map(getStableString));
    const importedSet = new Set(importedRules.map(getStableString));

    let unchanged = 0;
    importedSet.forEach((rule) => {
      if (currentSet.has(rule)) {
        unchanged += 1;
      }
    });

    return {
      currentCount: currentRules.length,
      importedCount: importedRules.length,
      added: [...importedSet].filter((rule) => !currentSet.has(rule)).length,
      removed: [...currentSet].filter((rule) => !importedSet.has(rule)).length,
      unchanged
    };
  };

  const getRuleIdentity = (rule, index) => {
    const output = rule?.output;
    if (typeof output === 'string' && output.trim()) {
      return output.trim();
    }
    return `Rule ${index + 1}`;
  };

  const normalizeCondition = (condition = {}) => ({
    inputType: String(condition.inputType || 'DI'),
    inputIndex: Number.isFinite(Number(condition.inputIndex)) ? Number(condition.inputIndex) : 1,
    trigger: String(condition.trigger || 'level'),
    timer: Number.isFinite(Number(condition.timer)) ? Number(condition.timer) : 0
  });

  const normalizeRuleForDiff = (rule = {}, index = 0) => {
    const rawAnalog = Array.isArray(rule.analogSettings) && rule.analogSettings.length > 0
      ? rule.analogSettings
      : (rule.analogSetting ? [rule.analogSetting] : []);

    let analogSettings = rawAnalog.slice(0, 2).map((a) => {
      const merged = { ...createDefaultAnalog(), ...(a || {}) };
      return {
        min: Number.isFinite(Number(merged.min)) ? Number(merged.min) : 0,
        max: Number.isFinite(Number(merged.max)) ? Number(merged.max) : 100,
        type: normalizeAnalogType(merged.type)
      };
    });

    while (analogSettings.length < 2) {
      analogSettings.push(createDefaultAnalog());
    }

    const conditions = Array.isArray(rule.conditions)
      ? rule.conditions.map(normalizeCondition)
      : [];

    return {
      output: getRuleIdentity(rule, index),
      enabled: rule.enabled !== false,
      delay: Number.isFinite(Number(rule.delay)) ? Number(rule.delay) : 0,
      logic: String(rule.logic || ''),
      analogSettings,
      conditions
    };
  };

  const getRuleFieldChanges = (beforeRule, afterRule) => {
    const before = normalizeRuleForDiff(beforeRule);
    const after = normalizeRuleForDiff(afterRule);
    const changes = [];

    if (before.enabled !== after.enabled) {
      changes.push(`enabled: ${before.enabled ? 'true' : 'false'} -> ${after.enabled ? 'true' : 'false'}`);
    }

    if (before.logic !== after.logic) {
      changes.push(`logic: "${before.logic || '-'}" -> "${after.logic || '-'}"`);
    }

    if (before.delay !== after.delay) {
      changes.push(`delay: ${before.delay}s -> ${after.delay}s`);
    }

    for (let i = 0; i < 2; i += 1) {
      const b = before.analogSettings[i];
      const a = after.analogSettings[i];
      if (b.type !== a.type || b.min !== a.min || b.max !== a.max) {
        changes.push(`AI${i + 1}: {type:${b.type}, min:${b.min}, max:${b.max}} -> {type:${a.type}, min:${a.min}, max:${a.max}}`);
      }
    }

    if (before.conditions.length !== after.conditions.length) {
      changes.push(`conditions count: ${before.conditions.length} -> ${after.conditions.length}`);
    }

    const maxLen = Math.max(before.conditions.length, after.conditions.length);
    for (let i = 0; i < maxLen; i += 1) {
      const b = before.conditions[i];
      const a = after.conditions[i];

      if (!b && a) {
        changes.push(`C${i + 1}: added {${a.inputType}, idx:${a.inputIndex}, trig:${a.trigger}, t:${a.timer}}`);
        continue;
      }

      if (b && !a) {
        changes.push(`C${i + 1}: removed {${b.inputType}, idx:${b.inputIndex}, trig:${b.trigger}, t:${b.timer}}`);
        continue;
      }

      if (getStableString(b) !== getStableString(a)) {
        changes.push(`C${i + 1}: {${b.inputType}, idx:${b.inputIndex}, trig:${b.trigger}, t:${b.timer}} -> {${a.inputType}, idx:${a.inputIndex}, trig:${a.trigger}, t:${a.timer}}`);
      }
    }

    return changes;
  };

  const getDetailedRuleChanges = (currentRules, importedRules) => {
    const currentById = new Map();
    const importedById = new Map();

    currentRules.forEach((rule, index) => {
      currentById.set(getRuleIdentity(rule, index), rule);
    });

    importedRules.forEach((rule, index) => {
      importedById.set(getRuleIdentity(rule, index), rule);
    });

    const allIds = [...new Set([...currentById.keys(), ...importedById.keys()])].sort();

    return allIds.map((id) => {
      const before = currentById.get(id);
      const after = importedById.get(id);

      if (!before && after) {
        return {
          id,
          type: 'added',
          before: null,
          after,
          fieldChanges: []
        };
      }

      if (before && !after) {
        return {
          id,
          type: 'removed',
          before,
          after: null,
          fieldChanges: []
        };
      }

      if (getStableString(before) === getStableString(after)) {
        return {
          id,
          type: 'unchanged',
          before,
          after,
          fieldChanges: []
        };
      }

      return {
        id,
        type: 'modified',
        before,
        after,
        fieldChanges: getRuleFieldChanges(before, after)
      };
    });
  };

  const handleApplyConfig = async (rules) => {
    setImporting(true);
    try {
      await ioboxAPI.configureLogic(rules);
      message.success(`Logic configuration applied successfully (${rules.length} rule(s)).`);
    } catch (error) {
      message.error(`Apply logic configuration failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Nhập cấu hình từ file
  const handleImportConfig = async (file) => {
    setImporting(true);
    try {
      const config = await handleFileRead(file);
      const importedRules = extractLogicRules(config);

      let currentRules = [];
      try {
        const currentLogic = await ioboxAPI.getLogicConfig('all');
        currentRules = Array.isArray(currentLogic?.rules) ? currentLogic.rules : [];
      } catch {
        currentRules = [];
      }

      const summary = summarizeRuleChanges(currentRules, importedRules);
      const detailedChanges = getDetailedRuleChanges(currentRules, importedRules);
      const addedCount = detailedChanges.filter((x) => x.type === 'added').length;
      const modifiedCount = detailedChanges.filter((x) => x.type === 'modified').length;
      const removedCount = detailedChanges.filter((x) => x.type === 'removed').length;
      const unchangedCount = detailedChanges.filter((x) => x.type === 'unchanged').length;

      const statusMetaMap = {
        added: { text: 'Added', tagColor: 'success' },
        removed: { text: 'Removed', tagColor: 'error' },
        modified: { text: 'Modified', tagColor: 'warning' },
        unchanged: { text: 'Unchanged', tagColor: 'default' }
      };

      const orderedChanges = [...detailedChanges].sort((a, b) => {
        const order = { modified: 0, added: 1, removed: 2, unchanged: 3 };
        return order[a.type] - order[b.type];
      });

      const majorChanges = orderedChanges.filter((x) => x.type !== 'unchanged');

      const renderRuleSnapshot = (rule) => {
        const normalized = normalizeRuleForDiff(rule);
        return (
          <Descriptions size="small" column={1} colon={false}>
            <Descriptions.Item label="Enabled">{normalized.enabled ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Logic">{normalized.logic || '-'}</Descriptions.Item>
            <Descriptions.Item label="Delay">{normalized.delay}s</Descriptions.Item>
            <Descriptions.Item label="Conditions">{normalized.conditions.length}</Descriptions.Item>
            <Descriptions.Item label="AI1">{`${normalized.analogSettings[0].type} | ${normalized.analogSettings[0].min} - ${normalized.analogSettings[0].max}`}</Descriptions.Item>
            <Descriptions.Item label="AI2">{`${normalized.analogSettings[1].type} | ${normalized.analogSettings[1].min} - ${normalized.analogSettings[1].max}`}</Descriptions.Item>
          </Descriptions>
        );
      };

      Modal.confirm({
        title: 'Confirm Logic Configuration Import',
        icon: <ExclamationCircleOutlined />,
        width: 760,
        okText: 'Apply Logic Rules',
        cancelText: 'Cancel',
        content: (
          <div style={{ marginTop: 8 }}>
            <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
              <Tag>Current: {summary.currentCount}</Tag>
              <Tag>Imported: {summary.importedCount}</Tag>
              <Tag color="success">Added: {addedCount}</Tag>
              <Tag color="warning">Modified: {modifiedCount}</Tag>
              <Tag color="error">Removed: {removedCount}</Tag>
              <Tag>Unchanged: {unchangedCount}</Tag>
            </Space>

            <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
              {majorChanges.length > 0 && (
                <Collapse
                  defaultActiveKey={[]}
                  items={majorChanges.map((change) => {
                    const statusMeta = statusMetaMap[change.type];
                    return {
                      key: change.id,
                      label: (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <Text strong>{change.id}</Text>
                          <Tag color={statusMeta.tagColor}>{statusMeta.text}</Tag>
                        </div>
                      ),
                      children: (
                        <>
                          <Row gutter={[8, 8]}>
                            {change.before && (
                              <Col xs={24} md={12}>
                                <Card size="small" type="inner" title="Before">
                                  {renderRuleSnapshot(change.before)}
                                </Card>
                              </Col>
                            )}
                            {change.after && (
                              <Col xs={24} md={12}>
                                <Card size="small" type="inner" title="After">
                                  {renderRuleSnapshot(change.after)}
                                </Card>
                              </Col>
                            )}
                          </Row>

                          {change.type === 'modified' && change.fieldChanges.length > 0 && (
                            <Card size="small" type="inner" title="Changed Fields" style={{ marginTop: 8 }}>
                              <List
                                size="small"
                                dataSource={change.fieldChanges}
                                renderItem={(line) => (
                                  <List.Item style={{ fontFamily: 'Consolas, Monaco, monospace', padding: '4px 0' }}>
                                    {line}
                                  </List.Item>
                                )}
                              />
                            </Card>
                          )}
                        </>
                      )
                    };
                  })}
                />
              )}
            </div>

            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message="This action will replace current logic rules on the device."
            />
          </div>
        ),
        onOk: () => handleApplyConfig(importedRules)
      });

      message.success('Logic configuration file loaded. Please confirm changes in the popup.');
      return false; // Ngăn upload tự động
    } catch (error) {
      message.error(`Import failed: ${error.message}`);
      return false;
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
          description="Export your current device configuration to a file, or import only logic rules from a JSON file with a confirmation popup before apply."
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
                Import logic configuration by clicking or dragging a JSON file into the area below.
              </Text>
              
              <Dragger
                accept=".json"
                beforeUpload={handleImportConfig}
                showUploadList={false}
                disabled={importing}
                multiple={false}
                style={{ padding: '12px' }}
              >
                <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                  <InboxOutlined style={{ color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text" style={{ marginBottom: 8 }}>
                  {importing ? 'Importing...' : 'Click or drag configuration file to this area'}
                </p>
                <p className="ant-upload-hint" style={{ marginBottom: 0 }}>
                  Only JSON files are supported. The app will show a popup to confirm logic changes before applying.
                </p>
              </Dragger>
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
              <li>Import accepts only logic rules; network settings are ignored</li>
              <li>A confirmation popup will appear before applying imported logic rules</li>
              <li>Consider exporting first as a backup before importing</li>
              <li>To change network settings, configure them separately in Network settings</li>
            </ul>
          }
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Card>
    </div>
  );
};

export default ConfigManager;
