import React, { useState } from 'react';
import { Droplets, AlertTriangle, X } from 'lucide-react';
import { useSelector } from 'react-redux';

const CircularTankIndicator = ({ tank, size = 200 }) => {
  console.log('the tanks is',tank);
  const { tankProducts } = useSelector((state) => state.products);
  const { mode } = useSelector((state) => state.theme);
  console.log('the comming Tanks are',tank);
  //checking the online condition
  const isOnline = tank.status=='online';
// console.log(isOnline)
  const product = tankProducts[tank.tank_number];
  // console.log('the tank product is',product);
  
  // Calculate capacity and percentage correctly
  const totalVolume = tank.totalVolume || 0;
  console.log('the total volume is',totalVolume);
  const ullage = tank.ullage || 0;
  const capacity = totalVolume + ullage;
  const volumePercentage = capacity > 0 ? (totalVolume / capacity) * 100 : 0;
console.log('the volume percentage is',volumePercentage);
  
  const getVolumeColor = (percentage) => {
    if (product?.color) return product.color;
    if (percentage > 70) return '#10b981'; // green
    if (percentage > 30) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getGradientId = (tankNumber) => `tank-gradient-${tankNumber}`;
  
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (volumePercentage / 100) * circumference;

  const bgColor = mode === 'dark' ? 'bg-gray-800' : 'bg-white';
  const borderColor = mode === 'dark' ? 'border-gray-600' : 'border-gray-300';
  const textColor = mode === 'dark' ? 'text-white' : 'text-gray-900';

  // Add state for popup
  const [showDetails, setShowDetails] = useState(false);

  // Add tank details popup component
  const TankDetailsPopup = () => (
    <div className={`absolute z-50 ${bgColor} border ${borderColor} rounded-lg p-4 shadow-lg`}
         style={{ 
           top: '50%', 
           left: '50%', 
           transform: 'translate(-50%, -50%)',
           minWidth: '280px' 
         }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-bold ${textColor}`}>Tank {tank.tank_number} Details</h3>
        <button 
          onClick={() => setShowDetails(false)}
          className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      
      <div className={`space-y-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Total Volume:</div>
          <div>{totalVolume.toFixed(1)}L</div>
          
          <div>Oil Volume:</div>
          <div>{tank.oilVolume?.toFixed(1) || '0.0'}L</div>
          
          <div>Water Volume:</div>
          <div>{tank.waterVolume?.toFixed(1) || '0.0'}L</div>
          
          <div>TC Volume:</div>
          <div>{tank.tcVolume?.toFixed(1) || '0.0'}L</div>
          
          <div>Oil Height:</div>
          <div>{tank.oilHeight?.toFixed(1) || '0.0'}mm</div>
          
          <div>Water Height:</div>
          <div>{tank.waterHeight?.toFixed(1) || '0.0'}mm</div>
          
          <div>Temperature:</div>
          <div>{tank.temperature?.toFixed(1) || '0.0'}°C</div>
          
          <div>Ullage:</div>
          <div>{ullage.toFixed(1)}L</div>
          
          <div>Capacity:</div>
          <div>{capacity.toFixed(1)}L</div>
          
          {product?.pumpNumbers && (
            <>
              <div>Pumps:</div>
              <div>{product.pumpNumbers.join(', ')}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (!isOnline) {
    return (
      <div 
        className={`flex flex-col items-center justify-center ${bgColor} rounded-full border-4 ${borderColor}`}
        style={{ width: size, height: size }}
      >
        <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
        <span className="text-red-400 text-sm font-medium">Offline</span>
        <span className={`text-xs ${mode === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
          Tank {tank.tank_number}
        </span>
      </div>
    );
  }

  // Modify the main circle div to be clickable
  return (
    <div className="relative flex flex-col items-center">
      <div 
        className="relative cursor-pointer" 
        style={{ width: size, height: size }}
        onClick={() => setShowDetails(true)}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            <linearGradient id={getGradientId(tank.tank_number)} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getVolumeColor(volumePercentage)} stopOpacity="0.8" />
              <stop offset="100%" stopColor={getVolumeColor(volumePercentage)} stopOpacity="1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={mode === 'dark' ? '#374151' : '#d1d5db'}
            strokeWidth="8"
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${getGradientId(tank.tank_number)})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            filter="url(#glow)"
            className="transition-all duration-1000 ease-out"
          />
          
          {/* Inner fill effect */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 20}
            fill={getVolumeColor(volumePercentage)}
            fillOpacity={volumePercentage / 400} // Subtle inner glow
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Droplets className="h-6 w-6 text-blue-400 mb-1" />
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: getVolumeColor(volumePercentage) }}>
              {volumePercentage.toFixed(1)}%
            </div>
            <div className={`text-sm ${mode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {totalVolume.toFixed(1)}L
            </div>
            <div className={`text-xs ${mode === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              / {capacity.toFixed(1)}L
            </div>
            <div className={`text-xs mt-1 ${mode === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Tank {tank.tank_number}
            </div>
          </div>
        </div>
      </div>
      
      {/* Product and Temperature indicator */}
      <div className="mt-3 space-y-2">
        {product && (
          <div className={`flex items-center space-x-2 ${bgColor} rounded-full px-3 py-1 border ${borderColor}`}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: product.color }}></div>
            <span className={`text-sm font-medium ${textColor}`}>
              {product.name}
            </span>
          </div>
        )}
        
        <div className={`flex items-center space-x-2 ${bgColor} rounded-full px-3 py-1 border ${borderColor}`}>
          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
          <span className="text-orange-400 text-sm font-medium">
            {tank.temperature?.toFixed(1) || '0.0'}°C
          </span>
        </div>
      </div>
      
      {/* Replace multiple ullage displays with popup trigger */}
      {showDetails && <TankDetailsPopup />}
    </div>
  );
};

export default CircularTankIndicator;