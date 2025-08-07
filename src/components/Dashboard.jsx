import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

// Redux Actions
import { fetchCurrentTanks } from '../store/slices/tankSlice';
import { fetchAnalyticsSummary } from '../store/slices/analyticsSlice';
import { logout } from '../store/slices/authSlice';

// Components
import TankSlider from './TankCard';
import Navigation from './Navigation';
import TankOverview from './TankOverview';
import TrendChart from './TrendChart';
import ThemeToggle from './ThemeToggle';
import Settings from './Settings';

// Icons
import { 
  LogOut, 
  Activity, 
  Droplets, 
  Gauge,
  TrendingUp,
  AlertTriangle,
  Volume2,
  X,
  Eye,
  EyeOff,
  VolumeX
} from 'lucide-react';

import.meta.env; // Ensure Vite env is available

const Dashboard = () => {
  // Hooks
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Redux State
  const { currentData, status, lastUpdated } = useSelector((state) => state.tanks);
  const { summary } = useSelector((state) => state.analytics);
  const { mode } = useSelector((state) => state.theme);
  const { tankProducts } = useSelector((state) => state.products); // Get tank products from Redux
  const token = useSelector((state) => state.auth.token);
  
  // Local State
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [waterAlertActive, setWaterAlertActive] = useState(false);
  const [alarmSound, setAlarmSound] = useState(null);
  const [soundDismissed, setSoundDismissed] = useState(false);
  const [showAlertDetails, setShowAlertDetails] = useState(false);

  // Initialize alarm sound
  useEffect(() => {
    // Create audio context for alarm sound
    const createBeepSound = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // High frequency beep
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.warn('Audio context not available:', error);
      }
    };
    
    setAlarmSound(() => createBeepSound);
  }, []);

  // Get product information for a tank using Redux state (same as TankCard)
  const getProductInfo = (tank) => {
    return tankProducts[tank.tank_number] || null;
  };

  // Get product name for a tank
  const getProductName = (tank) => {
    const product = getProductInfo(tank);
    return product?.name || 'Unknown';
  };

  // Enhanced volume calculation (same as TankCard)
  const getTankVolume = (tank) => {
    // Use the same volume calculation as TankCard
    return tank.totalVolume || tank.tc_volume || tank.oilVolume || tank.volume || 0;
  };

  // Get water level in mm with proper unit handling
  const getWaterLevelMm = (tank) => {
    let waterLevelMm = 0;
    
    // Try different water level fields and handle units properly
    if (tank.waterHeight !== undefined && tank.waterHeight !== null) {
      // Check if waterHeight is already in mm (likely if > 10)
      // or if it's in meters (likely if < 10)
      if (tank.waterHeight > 10) {
        // Assume it's already in mm
        waterLevelMm = tank.waterHeight;
      } else {
        // Assume it's in meters, convert to mm
        waterLevelMm = tank.waterHeight * 1000;
      }
    } else if (tank.waterLevel !== undefined && tank.waterLevel !== null) {
      // Assume waterLevel is already in mm
      waterLevelMm = tank.waterLevel;
    } else if (tank.water_level !== undefined && tank.water_level !== null) {
      waterLevelMm = tank.water_level;
    }
    
    return waterLevelMm;
  };

  // Get tanks with high water levels (75mm or above)
  const getHighWaterTanks = () => {
    return currentData.filter(tank => {
      if (tank.status?.toLowerCase() !== 'online') return false;
      
      const waterLevelMm = getWaterLevelMm(tank);
      return waterLevelMm >= 75;
    });
  };

  // Check for water level alerts
  useEffect(() => {
    const highWaterTanks = getHighWaterTanks();
    
    if (highWaterTanks.length > 0) {
      setWaterAlertActive(true);
      
      // Play alarm sound every 3 seconds if not dismissed
      if (!soundDismissed) {
        const alarmInterval = setInterval(() => {
          if (alarmSound) {
            alarmSound();
          }
        }, 3000);
        
        return () => clearInterval(alarmInterval);
      }
    } else {
      setWaterAlertActive(false);
      setSoundDismissed(false); // Reset sound dismissal when no alerts
    }
  }, [currentData, alarmSound, soundDismissed]);

  // Socket Connection Effect
  useEffect(() => {
    if (!token) return;

    // Use Vite environment variable for socket URL
    const SOCKET_URL = import.meta.env.VITE_API_URL;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    setSocket(newSocket);

    // Socket Event Handlers
    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', (reason) => {
      setConnectionStatus('disconnected');
      console.log('Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      console.log(`Socket reconnect attempt #${attempt}`);
    });

    newSocket.on('tankData', (data) => {
      dispatch({ type: 'tanks/updateRealTimeData', payload: data });
    });

    // Initial data fetch
    dispatch(fetchCurrentTanks());
    dispatch(fetchAnalyticsSummary());

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, [dispatch, token]);

  // Get online tanks only
  const onlineTanks = currentData.filter(tank => tank.status?.toLowerCase() === 'online');
  const highWaterTanks = getHighWaterTanks();

  // IMPROVED: Enhanced metrics calculation using Redux products (same pattern as TankCard)
  const metrics = {
    // Group by product type and sum volumes for online tanks only
    productVolumes: onlineTanks.reduce((acc, tank) => {
      const product = getProductInfo(tank);
      const productName = product?.name || 'Unknown';
      const volume = getTankVolume(tank);
      
      if (!acc[productName]) {
        acc[productName] = 0;
      }
      acc[productName] += volume;
      return acc;
    }, {}),
    totalWaterVolume: onlineTanks.reduce((sum, tank) => {
      return sum + (tank.waterVolume || tank.water_volume || 0);
    }, 0),
    activeTanks: onlineTanks.length,
    alertCount: onlineTanks.filter(tank => {
      const waterLevelMm = getWaterLevelMm(tank);
      return tank.status === 'alert' || 
             tank.level > 90 || 
             waterLevelMm >= 75;
    }).length,
    highWaterTanks: highWaterTanks.length
  };

  // Get primary product volume (highest volume)
  const primaryProductVolume = Math.max(...Object.values(metrics.productVolumes), 0);
  const primaryProductType = Object.keys(metrics.productVolumes).find(
    type => metrics.productVolumes[type] === primaryProductVolume
  ) || 'Product';

  // Event Handlers
  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/login';
    }
  };

  const dismissSound = () => {
    setSoundDismissed(true);
  };

  const toggleAlertDetails = () => {
    setShowAlertDetails(!showAlertDetails);
  };

  // Theme Classes
  const themeClasses = {
    bg: mode === 'dark' ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    text: mode === 'dark' ? 'text-white' : 'text-gray-900',
    subtext: mode === 'dark' ? 'text-gray-400' : 'text-gray-600',
    accent: mode === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
  };

  // Connection Status Indicator
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  // Primary Metrics Configuration
  const primaryMetrics = [
    {
      label: 'Active Tanks',
      value: metrics.activeTanks,
      total: currentData.length,
      icon: Activity,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      unit: '',
      trend: '+2.3%'
    },
    {
      label: `${primaryProductType} Volume`,
      value: primaryProductVolume.toFixed(0),
      icon: Gauge,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      unit: 'L',
      trend: '+1.2%'
    },
    {
      label: 'Water Volume',
      value: metrics.totalWaterVolume.toFixed(0),
      icon: Droplets,
      color: metrics.highWaterTanks > 0 ? 'text-red-500' : 'text-cyan-500',
      bgColor: metrics.highWaterTanks > 0 
        ? (waterAlertActive ? 'bg-red-200 dark:bg-red-900/50' : 'bg-red-50 dark:bg-red-900/20')
        : 'bg-cyan-50 dark:bg-cyan-900/20',
      unit: 'L',
      trend: metrics.highWaterTanks > 0 ? '⚠️ HIGH WATER' : '-0.8%',
      isAlert: metrics.highWaterTanks > 0
    },
    {
      label: 'System Alerts',
      value: metrics.alertCount,
      icon: AlertTriangle,
      color: metrics.alertCount > 0 ? 'text-red-500' : 'text-green-500',
      bgColor: metrics.alertCount > 0 
        ? 'bg-red-50 dark:bg-red-900/20' 
        : 'bg-green-50 dark:bg-green-900/20',
      unit: '',
      trend: metrics.alertCount > 0 ? 'Active' : 'Clear'
    }
  ];

  return (
    <div className={`min-h-screen ${themeClasses.bg} transition-colors duration-300`}>
      {/* Water Level Alert Banner */}
      {metrics.highWaterTanks > 0 && (
        <div className={`
          ${waterAlertActive ? 'bg-red-600' : 'bg-red-500'} 
          text-white px-4 py-4 text-center transition-colors duration-1000 relative
        `}>
          <div className="flex items-center justify-center space-x-3">
            <AlertTriangle className={`h-6 w-6 ${waterAlertActive ? 'animate-pulse' : ''}`} />
            {!soundDismissed && <Volume2 className="h-6 w-6 animate-pulse" />}
            {soundDismissed && <VolumeX className="h-6 w-6" />}
            <div className="text-center">
              <div className="font-bold text-lg mb-1">
                🚨 CRITICAL WATER LEVEL ALERT 🚨
              </div>
              <div className="text-sm">
                {highWaterTanks.length} tank{highWaterTanks.length > 1 ? 's' : ''} with water level ≥ 75mm
              </div>
              <div className="flex items-center justify-center space-x-4 mt-2">
                <button
                  onClick={toggleAlertDetails}
                  className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors"
                >
                  {showAlertDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showAlertDetails ? 'Hide Details' : 'View Details'}</span>
                </button>
                {!soundDismissed && (
                  <button
                    onClick={dismissSound}
                    className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors"
                  >
                    <VolumeX className="h-4 w-4" />
                    <span>Dismiss Sound</span>
                  </button>
                )}
              </div>
            </div>
            <AlertTriangle className={`h-6 w-6 ${waterAlertActive ? 'animate-pulse' : ''}`} />
          </div>
        </div>
      )}

      {/* Professional Header */}
      <header className={`
        border-b sticky top-0 z-50 backdrop-blur-sm
        ${mode === 'dark'
          ? 'bg-gray-900/95 border-gray-800 shadow-lg'
          : 'bg-white/95 border-gray-200 shadow-md'}
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  metrics.highWaterTanks > 0 
                    ? (waterAlertActive ? 'bg-red-600' : 'bg-red-500')
                    : 'bg-gradient-to-br from-blue-500 to-blue-600'
                } transition-colors duration-1000`}>
                  <Droplets className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className={`text-lg font-semibold ${mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <span className="hidden sm:inline">Fuel Tank Monitoring</span>
                    <span className="sm:hidden">Tank Monitor</span>
                  </h1>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                    <span className={`text-xs ${mode === 'dark' ? 'text-gray-400' : 'text-gray-600'} capitalize`}>
                      {connectionStatus}
                    </span>
                    {metrics.highWaterTanks > 0 && (
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        waterAlertActive 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      } transition-colors duration-1000`}>
                        🚨 WATER ALERT
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Navigation & Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Navigation />
              <Settings />
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg font-medium
                  transition-colors duration-200
                  ${mode === 'dark'
                    ? 'bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200'}
                `}
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Key Performance Indicators */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {primaryMetrics.map((metric, index) => {
              const IconComponent = metric.icon;
              return (
                <div 
                  key={index}
                  className={`
                    ${themeClasses.cardBg} rounded-xl p-6 border shadow-sm hover:shadow-md transition-all duration-200
                    ${metric.isAlert && waterAlertActive ? 'animate-pulse ring-2 ring-red-500' : ''}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className={`
                        inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4
                        ${metric.bgColor}
                        ${metric.isAlert && waterAlertActive ? 'animate-pulse' : ''}
                      `}>
                        <IconComponent className={`h-6 w-6 ${metric.color}`} />
                      </div>
                      <p className={`text-sm font-medium ${themeClasses.subtext} mb-1`}>
                        {metric.label}
                        {metric.isAlert && (
                          <span className="ml-2 inline-flex items-center">
                            <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                          </span>
                        )}
                      </p>
                      <div className="flex items-baseline space-x-2">
                        <p className={`text-2xl font-bold ${themeClasses.text}`}>
                          {metric.value}
                          <span className="text-sm font-normal ml-1">{metric.unit}</span>
                        </p>
                        {metric.total && (
                          <span className={`text-sm ${themeClasses.subtext}`}>
                            /{metric.total}
                          </span>
                        )}
                      </div>
                      {metric.trend && (
                        <div className="flex items-center mt-2">
                          {metric.isAlert ? (
                            <AlertTriangle className="h-3 w-3 text-red-500 mr-1 animate-pulse" />
                          ) : (
                            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                          )}
                          <span className={`text-xs font-semibold ${
                            metric.isAlert 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {metric.trend}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* High Water Level Details */}
        {highWaterTanks.length > 0 && showAlertDetails && (
          <section>
            <div className={`${themeClasses.cardBg} rounded-xl border-2 border-red-500 shadow-lg overflow-hidden ${
              waterAlertActive ? 'animate-pulse' : ''
            }`}>
              <div className="p-6 border-b border-red-500 bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
                    <h2 className={`text-lg font-bold text-red-600 dark:text-red-400`}>
                      Critical Water Level Alert - Immediate Action Required
                    </h2>
                    <Volume2 className="h-6 w-6 text-red-500 animate-pulse" />
                  </div>
                  <button
                    onClick={toggleAlertDetails}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className={`text-sm text-red-600 dark:text-red-400 mt-1`}>
                  The following tanks have water levels at or above 75mm threshold
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {highWaterTanks.map((tank, index) => {
                    const product = getProductInfo(tank);
                    const productName = getProductName(tank);
                    const waterLevelMm = getWaterLevelMm(tank);
                    const waterVolume = tank.waterVolume || tank.water_volume || 0;
                    const oilVolume = getTankVolume(tank);
                    const temperature = tank.temperature || 0;
                    
                    return (
                      <div key={tank.tank_number || index} className={`
                        bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 
                        rounded-lg p-4 ${waterAlertActive ? 'animate-pulse' : ''}
                      `}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-red-700 dark:text-red-300">
                              Tank {tank.tank_number}
                            </h3>
                            {product && (
                              <div className="flex items-center space-x-1">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: product.color }}
                                ></div>
                              </div>
                            )}
                          </div>
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-red-600 dark:text-red-400">Product:</span>
                            <span className="font-semibold text-red-700 dark:text-red-300">
                              {productName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600 dark:text-red-400">Water Level:</span>
                            <span className="font-bold text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-800 px-2 py-1 rounded">
                              {waterLevelMm.toFixed(1)}mm
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600 dark:text-red-400">Water Volume:</span>
                            <span className="font-semibold text-red-700 dark:text-red-300">
                              {waterVolume.toFixed(1)}L
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600 dark:text-red-400">Oil Volume:</span>
                            <span className="font-semibold text-red-700 dark:text-red-300">
                              {oilVolume.toFixed(1)}L
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600 dark:text-red-400">Temperature:</span>
                            <span className="font-semibold text-red-700 dark:text-red-300">
                              {temperature.toFixed(1)}°C
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600 dark:text-red-400">Status:</span>
                            <span className="font-semibold text-red-700 dark:text-red-300 capitalize">
                              {tank.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Product Volume Breakdown */}
        <section>
          <div className={`${themeClasses.cardBg} rounded-xl border shadow-sm overflow-hidden`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className={`text-lg font-semibold ${themeClasses.text}`}>
                Product Volume Breakdown
              </h2>
              <p className={`text-sm ${themeClasses.subtext} mt-1`}>
                Volume by fuel type (online tanks only)
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(metrics.productVolumes).map(([productType, volume]) => (
                  <div key={productType} className={`${themeClasses.accent} rounded-lg p-4 text-center`}>
                    <div className={`text-xl font-bold ${themeClasses.text}`}>
                      {volume.toFixed(0)}L
                    </div>
                    <div className={`text-sm ${themeClasses.subtext} capitalize`}>
                      {productType}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tank Overview */}
        <section>
          <div className={`${themeClasses.cardBg} rounded-xl border shadow-sm overflow-hidden`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className={`text-lg font-semibold ${themeClasses.text}`}>
                Tank Overview
              </h2>
              <p className={`text-sm ${themeClasses.subtext} mt-1`}>
                Real-time monitoring of all fuel tanks
              </p>
            </div>
            <div className="p-6">
              <TankOverview />
            </div>
          </div>
        </section>

        {/* Tank Details & Analytics */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Tank Cards - Takes 2/3 width on xl screens */}
          <div className="xl:col-span-2">
            <div className={`${themeClasses.cardBg} rounded-xl border shadow-sm overflow-hidden`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className={`text-lg font-semibold ${themeClasses.text}`}>
                  Tank Details
                </h2>
                <p className={`text-sm ${themeClasses.subtext} mt-1`}>
                  Detailed view of individual tank status and metrics
                </p>
              </div>
              <div className="p-6">
                <TankSlider />
              </div>
            </div>
          </div>

          {/* Trend Chart - Takes 1/3 width on xl screens */}
          <div className="xl:col-span-1">
            <div className={`${themeClasses.cardBg} rounded-xl border shadow-sm overflow-hidden h-full`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className={`text-lg font-semibold ${themeClasses.text}`}>
                  Trends & Analytics
                </h2>
                <p className={`text-sm ${themeClasses.subtext} mt-1`}>
                  Historical data and performance trends
                </p>
              </div>
              <div className="p-6 h-full">
                <TrendChart />
              </div>
            </div>
          </div>
        </section>

        {/* System Status Footer */}
        <section className="mt-8">
          <div className={`${themeClasses.cardBg} rounded-xl border shadow-sm p-4`}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className={themeClasses.subtext}>
                  Last Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
                </span>
                <span className={themeClasses.subtext}>
                  Status: {status || 'Unknown'}
                </span>
                <span className={themeClasses.subtext}>
                  Online Tanks: {metrics.activeTanks}/{currentData.length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                <span className={`${themeClasses.subtext} capitalize`}>
                  {connectionStatus}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;