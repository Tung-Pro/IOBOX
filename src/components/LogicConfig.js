import React, { useState, useEffect, useCallback } from 'react';
import { Button, Alert, Select, Spin, Card, Input, InputNumber } from 'antd';
import { ThunderboltOutlined, ReloadOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import ioboxAPI from '../services/ioboxApi';

const LogicConfig = () => {
  const [logicData, setLogicData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  

  

  const normalizeAnalogType = (raw) => {
    const t = String(raw || '').toLowerCase().trim();
    if (t === 'in_range' || t === 'inrange' || t === 'in' || t === 'in-range') return 'in_range';
    if (t === 'out_range' || t === 'outrange' || t === 'out' || t === 'out-range') return 'out_range';
    return 'in_range';
  };

  const loadLogicConfig = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await ioboxAPI.getLogicConfig('all');
      const outputs = ['DO1','DO2','DO3','DO4'];
      const incoming = Array.isArray(data.rules) ? data.rules : [];
      const fixedRules = outputs.map(out => {
        const existing = incoming.find(r => r && r.output === out);
        const analog = (existing && existing.analogSetting) || { min: 0, max: 100, type: 'in_range' };
        return {
          output: out,
          enabled: existing ? existing.enabled !== false : true,
          delay: existing && existing.delay !== undefined ? Number(existing.delay) : 0,
          analogSetting: { ...analog, type: normalizeAnalogType(analog.type) },
          conditions: (existing && Array.isArray(existing.conditions) && existing.conditions.length > 0)
            ? existing.conditions.slice(0, 5)
            : [{ inputType: 'DI', inputIndex: 1, trigger: 'level', timer: 0 }],
          logic: existing && existing.logic ? existing.logic : 'C1'
        };
      });
      setLogicData(fixedRules);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogicConfig();
  }, [loadLogicConfig]);

  const handleSaveLogic = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const rules = (logicData || []).slice(0, 4).map(rule => ({
        ...rule,
        delay: rule.delay !== undefined ? Number(rule.delay) || 0 : 0,
        analogSetting: (() => {
          const a = rule.analogSetting || { min: 0, max: 100, type: 'in_range' };
          return { ...a, type: normalizeAnalogType(a.type) };
        })()
      }));

      // Basic validation for analogSetting and delay
      for (const [idx, rule] of rules.entries()) {
        const a = rule.analogSetting || { min: 0, max: 100, type: 'in_range' };
        const min = Number(a.min);
        const max = Number(a.max);
        const type = normalizeAnalogType(a.type);
        const delay = Number(rule.delay);
        
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
          throw new Error(`Rule ${idx + 1}: Min/Max must be valid numbers`);
        }
        if (min > max) {
          throw new Error(`Rule ${idx + 1}: Min cannot be greater than Max`);
        }
        if (type !== 'in_range' && type !== 'out_range') {
          throw new Error(`Rule ${idx + 1}: Type must be 'in_range' or 'out_range'`);
        }
        if (!Number.isFinite(delay) || delay < 0) {
          throw new Error(`Rule ${idx + 1}: Delay must be a valid number >= 0`);
        }
      }
      await ioboxAPI.configureLogic(rules);
      const enabledCount = rules.filter(r => r && r.enabled !== false).length;
      setMessage({ type: 'success', text: `Logic configuration applied successfully! ${enabledCount} rules configured.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCondition = (ruleIndex) => {
    const updatedRules = [...logicData];
    const rule = updatedRules[ruleIndex];
    if (!rule || rule.conditions.length >= 5) return;
    rule.conditions.push({ inputType: 'DI', inputIndex: 1, trigger: 'level', timer: 0 });
    setLogicData(updatedRules);
  };

  const handleRemoveCondition = (ruleIndex, conditionIndex) => {
    const updatedRules = [...logicData];
    updatedRules[ruleIndex].conditions.splice(conditionIndex, 1);
    setLogicData(updatedRules);
  };

  const handleUpdateCondition = (ruleIndex, conditionIndex, field, value) => {
    const updatedRules = [...logicData];
    updatedRules[ruleIndex].conditions[conditionIndex][field] = value;
    setLogicData(updatedRules);
  };

  // Fixed rules (DO1..DO4): no add/remove rule

  const handleToggleRule = (index) => {
    const updatedRules = [...logicData];
    updatedRules[index].enabled = !updatedRules[index].enabled;
    setLogicData(updatedRules);
  };

  const getInputTypeOptions = () => [
    { value: 'DI', label: 'Digital Input (DI)' },
    { value: 'AI', label: 'Analog Input (AI)' },
    { value: 'AIB', label: 'AIBox Input (AIB)' },
    { value: 'SI', label: 'System Input (SI)' }
  ];

  const getTriggerOptions = () => [
    { value: 'level', label: 'Level' },
    { value: 'rising_edge', label: 'Rising Edge' },
    { value: 'falling_edge', label: 'Falling Edge' }
  ];

  // No output options needed for fixed rules

  const renderCondition = (condition, conditionIndex, ruleIndex) => (
    <Card key={conditionIndex} className="section-card" style={{ 
      marginBottom: '10px',
      background: '#fafbfd',
      border: '1px solid #eef2f7'
    }} size="small">
      <div className="row-between" style={{ marginBottom: '10px' }}>
        <strong>Condition {conditionIndex + 1}</strong>
        <Button
          danger
          size="small"
          onClick={() => handleRemoveCondition(ruleIndex, conditionIndex)}
          icon={<DeleteOutlined />}
        />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#6c757d' }}>Input Type</label>
          <Select
            size="small"
            value={condition.inputType}
            onChange={(val) => handleUpdateCondition(ruleIndex, conditionIndex, 'inputType', val)}
            options={getInputTypeOptions()}
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <label style={{ fontSize: '12px', color: '#6c757d' }}>Input Index</label>
          <InputNumber
            size="small"
            min={1}
            max={condition.inputType === 'AI' ? 2 : 4}
            value={condition.inputIndex}
            onChange={(val) => handleUpdateCondition(ruleIndex, conditionIndex, 'inputIndex', Number(val))}
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <label style={{ fontSize: '12px', color: '#6c757d' }}>Trigger</label>
          <Select
            size="small"
            value={condition.trigger}
            onChange={(val) => handleUpdateCondition(ruleIndex, conditionIndex, 'trigger', val)}
            options={getTriggerOptions()}
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <label style={{ fontSize: '12px', color: '#6c757d' }}>Timer (s)</label>
          <InputNumber
            size="small"
            min={0}
            value={condition.timer}
            onChange={(val) => handleUpdateCondition(ruleIndex, conditionIndex, 'timer', Number(val))}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </Card>
  );

  const renderRule = (rule, ruleIndex) => (
    <Card
      key={ruleIndex}
      className="section-card"
      style={{
        border: `2px solid ${rule.enabled ? '#27ae60' : '#e74c3c'}`,
        marginBottom: '20px',
        opacity: rule.enabled ? 1 : 0.7
      }}
      size="small"
    >
      <div className="row-between" style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, color: '#2c3e50' }}>{rule.output}</h3>
          <Button
            size="small"
            type={rule.enabled ? 'primary' : 'default'}
            danger={!rule.enabled}
            onClick={() => handleToggleRule(ruleIndex)}
            icon={rule.enabled ? <CheckOutlined /> : <CloseOutlined />}
          >
            {rule.enabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
        {/* No delete action for fixed rules */}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px', display: 'block' }}>Logic Expression</label>
        <Input
          value={rule.logic}
          onChange={(e) => {
            const updatedRules = [...logicData];
            updatedRules[ruleIndex].logic = e.target.value;
            setLogicData(updatedRules);
          }}
          placeholder="C1 && C2"
          style={{ fontFamily: 'monospace', fontSize: '14px' }}
        />
        <small style={{ color: '#6c757d' }}>Use C1, C2, etc. to reference conditions. Operators: && (AND), || (OR), ! (NOT)</small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px', display: 'block' }}>Output Delay (seconds)</label>
        <InputNumber
          min={0}
          value={rule.delay !== undefined ? rule.delay : 0}
          onChange={(val) => {
            const updatedRules = [...logicData];
            updatedRules[ruleIndex].delay = Number(val) || 0;
            setLogicData(updatedRules);
          }}
          style={{ width: '100%' }}
          placeholder="0"
        />
        <small style={{ color: '#6c757d' }}>Delay in seconds before output turns ON. Output will only turn ON if logic result is still 1 after the delay period.</small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Analog Setting</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginTop: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6c757d' }}>Type</label>
            <Select
              size="small"
              value={(rule.analogSetting && rule.analogSetting.type) || 'in_range'}
              onChange={(val) => {
                const updatedRules = [...logicData];
                const current = updatedRules[ruleIndex].analogSetting || { min: 0, max: 100, type: 'in_range' };
                updatedRules[ruleIndex].analogSetting = { ...current, type: val };
                setLogicData(updatedRules);
              }}
              options={[{ value: 'in_range', label: 'in_range' }, { value: 'out_range', label: 'out_range' }]}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6c757d' }}>Min</label>
            <InputNumber
              size="small"
              value={(rule.analogSetting && rule.analogSetting.min) ?? 0}
              onChange={(val) => {
                const updatedRules = [...logicData];
                const current = updatedRules[ruleIndex].analogSetting || { min: 0, max: 100, type: 'in_range' };
                updatedRules[ruleIndex].analogSetting = { ...current, min: Number(val) };
                setLogicData(updatedRules);
              }}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6c757d' }}>Max</label>
            <InputNumber
              size="small"
              value={(rule.analogSetting && rule.analogSetting.max) ?? 100}
              onChange={(val) => {
                const updatedRules = [...logicData];
                const current = updatedRules[ruleIndex].analogSetting || { min: 0, max: 100, type: 'in_range' };
                updatedRules[ruleIndex].analogSetting = { ...current, max: Number(val) };
                setLogicData(updatedRules);
              }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <small style={{ color: '#6c757d' }}>
          in_range: true when AI is within [min, max]; out_range: true when AI is outside.  
        </small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <div className="row-between" style={{ marginBottom: '10px' }}>
          <strong>Conditions</strong>
          <Button size="small" type="primary" onClick={() => handleAddCondition(ruleIndex)} icon={<PlusOutlined />} disabled={rule.conditions.length >= 5}>
            Add Condition
          </Button>
        </div>
        {rule.conditions.map((condition, conditionIndex) => 
          renderCondition(condition, conditionIndex, ruleIndex)
        )}
      </div>
    </Card>
  );

  return (
    <div className="card">
      <div className='card-header'>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e8f4fd', display: 'grid', placeItems: 'center' }}>
            <ThunderboltOutlined style={{ fontSize: 18, color: '#0ea5e9' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: '#111827' }}>Logic Configuration</h2>
            <div className="muted-text" style={{ fontSize: 12 }}>Configure 4 fixed rules (DO1–DO4)</div>
          </div>
        </div>
        <div className='row' style={{ gap: 10 }}>
          <Button onClick={loadLogicConfig} disabled={loading} icon={<ReloadOutlined />}> {loading ? 'Loading...' : 'Refresh'} </Button>
          <Button type="primary" onClick={handleSaveLogic} disabled={saving || !logicData} icon={<SaveOutlined />}> {saving ? 'Saving...' : 'Save Logic'} </Button>
        </div>
      </div>

      {message && (
        <Alert style={{ margin: '0 0 16px 0' }} type={message.type === 'warning' ? 'warning' : message.type === 'success' ? 'success' : 'error'} message={message.text} showIcon />
      )}

      {loading && !logicData ? (
        <div className="loading" style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <Spin tip="Loading logic configuration..." />
        </div>
      ) : (
        <>
          <div className='row-between' style={{ marginBottom: '20px' }}>
            <h3>Logic Rules</h3>
          </div>

          {/* No Add Rule section for fixed rules */}

          {logicData && logicData.length > 0 ? (
            logicData.slice(0, 4).map((rule, index) => renderRule(rule, index))
          ) : (
            <Card className="section-card" style={{ textAlign: 'center', color: '#6c757d' }} size="small">
              <ThunderboltOutlined style={{ fontSize: 48, marginBottom: 15, opacity: 0.5 }} />
              <p>No logic rules configured</p>
              <p style={{ fontSize: '14px' }}>There are 4 fixed rules (DO1–DO4). Configure them below.</p>
            </Card>
          )}

          <Alert style={{ marginTop: 20 }}
            type="warning"
            message="Logic Configuration Help"
            description={
              <ul style={{ margin: '10px 0 0 20px' }}>
                <li><strong>Conditions:</strong> Define input triggers (level, rising_edge, falling_edge). AI supports 2 channels, others support 4 channels</li>
                <li><strong>Logic Expression:</strong> Use C1, C2, etc. for conditions. Operators: && (AND), || (OR), ! (NOT)</li>
                <li><strong>Timer:</strong> Delay in seconds before condition is evaluated</li>
                <li><strong>Output Delay:</strong> Delay in seconds before output turns ON. Output will only turn ON if logic result is still 1 after the delay period</li>
                <li><strong>Analog Setting Type:</strong> Accepted values are <code>in_range</code> and <code>out_range</code>. The app also normalizes common variants like <code>inrange</code>/<code>outrange</code>.</li>
                <li><strong>Limits:</strong> Max 5 conditions per rule; 4 fixed rules (DO1–DO4)</li>
                <li><strong>Example:</strong> "C1 && C2" means both condition 1 AND condition 2 must be true</li>
              </ul>
            }
            showIcon
          />
        </>
      )}
    </div>
  );
};

export default LogicConfig;

