import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAnalyticsSummary } from '../store/slices/analyticsSlice';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const AnalyticsPanel = () => {
  const dispatch = useDispatch();
  const { summary, status } = useSelector((state) => state.analytics);
  const { currentData } = useSelector((state) => state.tanks);
  const { mode } = useSelector((state) => state.theme);
console.log('the current now data',currentData);
  useEffect(() => {
    dispatch(fetchAnalyticsSummary());
  }, [dispatch]);

  const calculateTrends = () => {
    if (!currentData.length) return [];
    
    return currentData.map(tank => ({
      tankNumber: tank.tankNumber,
      volumeTrend: tank.totalVolume > 800 ? 'up' : tank.totalVolume < 300 ? 'down' : 'stable',
      tempTrend: tank.temperature > 25 ? 'up' : tank.temperature < 15 ? 'down' : 'stable',
      efficiency: Math.random() * 100, // Simulated efficiency metric
    }));
  };

  const trends = calculateTrends();

  // Theme classes
  const cardBgClass = mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300';
  const innerBgClass = mode === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  const textClass = mode === 'dark' ? 'text-white' : 'text-gray-900';
  const subtextClass = mode === 'dark' ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`${cardBgClass} rounded-lg p-6 border transition-colors duration-200`}>
      <div className="flex items-center space-x-2 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-400" />
        <h2 className={`text-xl font-bold ${textClass}`}>Analytics Overview</h2>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`${innerBgClass} rounded p-4 transition-colors duration-200`}>
          <p className={`${subtextClass} text-sm mb-1`}>Total Tanks</p>
          <p className="text-2xl font-bold text-blue-400">{summary.total_tanks || 0}</p>
        </div>
        <div className={`${innerBgClass} rounded p-4 transition-colors duration-200`}>
          <p className={`${subtextClass} text-sm mb-1`}>Avg Volume</p>
          <p className="text-2xl font-bold text-green-400">
            {summary.avg_volume?.toFixed(1) || '0.0'}L
          </p>
        </div>
        <div className={`${innerBgClass} rounded p-4 transition-colors duration-200`}>
          <p className={`${subtextClass} text-sm mb-1`}>Avg Temperature</p>
          <p className="text-2xl font-bold text-orange-400">
            {summary.avg_temperature?.toFixed(1) || '0.0'}°C
          </p>
        </div>
        <div className={`${innerBgClass} rounded p-4 transition-colors duration-200`}>
          <p className={`${subtextClass} text-sm mb-1`}>Total Readings</p>
          <p className="text-2xl font-bold text-purple-400">{summary.total_readings || 0}</p>
        </div>
      </div>

      {/* Trend Analysis */}
      <div>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${textClass}`}>
          <Activity className="h-5 w-5 mr-2 text-green-400" />
          Trend Analysis
        </h3>
        
        <div className="space-y-3">
          {trends.map((trend, index) => (
            <div key={index} className={`${innerBgClass} rounded p-3 transition-colors duration-200`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium ${textClass}`}>Tank {trend.tankNumber}</span>
                <div className="flex space-x-2">
                  <div className="flex items-center space-x-1">
                    {trend.volumeTrend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : trend.volumeTrend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    ) : (
                      <div className="h-4 w-4 bg-yellow-400 rounded-full" />
                    )}
                    <span className={`text-xs ${subtextClass}`}>Vol</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {trend.tempTrend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-orange-400" />
                    ) : trend.tempTrend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-blue-400" />
                    ) : (
                      <div className={`h-4 w-4 rounded-full ${mode === 'dark' ? 'bg-gray-400' : 'bg-gray-500'}`} />
                    )}
                    <span className={`text-xs ${subtextClass}`}>Temp</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className={subtextClass}>Efficiency</span>
                <span className="text-green-400 font-medium">
                  {trend.efficiency.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;