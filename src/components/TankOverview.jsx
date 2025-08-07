import React from 'react';
import { useSelector } from 'react-redux';
import CircularTankIndicator from './CircularTankIndicator';
import { Fuel, Activity } from 'lucide-react';

const TankOverview = () => {
  const { currentData } = useSelector((state) => state.tanks);
  const { tankProducts } = useSelector((state) => state.products);
  const { mode } = useSelector((state) => state.theme);

  // Debug logging
  console.log('TankOverview Debug:');
  console.log('currentData:', currentData);
  console.log('tankProducts:', tankProducts);
  
  const activeTanks = currentData.filter(tank => tank.status !== 'offline');
  const totalVolume = activeTanks.reduce((sum, tank) => sum + (tank.totalVolume || 0), 0);
  const totalCapacity = activeTanks.reduce((sum, tank) => {
    const volume = tank.totalVolume || 0;
    const ullage = tank.ullage || 0;
    return sum + volume + ullage;
  }, 0);
  const avgTemperature = activeTanks.length > 0
    ? activeTanks.reduce((sum, tank) => sum + (tank.temperature || 0), 0) / activeTanks.length
    : 0;

  // Theme classes
  const cardBgClass = mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300';
  const innerBgClass = mode === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  const textClass = mode === 'dark' ? 'text-white' : 'text-gray-900';
  const subtextClass = mode === 'dark' ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`${cardBgClass} rounded-lg p-6 border transition-colors duration-200`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Fuel className="h-6 w-6 text-blue-400" />
          <h2 className={`text-xl font-bold ${textClass}`}>Tank Overview</h2>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-green-400" />
            <span className="text-green-400">{activeTanks.length} Active</span>
          </div>
          <div className={subtextClass}>
            Total: {totalVolume.toFixed(1)}L / {totalCapacity.toFixed(1)}L
          </div>
        </div>
      </div>

      {/* Circular Tank Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
        {currentData.map((tank, index) => {
          // Debug each tank
          console.log(`Tank ${index}:`, tank);
          console.log(`Tank keys:`, Object.keys(tank));
          
          // Try multiple possible tank identifier fields
          const tankId = tank.tank_number || tank.tankNumber || tank.id || tank.number || (index + 1);
          console.log(`Tank ID for lookup:`, tankId);
          
          // Try different ways to find the product
          const product = tankProducts[tankId] || 
                         tankProducts[String(tankId)] || 
                         tankProducts[`${tankId}`] ||
                         tankProducts[parseInt(tankId)] ||
                         null;
          
          console.log(`Product found:`, product);
          console.log(`Available tankProducts keys:`, Object.keys(tankProducts || {}));

          return (
            <div key={tankId || index} className="flex flex-col items-center">
              {/* FIXED: CircularTankIndicator already shows product name, so we don't duplicate it here */}
              <CircularTankIndicator tank={tank} size={180} />

              {/* Additional tank info - removed duplicate product display */}
              {tankId && (
                <div className={`mt-2 ${innerBgClass} rounded-lg p-3 w-full max-w-[180px] transition-colors duration-200`}>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className={subtextClass}>Capacity:</span>
                      <div className={`${textClass} font-medium`}>
                        {((tank.totalVolume || 0) + (tank.ullage || 0)).toFixed(1)}L
                      </div>
                    </div>
                    <div>
                      <span className={subtextClass}>Oil Height:</span>
                      <div className="text-yellow-400 font-medium">
                        {tank.oilHeight?.toFixed(2) || '0.00'}m
                      </div>
                    </div>
                    <div>
                      <span className={subtextClass}>Water:</span>
                      <div className="text-cyan-400 font-medium">
                        {tank.waterHeight?.toFixed(2) || '0.00'}m
                      </div>
                    </div>
                    <div>
                      <span className={subtextClass}>TC Vol:</span>
                      <div className="text-blue-400 font-medium">
                        {tank.tc_volume?.toFixed(1) || '0.0'}L
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${innerBgClass} rounded-lg p-4 text-center transition-colors duration-200`}>
          <div className="text-2xl font-bold text-blue-400">{totalVolume.toFixed(1)}L</div>
          <div className={`${subtextClass} text-sm`}>Total Volume</div>
          <div className={`text-xs ${subtextClass}`}>of {totalCapacity.toFixed(1)}L capacity</div>
        </div>
        <div className={`${innerBgClass} rounded-lg p-4 text-center transition-colors duration-200`}>
          <div className="text-2xl font-bold text-orange-400">{avgTemperature.toFixed(1)}°C</div>
          <div className={`${subtextClass} text-sm`}>Average Temperature</div>
        </div>
        <div className={`${innerBgClass} rounded-lg p-4 text-center transition-colors duration-200`}>
          <div className="text-2xl font-bold text-green-400">{activeTanks.length}/{currentData.length}</div>
          <div className={`${subtextClass} text-sm`}>Active Tanks</div>
          <div className={`text-xs ${subtextClass}`}>
            {totalCapacity > 0 ? ((totalVolume / totalCapacity) * 100).toFixed(1) : 0}% total fill
          </div>
        </div>
      </div>
    </div>
  );
};

export default TankOverview;