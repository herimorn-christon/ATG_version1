# Fuel Tank Monitoring System

A comprehensive fuel tank monitoring system with real-time data collection, advanced analytics, and modern web interface.

## Features

- **Real-time ATG Communication**: Serial port communication with Automatic Tank Gauging systems
- **PostgreSQL Database**: Robust data storage with analytics capabilities
- **Live Dashboard**: Real-time updates via WebSocket connections
- **Advanced Analytics**: Trend analysis, volume tracking, and temperature monitoring
- **Redux State Management**: Efficient data flow and state management
- **Responsive Design**: Modern UI that works on all devices

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Serial port access (for ATG communication)

## Database Setup

1. Install PostgreSQL and create a database named `fuel_monitoring`
2. Update the database connection settings in `server/index.js`
3. The application will automatically create the required tables

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development servers:
```bash
npm run dev
```

This will start both the frontend (Vite) and backend (Node.js) servers concurrently.

## Configuration

### Serial Port
Update the serial port configuration in `server/index.js`:
```javascript
const SERIAL_CONFIG = {
  path: 'COM7', // Change to your actual port
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1
};
```

### Database
Update the PostgreSQL connection settings in `server/index.js`:
```javascript
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'fuel_monitoring',
  password: 'your_password',
  port: 5432,
});
```

## API Endpoints

- `GET /api/tanks/current` - Get current tank readings
- `GET /api/tanks/history/:tankNumber` - Get historical data for a specific tank
- `GET /api/analytics/summary` - Get analytics summary

## Development Mode

When no serial port is available, the application runs in simulation mode with mock data for development purposes.

## Production Deployment

1. Build the frontend:
```bash
npm run build
```

2. Serve the built files and run the backend server
3. Ensure PostgreSQL is properly configured and accessible
4. Configure the serial port for your production environment

## Technology Stack

- **Frontend**: React, Redux Toolkit, Chart.js, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: PostgreSQL
- **Communication**: Serial Port API, WebSocket
- **Build Tool**: Vite