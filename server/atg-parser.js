import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { DelimiterParser } from '@serialport/parser-delimiter';
import { Transform } from 'stream';

// METHOD 1: Using Delimiter Parser (Most Efficient)
class ATGDelimiterParser extends DelimiterParser {
  constructor() {
    // ATG responses end with && followed by checksum
    super({ delimiter: Buffer.from('&&'), includeDelimiter: true });
  }
}

// METHOD 2: Custom Transform Stream Parser
class ATGStreamParser extends Transform {
  constructor() {
    super();
    this.buffer = Buffer.alloc(0);
  }

  _transform(chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    
    // Look for complete ATG response pattern
    const response = this.buffer.toString();
    const endMarker = response.indexOf('&&');
    
    if (endMarker !== -1) {
      // Found complete response
      const completeResponse = this.buffer.slice(0, endMarker + 6); // Include checksum
      this.push(completeResponse);
      
      // Keep remaining data for next response
      this.buffer = this.buffer.slice(endMarker + 6);
    }
    
    callback();
  }
}

// METHOD 3: Event-Driven with Smart Buffering
class EfficientATGReader {
  constructor(serialConfig) {
    this.port = new SerialPort(serialConfig);
    this.buffer = Buffer.alloc(0);
    this.responseCallbacks = [];
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.port.on('data', (data) => {
      this.buffer = Buffer.concat([this.buffer, data]);
      this.processBuffer();
    });
  }

  processBuffer() {
    const response = this.buffer.toString();
    const endMarkerIndex = response.indexOf('&&');
    
    if (endMarkerIndex !== -1) {
      // Extract complete response including checksum (typically 4 chars after &&)
      const endIndex = endMarkerIndex + 6;
      const completeResponse = this.buffer.slice(0, endIndex);
      
      // Notify waiting callbacks
      const callback = this.responseCallbacks.shift();
      if (callback) {
        callback(null, completeResponse);
      }
      
      // Remove processed data from buffer
      this.buffer = this.buffer.slice(endIndex);
      
      // Process remaining data if any
      if (this.buffer.length > 0) {
        this.processBuffer();
      }
    }
  }

  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      // Add callback to queue
      this.responseCallbacks.push((error, response) => {
        if (error) reject(error);
        else resolve(response);
      });

      // Send command
      this.port.write(command, (err) => {
        if (err) {
          this.responseCallbacks.pop(); // Remove callback on error
          reject(err);
        }
      });

      // Timeout handling
      setTimeout(() => {
        const callbackIndex = this.responseCallbacks.indexOf(this.responseCallbacks[0]);
        if (callbackIndex !== -1) {
          this.responseCallbacks.splice(callbackIndex, 1);
          reject(new Error('Response timeout'));
        }
      }, 5000);
    });
  }
}

// METHOD 4: Promise-based with Proper State Management
class ModernATGClient {
  constructor(serialConfig) {
    this.config = serialConfig;
    this.port = null;
    this.isConnected = false;
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.dataCallback = null;
    this.ieee754Cache = new Map();
    this.MAX_CACHE_SIZE = 1000;
  }

  async connect() {
    if (this.isConnected) return;

    this.port = new SerialPort(this.config);
    
    // Use delimiter parser for automatic message splitting
    const parser = this.port.pipe(new ATGDelimiterParser());
    
    parser.on('data', (data) => {
      this.handleResponse(data);
    });

    await new Promise((resolve, reject) => {
      this.port.on('open', () => {
        this.isConnected = true;
        console.log('ATG Client connected successfully');
        resolve();
      });
      this.port.on('error', reject);
    });
  }

  handleResponse(data) {
    // Process response and notify callback
    if (this.dataCallback) {
      const parsedData = this.parseATGResponse(data);
      if (parsedData) {
        this.dataCallback(parsedData);
      }
    }
    
    // Handle pending requests
    if (this.pendingRequests.size > 0) {
      const [requestId, { resolve }] = this.pendingRequests.entries().next().value;
      this.pendingRequests.delete(requestId);
      resolve(data);
    }
  }

  // Set callback for continuous data monitoring
  onData(callback) {
    this.dataCallback = callback;
  }

  async sendCommand(command, timeout = 5000) {
    if (!this.isConnected) {
      throw new Error('Not connected to serial port');
    }

    const requestId = ++this.requestId;
    
    return new Promise((resolve, reject) => {
      // Store request
      this.pendingRequests.set(requestId, { resolve, reject });

      // Set timeout
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, timeout);

      // Send command
      this.port.write(command, (err) => {
        if (err) {
          clearTimeout(timeoutId);
          this.pendingRequests.delete(requestId);
          reject(err);
        }
      });
    });
  }

  // Optimized IEEE 754 conversion with caching
  ieee754HexToFloat(hexStr) {
    if (hexStr.length !== 8) return null;
    
    // Check cache first
    if (this.ieee754Cache.has(hexStr)) {
      return this.ieee754Cache.get(hexStr);
    }
    
    try {
      const buffer = Buffer.from(hexStr, 'hex');
      const value = buffer.readFloatBE(0);
      
      // Add to cache with size limit
      if (this.ieee754Cache.size >= this.MAX_CACHE_SIZE) {
        const firstKey = this.ieee754Cache.keys().next().value;
        this.ieee754Cache.delete(firstKey);
      }
      this.ieee754Cache.set(hexStr, value);
      
      return value;
    } catch (error) {
      return null;
    }
  }

  parseATGResponse(response) {
    const cleanedResponse = response.toString().replace(/[^\x20-\x7E]/g, '');
    const [dataPart] = cleanedResponse.split('&&');
    return dataPart;
  }

  // Process tank data using the same logic as your server
  async processTankData(data) {
    console.log('\n=== Processing Tank Data ===');
    
    const tankPromises = [];
    const ATG_CONFIG = { MAX_TANKS: 5 };
    
    // Process all tanks in parallel
    for (let tankNum = 1; tankNum < ATG_CONFIG.MAX_TANKS; tankNum++) {
      tankPromises.push(this.processSingleTank(data, tankNum));
    }
    
    const results = await Promise.allSettled(tankPromises);
    const tanks = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        tanks.push(result.value);
      } else {
        tanks.push({
          tankNumber: (index + 1).toString().padStart(2, '0'),
          status: 'offline'
        });
      }
    });
    
    return tanks;
  }

  // Process individual tank data
  async processSingleTank(data, tankNum) {
    const searchKey = `${tankNum.toString().padStart(2, '0')}0000007`;
    const matchIndex = data.indexOf(searchKey);
    
    if (matchIndex === -1) {
      console.log(`⚠️ Tank ${tankNum} offline - search key not found`);
      return null;
    }

    console.log(`✅ Tank ${tankNum} found at index: ${matchIndex}`);
    
    try {
      // Extract data parts exactly like your Python logic
      const first16Chars = data.substring(0, 16);
      const startIndex = matchIndex + searchKey.length - 1;
      const next56Chars = data.substring(startIndex, startIndex + 56);
      const last6Chars = data.slice(-7, -1);
      
      const resultString = first16Chars + searchKey.substring(0, 8) + next56Chars + last6Chars;
      
      if (!resultString.includes('i201')) {
        console.log('❌ Invalid response format - missing i201');
        return null;
      }

      // Parse timestamp and tank info
      const timestamp = resultString.substring(6, 16);
      const tankNumber = resultString.substring(16, 18);
      const numFieldsHex = resultString.substring(23, 25);
      const numFields = parseInt(numFieldsHex, 16);
      
      const timestampFormatted = `20${timestamp.slice(0,2)}-${timestamp.slice(2,4)}-${timestamp.slice(4,6)} ${timestamp.slice(6,8)}:${timestamp.slice(8,10)}`;
      
      // Parse float values efficiently
      const floatValues = [];
      let index = 25;
      
      for (let i = 0; i < numFields; i++) {
        const hexValue = resultString.substring(index, index + 8);
        const value = hexValue.length === 8 ? this.ieee754HexToFloat(hexValue) : null;
        floatValues.push(value);
        index += 8;
      }
      
      // Match your Python labels exactly
      const labels = [
        "Total Volume", 
        "TC Volume",
        "Ullage",
        "Oil Height", 
        "Water Height",
        "Temperature",
        "Water Volume"
      ];
      
      // Create and round data
      const parsedData = {};
      labels.forEach((label, idx) => {
        const value = floatValues[idx];
        parsedData[label] = value !== null ? Math.round(value * 10) / 10 : null;
      });
      
      // Extract final values
      const totalVolume = parsedData["Total Volume"] || 0;
      const tcVolume = parsedData["TC Volume"] || 0; 
      const ullage = parsedData["Ullage"] || 0;
      const oilHeight = parsedData["Oil Height"] || 0;
      const waterHeight = parsedData["Water Height"] || 0;
      const temperature = parsedData["Temperature"] || 0;
      const waterVolume = parsedData["Water Volume"] || 0;
      
      // Calculate oil volume
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
      
      return tankData;
      
    } catch (error) {
      console.error(`Error processing Tank ${tankNum}:`, error);
      return null;
    }
  }

  async getTankData() {
    const command = Buffer.from('\x01i20100', 'ascii');
    const response = await this.sendCommand(command);
    const parsedData = this.parseATGResponse(response);
    return await this.processTankData(parsedData);
  }

  disconnect() {
    if (this.port && this.isConnected) {
      this.port.close();
      this.isConnected = false;
    }
  }
}

export { 
  ATGDelimiterParser, 
  ATGStreamParser, 
  EfficientATGReader, 
  ModernATGClient 
};