import axios from 'axios';

class IOBoxAPI {
  constructor(baseURL = '') {
    // Load from localStorage if available, otherwise use provided baseURL
    const savedURL = localStorage.getItem('iobox_base_url') || baseURL;
    this.baseURL = savedURL;
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // Increased timeout for HTTPS
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('API Error:', error.message);
        if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
          throw new Error('Cannot connect to IOBOX device. The device may not have its web server enabled or may be using a different port. Please check the device configuration.');
        }
        if (error.response) {
          // Server responded with error status
          throw new Error(`Server error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          // Request was made but no response received
          throw new Error('No response from IOBOX device. Please check if the device is powered on and the web interface is enabled.');
        } else {
          // Something else happened
          throw new Error(`Connection error: ${error.message}`);
        }
      }
    );
  }

  // 1. Get device information
  async getDeviceInfo() {
    try {
      const response = await this.api.get('/api/iobox/info');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get device info: ${error.message}`);
    }
  }

  // 2. Get network configuration
  async getNetworkConfig(type = 'current') {
    try {
      const response = await this.api.get(`/api/iobox/network?type=${type}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get network config: ${error.message}`);
    }
  }

  // 3. Configure static network
  async configureNetwork(config) {
    try {
      const response = await this.api.post('/api/iobox/network', config);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to configure network: ${error.message}`);
    }
  }

  // 4. Get IO status
  async getIOStatus(type = 'all') {
    try {
      const response = await this.api.get(`/api/iobox/io?type=${type}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get IO status: ${error.message}`);
    }
  }

  // 5. Control AIB or SI inputs
  async controlInput(type, index, value) {
    try {
      const payload = {
        type: type, // 'AIB' or 'SI'
        index: Array.isArray(index) ? index : [index],
        value: Array.isArray(value) ? value : [value]
      };
      const response = await this.api.post('/api/iobox/control-input', payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to control input: ${error.message}`);
    }
  }

  // 6. Get logic configuration
  async getLogicConfig(output = 'all') {
    try {
      const response = await this.api.get(`/api/iobox/logic?output=${output}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get logic config: ${error.message}`);
    }
  }

  // 7. Configure logic rules
  async configureLogic(rules) {
    try {
      const payload = { rules };
      const response = await this.api.post('/api/iobox/logic', payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to configure logic: ${error.message}`);
    }
  }

  // 8. Factory reset device
  async factoryReset() {
    try {
      const response = await this.api.post('/api/iobox/factory_reset');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to factory reset: ${error.message}`);
    }
  }

  // Utility method to update base URL
  updateBaseURL(newURL) {
    this.baseURL = newURL;
    this.api.defaults.baseURL = newURL;
    // Save to localStorage for persistence across page reloads
    if (newURL) {
      localStorage.setItem('iobox_base_url', newURL);
    } else {
      localStorage.removeItem('iobox_base_url');
    }
  }

  getBaseURL() {
    return this.baseURL;
  }

  // Test connection to device
  async testConnection() {
    try {
      await this.getDeviceInfo();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get all device configuration for export
  async getAllConfig() {
    try {
      const [deviceInfo, networkConfig, ioStatus, logicConfig] = await Promise.allSettled([
        this.getDeviceInfo(),
        this.getNetworkConfig('current'),
        this.getIOStatus('all'),
        this.getLogicConfig('all')
      ]);

      return {
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
    } catch (error) {
      throw new Error(`Failed to get all configuration: ${error.message}`);
    }
  }

  // Apply configuration from import
  async applyConfig(config) {
    try {
      const results = [];
      
      // Apply logic configuration if available
      if (config.logicConfig?.rules) {
        try {
          await this.configureLogic(config.logicConfig.rules);
          results.push('Logic configuration applied');
        } catch (error) {
          results.push(`Logic config failed: ${error.message}`);
        }
      }
      
      return {
        success: true,
        results: results,
        message: `Configuration applied successfully! Results: ${results.join(', ')}`
      };
    } catch (error) {
      throw new Error(`Failed to apply configuration: ${error.message}`);
    }
  }
}

// Create and export a singleton instance
const ioboxAPI = new IOBoxAPI();
export default ioboxAPI;
