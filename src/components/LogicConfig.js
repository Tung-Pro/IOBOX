import React, { useState, useEffect, useCallback } from 'react';
import { Zap, RefreshCw, Save, Plus, Trash2, Check, X } from 'lucide-react';
import ioboxAPI from '../services/ioboxApi';

const LogicConfig = () => {
  const [logicData, setLogicData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showAddRule, setShowAddRule] = useState(false);

  const [newRule, setNewRule] = useState({
    output: 'DO1',
    enabled: true,
    analogSetting: { min: 0, max: 100, type: 'in_range' },
    conditions: [
      { inputType: 'DI', inputIndex: 1, trigger: 'level', timer: 0 }
    ],
    logic: 'C1'
  });

  

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
      // Ensure backward compatibility: add default analogSetting if missing
      const rulesWithDefaults = (data.rules || []).map(rule => {
        const analog = rule.analogSetting || { min: 0, max: 100, type: 'in_range' };
        return {
          ...rule,
          analogSetting: { ...analog, type: normalizeAnalogType(analog.type) }
        };
      });
      setLogicData(rulesWithDefaults);
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
      const rules = (logicData || []).map(rule => ({
        ...rule,
        analogSetting: (() => {
          const a = rule.analogSetting || { min: 0, max: 100, type: 'in_range' };
          return { ...a, type: normalizeAnalogType(a.type) };
        })()
      }));

      // Basic validation for analogSetting
      for (const [idx, rule] of rules.entries()) {
        const a = rule.analogSetting || { min: 0, max: 100, type: 'in_range' };
        const min = Number(a.min);
        const max = Number(a.max);
        const type = normalizeAnalogType(a.type);
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
          throw new Error(`Rule ${idx + 1}: Min/Max must be valid numbers`);
        }
        if (min > max) {
          throw new Error(`Rule ${idx + 1}: Min cannot be greater than Max`);
        }
        if (type !== 'in_range' && type !== 'out_range') {
          throw new Error(`Rule ${idx + 1}: Type must be 'in_range' or 'out_range'`);
        }
      }
      const resp = await ioboxAPI.configureLogic(rules);
      const applied = resp && typeof resp.applied_rules === 'number' ? resp.applied_rules : rules.length;
      setMessage({ type: 'success', text: `Logic configuration applied successfully! ${applied} rules configured.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCondition = (ruleIndex) => {
    const updatedRules = [...logicData];
    updatedRules[ruleIndex].conditions.push({
      inputType: 'DI',
      inputIndex: 1,
      trigger: 'level',
      timer: 0
    });
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

  const handleAddRule = () => {
    const updatedRules = [...(logicData || []), { ...newRule }];
    setLogicData(updatedRules);
    setShowAddRule(false);
    setNewRule({
      output: 'DO1',
      enabled: true,
      analogSetting: { min: 0, max: 100, type: 'in_range' },
      conditions: [
        { inputType: 'DI', inputIndex: 1, trigger: 'level', timer: 0 }
      ],
      logic: 'C1'
    });
  };

  const handleRemoveRule = (index) => {
    const updatedRules = logicData.filter((_, i) => i !== index);
    setLogicData(updatedRules);
  };

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

  const getOutputOptions = () => [
    { value: 'DO1', label: 'Digital Output 1' },
    { value: 'DO2', label: 'Digital Output 2' },
    { value: 'DO3', label: 'Digital Output 3' },
    { value: 'DO4', label: 'Digital Output 4' }
  ];

  const renderCondition = (condition, conditionIndex, ruleIndex) => (
    <div key={conditionIndex} style={{ 
      background: '#f8f9fa', 
      padding: '15px', 
      borderRadius: '6px', 
      border: '1px solid #e9ecef',
      marginBottom: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <strong>Condition {conditionIndex + 1}</strong>
        <button 
          className="btn btn-danger"
          onClick={() => handleRemoveCondition(ruleIndex, conditionIndex)}
          style={{ padding: '5px 10px', fontSize: '12px' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#6c757d' }}>Input Type</label>
          <select
            value={condition.inputType}
            onChange={(e) => handleUpdateCondition(ruleIndex, conditionIndex, 'inputType', e.target.value)}
            className="form-control"
            style={{ fontSize: '12px' }}
          >
            {getInputTypeOptions().map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ fontSize: '12px', color: '#6c757d' }}>Input Index</label>
          <input
            type="number"
            min="1"
            max="4"
            value={condition.inputIndex}
            onChange={(e) => handleUpdateCondition(ruleIndex, conditionIndex, 'inputIndex', parseInt(e.target.value))}
            className="form-control"
            style={{ fontSize: '12px' }}
          />
        </div>
        
        <div>
          <label style={{ fontSize: '12px', color: '#6c757d' }}>Trigger</label>
          <select
            value={condition.trigger}
            onChange={(e) => handleUpdateCondition(ruleIndex, conditionIndex, 'trigger', e.target.value)}
            className="form-control"
            style={{ fontSize: '12px' }}
          >
            {getTriggerOptions().map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ fontSize: '12px', color: '#6c757d' }}>Timer (ms)</label>
          <input
            type="number"
            min="0"
            value={condition.timer}
            onChange={(e) => handleUpdateCondition(ruleIndex, conditionIndex, 'timer', parseInt(e.target.value))}
            className="form-control"
            style={{ fontSize: '12px' }}
          />
        </div>
      </div>
    </div>
  );

  const renderRule = (rule, ruleIndex) => (
    <div key={ruleIndex} style={{ 
      background: rule.enabled ? '#f8f9fa' : '#f1f3f4', 
      padding: '20px', 
      borderRadius: '6px', 
      border: `2px solid ${rule.enabled ? '#27ae60' : '#e74c3c'}`,
      marginBottom: '20px',
      opacity: rule.enabled ? 1 : 0.7
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, color: '#2c3e50' }}>{rule.output}</h3>
          <button 
            className={`btn ${rule.enabled ? 'btn-success' : 'btn-danger'}`}
            onClick={() => handleToggleRule(ruleIndex)}
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            {rule.enabled ? <Check size={14} /> : <X size={14} />}
            {rule.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <button 
          className="btn btn-danger"
          onClick={() => handleRemoveRule(ruleIndex)}
          style={{ padding: '5px 10px', fontSize: '12px' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px', display: 'block' }}>Logic Expression</label>
        <input
          type="text"
          value={rule.logic}
          onChange={(e) => {
            const updatedRules = [...logicData];
            updatedRules[ruleIndex].logic = e.target.value;
            setLogicData(updatedRules);
          }}
          className="form-control"
          placeholder="C1 && C2"
          style={{ fontFamily: 'monospace', fontSize: '14px' }}
        />
        <small style={{ color: '#6c757d' }}>Use C1, C2, etc. to reference conditions. Operators: && (AND), || (OR), ! (NOT)</small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Analog Setting</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginTop: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6c757d' }}>Type</label>
            <select
              value={(rule.analogSetting && rule.analogSetting.type) || 'in_range'}
              onChange={(e) => {
                const updatedRules = [...logicData];
                const current = updatedRules[ruleIndex].analogSetting || { min: 0, max: 100, type: 'in_range' };
                updatedRules[ruleIndex].analogSetting = { ...current, type: e.target.value };
                setLogicData(updatedRules);
              }}
              className="form-control"
              style={{ fontSize: '12px' }}
            >
              <option value="in_range">in_range</option>
              <option value="out_range">out_range</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6c757d' }}>Min</label>
            <input
              type="number"
              value={(rule.analogSetting && rule.analogSetting.min) ?? 0}
              onChange={(e) => {
                const updatedRules = [...logicData];
                const current = updatedRules[ruleIndex].analogSetting || { min: 0, max: 100, type: 'in_range' };
                updatedRules[ruleIndex].analogSetting = { ...current, min: Number(e.target.value) };
                setLogicData(updatedRules);
              }}
              className="form-control"
              style={{ fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6c757d' }}>Max</label>
            <input
              type="number"
              value={(rule.analogSetting && rule.analogSetting.max) ?? 100}
              onChange={(e) => {
                const updatedRules = [...logicData];
                const current = updatedRules[ruleIndex].analogSetting || { min: 0, max: 100, type: 'in_range' };
                updatedRules[ruleIndex].analogSetting = { ...current, max: Number(e.target.value) };
                setLogicData(updatedRules);
              }}
              className="form-control"
              style={{ fontSize: '12px' }}
            />
          </div>
        </div>
        <small style={{ color: '#6c757d' }}>
          in_range: true when AI is within [min, max]; out_range: true when AI is outside.  
        </small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <strong>Conditions</strong>
          <button 
            className="btn btn-success"
            onClick={() => handleAddCondition(ruleIndex)}
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            <Plus size={14} style={{ marginRight: '5px' }} />
            Add Condition
          </button>
        </div>
        {rule.conditions.map((condition, conditionIndex) => 
          renderCondition(condition, conditionIndex, ruleIndex)
        )}
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className='card-header'>
        <h2>
          <Zap size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Logic Configuration
        </h2>
        <div className='row' style={{ gap: '10px' }}>
          <button className="btn" onClick={loadLogicConfig} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} style={{ marginRight: '8px' }} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button 
            className="btn btn-success" 
            onClick={handleSaveLogic}
            disabled={saving || !logicData}
          >
            <Save size={16} style={{ marginRight: '8px' }} />
            {saving ? 'Saving...' : 'Save Logic'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {loading && !logicData ? (
        <div className="loading">Loading logic configuration...</div>
      ) : (
        <>
          <div className='row-between' style={{ marginBottom: '20px' }}>
            <h3>Logic Rules</h3>
            <button 
              className="btn btn-success"
              onClick={() => setShowAddRule(true)}
            >
              <Plus size={16} style={{ marginRight: '8px' }} />
              Add Rule
            </button>
          </div>

          {showAddRule && (
            <div style={{ 
              background: '#e8f4fd', 
              padding: '20px', 
              borderRadius: '6px', 
              border: '1px solid #bee5eb',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#0c5460' }}>Add New Rule</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d' }}>Output</label>
                  <select
                    value={newRule.output}
                    onChange={(e) => setNewRule({...newRule, output: e.target.value})}
                    className="form-control"
                  >
                    {getOutputOptions().map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d' }}>Logic Expression</label>
                  <input
                    type="text"
                    value={newRule.logic}
                    onChange={(e) => setNewRule({...newRule, logic: e.target.value})}
                    className="form-control"
                    placeholder="C1 && C2"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-success" onClick={handleAddRule}>
                  <Check size={16} style={{ marginRight: '8px' }} />
                  Add Rule
                </button>
                <button className="btn" onClick={() => setShowAddRule(false)}>
                  <X size={16} style={{ marginRight: '8px' }} />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {logicData && logicData.length > 0 ? (
            logicData.map((rule, index) => renderRule(rule, index))
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#6c757d',
              background: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              <Zap size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
              <p>No logic rules configured</p>
              <p style={{ fontSize: '14px' }}>Click "Add Rule" to create your first automation rule</p>
            </div>
          )}

          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: '4px',
            color: '#856404'
          }}>
            <strong>Logic Configuration Help:</strong>
            <ul style={{ margin: '10px 0 0 20px' }}>
              <li><strong>Conditions:</strong> Define input triggers (level, rising_edge, falling_edge)</li>
              <li><strong>Logic Expression:</strong> Use C1, C2, etc. for conditions. Operators: && (AND), || (OR), ! (NOT)</li>
              <li><strong>Timer:</strong> Delay in milliseconds before condition is evaluated</li>
              <li><strong>Analog Setting Type:</strong> Accepted values are <code>in_range</code> and <code>out_range</code>. The app also normalizes common variants like <code>inrange</code>/<code>outrange</code>.</li>
              <li><strong>Example:</strong> "C1 && C2" means both condition 1 AND condition 2 must be true</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default LogicConfig;

