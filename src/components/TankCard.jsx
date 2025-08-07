import React from 'react';
import { useSelector } from 'react-redux';
import { Droplets, Thermometer, AlertTriangle, CheckCircle } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const TankCard = ({ tank }) => {
  const { tankProducts } = useSelector((state) => state.products);
  const { mode } = useSelector((state) => state.theme);

  const isOnline = tank.status?.toLowerCase() === 'online';
  const product = tankProducts[tank.tank_number];
  const totalVolume = tank.totalVolume || 0;
  const ullage = tank.ullage || 0;
  const capacity = totalVolume + ullage;
  const volumePercentage = capacity > 0 ? (totalVolume / capacity) * 100 : 0;

  const getVolumeColor = (percentage) => {
    if (product?.color) return product.color;
    if (percentage > 70) return 'text-green-400';
    if (percentage > 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBgVolumeColor = (percentage) => {
    if (product?.color) return product.color;
    if (percentage > 70) return '#10B981';
    if (percentage > 30) return '#FBBF24';
    return '#F87171';
  };

  const cardBgClass = mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300';
  const innerBgClass = mode === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  const textClass = mode === 'dark' ? 'text-white' : 'text-gray-900';
  const subtextClass = mode === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const progressBgClass = mode === 'dark' ? 'bg-gray-700' : 'bg-gray-300';

  return (
    <div className={`${cardBgClass} rounded-lg p-6 border w-full h-full flex flex-col justify-between`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Droplets className="h-5 w-5 text-blue-400" />
          <h3 className={`text-lg font-semibold ${textClass}`}>Tank {tank.tank_number}</h3>
          {product && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: product.color }}></div>
              <span className={`text-xs ${subtextClass}`}>{product.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {isOnline ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-400" />
          )}
          <span className={`text-sm ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {isOnline ? (
        <>
          {/* Volume Indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className={`${subtextClass} text-sm`}>Volume Level</span>
              <span className={`text-sm font-medium ${getVolumeColor(volumePercentage)}`}>
                {volumePercentage.toFixed(1)}%
              </span>
            </div>
            <div className={`w-full ${progressBgClass} rounded-full h-3 overflow-hidden`}>
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.max(volumePercentage, 0)}%`,
                  backgroundColor: getBgVolumeColor(volumePercentage)
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className={`font-bold ${getVolumeColor(volumePercentage)}`}>
                {totalVolume.toFixed(1)}L
              </span>
              <span className={subtextClass}>
                / {capacity.toFixed(1)}L
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`${innerBgClass} rounded p-3`}>
              <p className={`${subtextClass} text-xs mb-1`}>TC Volume</p>
              <p className="text-blue-400 font-semibold">{tank.tc_volume?.toFixed(1) || '0.0'}L</p>
            </div>
            <div className={`${innerBgClass} rounded p-3`}>
              <p className={`${subtextClass} text-xs mb-1`}>Ullage</p>
              <p className="text-purple-400 font-semibold">{ullage.toFixed(1)}L</p>
            </div>
            <div className={`${innerBgClass} rounded p-3`}>
              <p className={`${subtextClass} text-xs mb-1`}>Oil Height</p>
              <p className="text-yellow-400 font-semibold">{tank.oilHeight?.toFixed(2) || '0.00'}m</p>
            </div>
            <div className={`${innerBgClass} rounded p-3`}>
              <p className={`${subtextClass} text-xs mb-1`}>Water Height</p>
              <p className="text-cyan-400 font-semibold">{tank.waterHeight?.toFixed(2) || '0.00'}m</p>
            </div>
          </div>

          {/* Capacity Info */}
          <div className={`${innerBgClass} rounded p-3 mb-4`}>
            <div className="flex justify-between items-center">
              <span className={`${subtextClass} text-sm`}>Tank Capacity</span>
              <span className={`${textClass} font-semibold`}>{capacity.toFixed(1)}L</span>
            </div>
          </div>

          {/* Temperature and Pump Info */}
          <div className="space-y-3">
            <div className={`flex items-center justify-between ${innerBgClass} rounded p-3`}>
              <div className="flex items-center space-x-2">
                <Thermometer className="h-4 w-4 text-orange-400" />
                <span className={`${subtextClass} text-sm`}>Temperature</span>
              </div>
              <span className="text-orange-400 font-semibold">
                {tank.temperature?.toFixed(1) || '0.0'}°C
              </span>
            </div>

            {product?.pumpNumbers && (
              <div className={`${innerBgClass} rounded p-3`}>
                <div className="flex justify-between items-center">
                  <span className={`${subtextClass} text-sm`}>Pump Numbers</span>
                  <span className={`${textClass} font-semibold`}>
                    {product.pumpNumbers.join(', ')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {tank.timestamp && (
            <div className={`mt-3 text-xs ${subtextClass} text-center`}>
              Updated: {new Date(tank.timestamp).toLocaleString()}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-2" />
          <p className={subtextClass}>Tank is offline</p>
          <p className={`text-sm ${subtextClass}`}>No data available</p>
        </div>
      )}
    </div>
  );
};

const TankSlider = () => {
  const { currentData } = useSelector((state) => state.tanks);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <Swiper
        modules={[Navigation]}
        spaceBetween={24}
        slidesPerView={1}
        navigation
        loop={true}
        className="tank-slider"
      >
        {currentData?.map((tank) => (
          <SwiperSlide key={tank.tank_number} className="h-full">
            <div className="h-full">
              <TankCard tank={tank} />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default TankSlider;