import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SerialPort } from 'serialport';
import pkg from 'pg';
import bcrypt from 'bcrypt';
import { 
  authenticate, 
  authorize, 
  requireRole,
  generateToken, 
  hashPassword, 
  comparePassword,
  PERMISSIONS,
  ROLES 
} from './middleware/auth.js';

const { Pool } = pkg;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'fuel_monitoring',
  password: '2000',
  port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());

// Serial port configuration
const SERIAL_CONFIG = {
  path: '/dev/ttyUSB0',
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  timeout: 5000,
  xon: false,
  xoff: false,
  rtscts: false,
  dsrdtr: false,
  autoOpen: false
};

// ATG command
const ATG_COMMAND = Buffer.from("\x01i20100", 'ascii');

// ATG configuration
const ATG_CONFIG = {
  MAX_TANKS: 5, // Maximum number of tanks to check
  COMMAND_INTERVAL: 5000, // 5 seconds between commands
};

// Initialize database tables
async function initializeDatabase() {
  try {
    // Updated tank_readings table to include start and end volumes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tank_readings (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        tank_number VARCHAR(10),
        total_volume REAL,
        oil_volume REAL,
        water_volume REAL,
        tc_volume REAL,
        ullage REAL,
        oil_height REAL,
        water_height REAL,
        temperature REAL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create daily_volume_tracking table for start/end volumes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_volume_tracking (
        id SERIAL PRIMARY KEY,
        tank_number VARCHAR(10),
        date DATE,
        start_volume REAL,
        end_volume REAL,
        start_oil_volume REAL,
        end_oil_volume REAL,
        start_water_volume REAL,
        end_water_volume REAL,
        delivery_volume REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tank_number, date)
      )
    `);

    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_volume_tracking_date 
      ON daily_volume_tracking(date, tank_number)
    `);
    
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'viewer',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        color VARCHAR(7) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tank products assignment table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tank_products (
        id SERIAL PRIMARY KEY,
        tank_number VARCHAR(10) NOT NULL,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        pump_numbers INTEGER[],
        assigned_at TIMESTAMP DEFAULT NOW(),
        assigned_by INTEGER REFERENCES users(id),
        UNIQUE(tank_number)
      )
    `);

    // User sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create default admin user if no users exist
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      const hashedPassword = await hashPassword('admin123');
      await pool.query(`
        INSERT INTO users (email, password, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@fuelmonitor.com', hashedPassword, 'System', 'Administrator', ROLES.ADMIN]);
      
      console.log('Default admin user created: admin@fuelmonitor.com / admin123');
    }

    // Insert default products if none exist
    const productCount = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCount.rows[0].count) === 0) {
      const defaultProducts = [
        { name: 'Premium Gasoline', color: '#10b981' },
        { name: 'Regular Gasoline', color: '#8b5cf6' },
        { name: 'Diesel', color: '#f59e0b' },
        { name: 'Kerosene', color: '#ef4444' },
        { name: 'Jet Fuel', color: '#06b6d4' },
        { name: 'Heating Oil', color: '#f97316' },
        { name: 'Lubricants', color: '#84cc16' }
      ];

      for (const product of defaultProducts) {
        await pool.query(`
          INSERT INTO products (name, color) VALUES ($1, $2)
        `, [product.name, product.color]);
      }

      // Assign default products to tanks
      await pool.query(`
        INSERT INTO tank_products (tank_number, product_id, pump_numbers)
        SELECT '01', id, ARRAY[1,2] FROM products WHERE name = 'Premium Gasoline'
        UNION ALL
        SELECT '02', id, ARRAY[3,4] FROM products WHERE name = 'Diesel'
        UNION ALL
        SELECT '03', id, ARRAY[5] FROM products WHERE name = 'Kerosene'
        UNION ALL
        SELECT '04', id, ARRAY[6,7,8] FROM products WHERE name = 'Regular Gasoline'
      `);
    }
    
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Function to update daily volume tracking
async function updateDailyVolumeTracking(tankNumber, totalVolume, oilVolume, waterVolume) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we have a record for today
    const existingRecord = await pool.query(`
      SELECT * FROM daily_volume_tracking 
      WHERE tank_number = $1 AND date = $2
    `, [tankNumber, today]);

    if (existingRecord.rows.length === 0) {
      // First reading of the day - set as start volume
      await pool.query(`
        INSERT INTO daily_volume_tracking 
        (tank_number, date, start_volume, end_volume, start_oil_volume, end_oil_volume, start_water_volume, end_water_volume)
        VALUES ($1, $2, $3, $3, $4, $4, $5, $5)
      `, [tankNumber, today, totalVolume, oilVolume, waterVolume]);
      
      console.log(`Set start volume for tank ${tankNumber}: ${totalVolume}L`);
    } else {
      // Update end volume (always update with latest reading)
      await pool.query(`
        UPDATE daily_volume_tracking 
        SET end_volume = $1, end_oil_volume = $2, end_water_volume = $3, updated_at = NOW()
        WHERE tank_number = $4 AND date = $5
      `, [totalVolume, oilVolume, waterVolume, tankNumber, today]);
      
      console.log(`Updated end volume for tank ${tankNumber}: ${totalVolume}L`);
    }
  } catch (error) {
    console.error('Error updating daily volume tracking:', error);
  }
}

// IEEE 754 hex to float conversion (matching Python exactly)
function ieee754HexToFloat(hexStr) {
  if (hexStr.length !== 8) return null;
  
  try {
    const buffer = Buffer.from(hexStr, 'hex');
    return buffer.readFloatBE(0);
  } catch (error) {
    return null;
  }
}

// Parse ATG response (matching Python logic exactly)
function parseATGResponse(response) {
  console.log('Raw ATG response:', response);
  
  // Filter only printable characters like Python's isprintable()
  const cleanedResponse = response.toString().replace(/[^\x20-\x7E]/g, '');
  console.log('Cleaned response:', cleanedResponse);
  
  const [dataPart] = cleanedResponse.split('&&');
  console.log('Data part:', dataPart);
  
  return dataPart;
}

// Update processTankData function to match Python logic
async function processTankData(data) {
  console.log('\n=== Processing Tank Data ===');
  console.log('Raw data:', data);
  
  const tanks = [];

  for (let tankNum = 1; tankNum < ATG_CONFIG.MAX_TANKS; tankNum++) {
    const searchKey = `${tankNum.toString().padStart(2, '0')}0000007`;
    console.log(`\nLooking for Tank ${tankNum} (search key: ${searchKey})`);
    
    const matchIndex = data.indexOf(searchKey);
    
    if (matchIndex !== -1) {
      console.log(`✅ Tank ${tankNum} found at index: ${matchIndex}`);
      
      try {
        // Extract data parts exactly like Python
        const first16Chars = data.substring(0, 16);
        const startIndex = matchIndex + searchKey.length - 1;
        const next56Chars = data.substring(startIndex, startIndex + 56);
        const last6Chars = data.slice(-7, -1); // Python: response[-7:-1]
        
        const resultString = first16Chars + searchKey.substring(0, 8) + next56Chars + last6Chars;
        console.log('Result string:', resultString);
        
        if (resultString.includes('i201')) {
          // Parse timestamp like Python
          const timestamp = resultString.substring(6, 16);
          const tankNumber = resultString.substring(16, 18);
          const numFieldsHex = resultString.substring(23, 25);
          const numFields = parseInt(numFieldsHex, 16);
          
          const timestampFormatted = `20${timestamp.slice(0,2)}-${timestamp.slice(2,4)}-${timestamp.slice(4,6)} ${timestamp.slice(6,8)}:${timestamp.slice(8,10)}`;
          
          console.log('Timestamp:', timestampFormatted);
          console.log('Tank Number:', tankNumber);
          console.log('Number of Fields:', numFields);
          
          // Parse float values
          const floatValues = [];
          let index = 25;
          
          for (let i = 0; i < numFields; i++) {
            const hexValue = resultString.substring(index, index + 8);
            let value = null;
            
            if (hexValue.length === 8) {
              value = ieee754HexToFloat(hexValue);
            }
            
            console.log(`Field ${i} hex: ${hexValue} => ${value}`);
            floatValues.push(value);
            index += 8;
          }
          
          // Match Python labels exactly
          const labels = [
            "Total Volume", 
            "TC Volume",
            "Ullage",
            "Oil Height", 
            "Water Height",
            "Temperature",
            "Water Volume"
          ];
          
          // Create data object like Python
          const parsedData = {};
          labels.forEach((label, idx) => {
            parsedData[label] = floatValues[idx];
          });
          
          // Round values like Python
          const roundedData = {};
          Object.entries(parsedData).forEach(([key, val]) => {
            roundedData[key] = val !== null ? Math.round(val * 10) / 10 : null;
          });
          
          console.log('Rounded data:', roundedData);
          
          // Extract final values
          const totalVolume = roundedData["Total Volume"] || 0;
          const tcVolume = roundedData["TC Volume"] || 0; 
          const ullage = roundedData["Ullage"] || 0;
          const oilHeight = roundedData["Oil Height"] || 0;
          const waterHeight = roundedData["Water Height"] || 0;
          const temperature = roundedData["Temperature"] || 0;
          const waterVolume = roundedData["Water Volume"] || 0;
          
          // Calculate oil volume like Python
          const oilVolume = Math.max(0, totalVolume - waterVolume);
          
          const tankData = {
            timestamp: timestampFormatted,
            tankNumber,
            totalVolume,
            oilVolume: Math.round(oilVolume * 10) / 10,
            waterVolume,
            tcVolume,
            ullage,
            oilHeight,
            waterHeight, 
            temperature,
            status: 'online'
          };
          
          console.log('Final tank data:', tankData);
          
          // Save to database
          await pool.query(`
            INSERT INTO tank_readings (
              timestamp, tank_number, total_volume, oil_volume, water_volume,
              tc_volume, ullage, oil_height, water_height, temperature
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            tankData.timestamp,
            tankData.tankNumber,
            tankData.totalVolume,
            tankData.oilVolume,
            tankData.waterVolume,
            tankData.tcVolume,
            tankData.ullage,
            tankData.oilHeight,
            tankData.waterHeight,
            tankData.temperature
          ]);
          
          // Update daily volume tracking
          await updateDailyVolumeTracking(tankData.tankNumber, tankData.totalVolume, tankData.oilVolume, tankData.waterVolume);
          
          tanks.push(tankData);
          
        } else {
          console.log('❌ Invalid response format - missing i201');
        }
        
      } catch (error) {
        console.error(`Error processing Tank ${tankNum}:`, error);
      }
      
    } else {
      console.log(`⚠️ Tank ${tankNum} offline - search key not found`);
      tanks.push({
        tankNumber: tankNum.toString().padStart(2, '0'),
        status: 'offline'
      });
    }
  }
  
  return tanks;
}

// FIXED: This function now matches Python's logic exactly
function readSerialData(port) {
  return new Promise((resolve, reject) => {
    let response = Buffer.alloc(0);
    let startTime = Date.now();
    
    const dataHandler = (data) => {
      console.log('Raw data chunk received:', data.toString('hex'));
      // Collect ALL data, not just data starting with specific bytes
      response = Buffer.concat([response, data]);
      // Reset timer when new data arrives (like Python does)
      startTime = Date.now();
    };

    port.on('data', dataHandler);

    const checkInterval = setInterval(() => {
      // Stop when no new data for timeout period
      if (Date.now() - startTime >= SERIAL_CONFIG.timeout) {
        clearInterval(checkInterval);
        port.removeListener('data', dataHandler);
        
        if (response.length > 0) {
          console.log('Complete ATG response:', response.toString('hex'));
          console.log('Complete ATG response (string):', response.toString());
          resolve(response);
        } else {
          console.log('No ATG response received within timeout');
          reject(new Error('No ATG response'));
        }
      }
    }, 100);
  });
}

// Update startDataCollection to match Python's main loop
async function startDataCollection() {
  while (true) {
    try {
      if (!serialPort?.isOpen) {
        console.log('Attempting to reconnect serial port...');
        try {
          serialPort = new SerialPort({
            ...SERIAL_CONFIG,
            autoOpen: true
          });
          await new Promise((resolve, reject) => {
            serialPort.on('open', resolve);
            serialPort.on('error', reject);
          });
          console.log('Serial port reconnected');
        } catch (error) {
          console.error('Failed to connect:', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
      }

      // Flush any pending data before sending new command
      serialPort.flush();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay after flush
      
      console.log('\nSending ATG command:', ATG_COMMAND.toString('hex'));
      serialPort.write(ATG_COMMAND);

      const response = await readSerialData(serialPort);
      if (response) {
        const dataPart = parseATGResponse(response);
        if (dataPart) {
          const tanks = await processTankData(dataPart);
          io.emit('tankData', tanks);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.error('Error in collection cycle:', error);
      if (error.message.includes('Port is not open')) {
        serialPort = null; // Force reconnection
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Add global serialPort variable at the top with other constants
let serialPort = null;

// Start the server and initialize database
const PORT = 4000;

server.listen(PORT, async () => {
  try {
    console.log(`Server is running on http://localhost:${PORT}`);
    
    // Initialize database
    await initializeDatabase();
    
    // Initialize serial port
    serialPort = new SerialPort({
      ...SERIAL_CONFIG,
      autoOpen: false
    });

    serialPort.on('open', () => {
      console.log('Serial port opened successfully');
      // Start data collection after port is open
      startDataCollection();
    });

    serialPort.on('error', (error) => {
      console.error('Serial port error:', error);
    });

    // Open the port
    serialPort.open((err) => {
      if (err) {
        console.error('Error opening serial port:', err);
        return;
      }
      console.log(`Serial port ${SERIAL_CONFIG.path} opened`);
    });

  } catch (error) {
    console.error('Server initialization error:', error);
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API routes
app.get('/api/tank-readings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tank_readings ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tank readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Authentication routes
app.post('/api/register', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Create new user
    const newUser = await pool.query(`
      INSERT INTO users (email, password, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [email, hashedPassword, firstName, lastName, ROLES.USER]);
    
    // Generate token
    const token = generateToken(newUser.rows[0]);
    
    res.status(201).json({ user: newUser.rows[0], token });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find the user by email
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if the password matches
    const isPasswordValid = await comparePassword(password, user.rows[0].password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate token
    const token = generateToken(user.rows[0]);
    
    res.json({ user: user.rows[0], token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected route example
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Role-based access control example
app.get('/api/admin', authenticate, authorize(PERMISSIONS.VIEW_USERS), (req, res) => {
  res.json({ message: 'Welcome to the admin panel' });
});

// Data collection endpoint (for manual triggering)
app.post('/api/start-collection', async (req, res) => {
  try {
    // Start the data collection process
    startDataCollection();
    
    res.json({ message: 'Data collection started' });
  } catch (error) {
    console.error('Error starting data collection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serial port test endpoint
app.get('/api/serial-test', async (req, res) => {
  try {
    const port = new SerialPort({
      path: SERIAL_CONFIG.path,
      baudRate: SERIAL_CONFIG.baudRate,
      dataBits: SERIAL_CONFIG.dataBits,
      parity: SERIAL_CONFIG.parity,
      stopBits: SERIAL_CONFIG.stopBits,
      timeout: SERIAL_CONFIG.timeout
    });
    
    port.on('open', () => {
      console.log('Serial port opened');
      
      // Flush any existing data
      port.flush();
      
      // Send test command
      port.write(ATG_COMMAND, (err) => {
        if (err) {
          console.error('Error writing to serial port:', err);
          return res.status(500).json({ error: 'Error writing to serial port' });
        }
        
        console.log('Test command sent');
        
        // Read response
        readSerialData(port)
          .then(response => {
            console.log('Received response:', response.toString());
            res.json({ response: response.toString() });
          })
          .catch(err => {
            console.error('Error reading serial data:', err);
            res.status(500).json({ error: 'Error reading serial data' });
          });
      });
    });
    
    port.on('error', (error) => {
      console.error('Serial port error:', error);
      res.status(500).json({ error: 'Serial port error' });
    });
  } catch (error) {
    console.error('Error initializing serial port:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch-all route for 404 errors
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});