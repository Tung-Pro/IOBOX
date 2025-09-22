# IOBOX Controller Web Application

A modern React-based web application for controlling and monitoring ANS IOBOX devices.

## Features

- **Device Information**: View device model, serial numbers, firmware versions, and network details
- **Network Configuration**: Configure static IP settings for the IOBOX device
- **IO Monitoring**: Real-time monitoring of all input/output states with auto-refresh
- **Input Control**: Control AIBox Input (AIB) and System Input (SI) channels
- **Logic Configuration**: Set up automation rules with conditions and logic expressions
- **Connection Management**: Easy IP address configuration and connection testing

## Device Information

Your IOBOX device details:
- **Model**: ANS IOBOX
- **Serial**: E831CDB4915F
- **IP Address**: 192.168.101.34
- **MAC Address**: e831cdb4915f

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install

   ```

2. **Start Development Server**
   ```bash
   npm start
   ```

3. **Open Browser**
   Navigate to `http://localhost:3000`

4. **Configure Connection**
   - Click the "Settings" button in the top-right corner
   - Enter your IOBOX IP address (default: 192.168.101.34)
   - Test the connection and save

## Usage Guide

### Device Info Tab
- Displays comprehensive device information
- Shows current network configuration
- Lists available sockets

### Network Tab
- View current network settings
- Configure static IP address
- Set subnet mask and gateway
- **Warning**: Network changes may temporarily disconnect the device

### IO Monitor Tab
- Real-time monitoring of all IO states:
  - **AI**: Analog Input (1 channel) - voltage/current measurement
  - **DI**: Digital Input (4 channels) - read-only digital states
  - **AIB**: AIBox Input (4 channels) - controllable input states
  - **SI**: System Input (4 channels) - system-level input states
  - **DO**: Digital Output (4 channels) - digital output control
- Auto-refresh with configurable intervals (0.5s to 5s)

### Input Control Tab
- Control AIB and SI input channels
- Toggle individual channels or set all on/off
- Visual feedback with color-coded states
- Only sends changed values to the device

### Logic Configuration Tab
- Create automation rules for digital outputs
- Define conditions with input types, triggers, and timers
- Use logic expressions (C1 && C2, C1 || C2, etc.)
- Enable/disable rules individually

## API Endpoints Used

The application communicates with your IOBOX device using these endpoints:

1. `GET /api/iobox/info` - Device information
2. `GET /api/iobox/network?type=current` - Current network config
3. `GET /api/iobox/network?type=staticConfig` - Static network config
4. `POST /api/iobox/network` - Configure network
5. `GET /api/iobox/io?type=all` - All IO states
6. `POST /api/iobox/control-input` - Control AIB/SI inputs
7. `GET /api/iobox/logic?output=all` - Logic configuration
8. `POST /api/iobox/logic` - Configure logic rules

## Troubleshooting

### Connection Issues
- Verify the IOBOX IP address is correct
- Ensure your computer and IOBOX are on the same network
- Check firewall settings
- Try pinging the device: `ping 192.168.101.34`

### Network Configuration
- Make sure you can access the device on the new IP before applying changes
- Have a backup way to access the device (serial console, etc.)
- Test connectivity after network changes

### Logic Configuration
- Use proper logic syntax: C1, C2, etc. for conditions
- Valid operators: && (AND), || (OR), ! (NOT)
- Example: "C1 && C2" means both conditions must be true

## Development

### Project Structure
```
src/
├── components/
│   ├── DeviceInfo.js          # Device information display
│   ├── NetworkConfig.js       # Network configuration
│   ├── IOMonitor.js          # IO monitoring with auto-refresh
│   ├── InputControl.js       # AIB/SI input control
│   ├── LogicConfig.js        # Logic rule configuration
│   └── ConnectionSettings.js # IP address configuration
├── services/
│   └── ioboxApi.js           # API service layer
├── App.js                    # Main application component
├── index.js                  # Application entry point
└── index.css                 # Global styles
```

### Building for Production
```bash
npm run build
```

This creates an optimized build in the `build/` folder.

## License

This project is created for controlling ANS IOBOX devices.

# IOBOX
# IOBOX
