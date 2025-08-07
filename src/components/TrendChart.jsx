import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { LineChart, TrendingUp, TrendingDown, Minus } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const TrendChart = () => {
  const { currentData } = useSelector((state) => state.tanks);
  const { tankProducts } = useSelector((state) => state.products);
  const { mode } = useSelector((state) => state.theme);
  const chartRef = useRef();
  const [timeRange, setTimeRange] = useState('24h');

  // Generate mock historical data for demonstration
  const generateHistoricalData = (tank, hours = 24) => {
    const data = [];
    const now = new Date();
    const currentVolume = tank.totalVolume || 0;
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      // Simulate realistic volume changes (±5% variation)
      const variation = (Math.random() - 0.5) * 0.1; // ±5%
      const volume = Math.max(0, currentVolume * (1 + variation));
      
      data.push({
        x: timestamp,
        y: volume
      });
    }
    
    return data;
  };

  // Get color for tank based on product
  const getTankColor = (tank) => {
    const product = tankProducts[tank.tank_number];
    if (product?.color) return product.color;
    
    // Fallback colors
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return colors[tank.tank_number % colors.length];
  };

  // Filter to only show online tanks
  const onlineTanks = currentData.filter(tank => tank.status?.toLowerCase() === 'online');

  const chartData = {
    datasets: onlineTanks.map((tank, index) => {
      const product = tankProducts[tank.tank_number];
      const color = getTankColor(tank);
      
      return {
        label: `Tank ${tank.tank_number} (${product?.name || 'Unknown'})`,
        data: generateHistoricalData(tank, timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720),
        borderColor: color,
        backgroundColor: color + '20', // Add transparency
        tension: 0.4,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
      };
    })
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      title: {
        display: false,
      },
      legend: {
        position: 'bottom',
        labels: {
          color: mode === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 11
          }
        },
      },
      tooltip: {
        backgroundColor: mode === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: mode === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
        bodyColor: mode === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)',
        borderColor: mode === 'dark' ? 'rgb(75, 85, 99)' : 'rgb(209, 213, 219)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}L`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MMM dd',
          },
          tooltipFormat: 'MMM dd, HH:mm'
        },
        grid: {
          color: mode === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.3)',
        },
        ticks: {
          color: mode === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)',
          maxTicksLimit: 8,
        },
        title: {
          display: true,
          text: 'Time',
          color: mode === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)',
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: mode === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.3)',
        },
        ticks: {
          color: mode === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)',
          callback: function(value) {
            return value.toFixed(0) + 'L';
          }
        },
        title: {
          display: true,
          text: 'Volume (L)',
          color: 'rgb(59, 130, 246)',
        },
      },
    },
  };

  // Calculate trend statistics
  const getTrendStats = () => {
    const stats = onlineTanks.map(tank => {
      const currentVolume = tank.totalVolume || 0;
      const product = tankProducts[tank.tank_number];
      
      // Simulate trend calculation (in real app, this would use actual historical data)
      const trend = (Math.random() - 0.5) * 10; // Random trend for demo
      
      return {
        tankNumber: tank.tank_number,
        productName: product?.name || 'Unknown',
        currentVolume,
        trend,
        color: getTankColor(tank)
      };
    });
    
    return stats;
  };

  const trendStats = getTrendStats();

  // Theme classes
  const cardBgClass = mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300';
  const innerBgClass = mode === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  const textClass = mode === 'dark' ? 'text-white' : 'text-gray-900';
  const subtextClass = mode === 'dark' ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="space-y-6">
      {/* Main Chart */}
      <div className={`${cardBgClass} rounded-lg p-6 border transition-colors duration-200`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <LineChart className="h-6 w-6 text-blue-400" />
            <h2 className={`text-xl font-bold ${textClass}`}>Volume Trends Over Time</h2>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-2">
            {['24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-500 text-white'
                    : mode === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-80">
          <Line ref={chartRef} data={chartData} options={options} />
        </div>
      </div>

      {/* Trend Statistics */}
      <div className={`${cardBgClass} rounded-lg p-6 border transition-colors duration-200`}>
        <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Tank Performance Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendStats.map((stat) => (
            <div key={stat.tankNumber} className={`${innerBgClass} rounded-lg p-4 transition-colors duration-200`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: stat.color }}
                  ></div>
                  <span className={`font-medium ${textClass}`}>
                    Tank {stat.tankNumber}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {stat.trend > 1 ? (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  ) : stat.trend < -1 ? (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  ) : (
                    <Minus className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    stat.trend > 1 ? 'text-green-400' : 
                    stat.trend < -1 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {stat.trend > 0 ? '+' : ''}{stat.trend.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className={`text-xs ${subtextClass} mb-1`}>
                {stat.productName}
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`text-sm ${subtextClass}`}>Current Volume:</span>
                <span className={`text-sm font-semibold ${textClass}`}>
                  {stat.currentVolume.toFixed(1)}L
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Overall Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${innerBgClass} rounded-lg p-4 text-center transition-colors duration-200`}>
            <div className="text-2xl font-bold text-blue-400">
              {onlineTanks.reduce((sum, tank) => sum + (tank.totalVolume || 0), 0).toFixed(1)}L
            </div>
            <div className={`${subtextClass} text-sm`}>Total Current Volume</div>
          </div>
          
          <div className={`${innerBgClass} rounded-lg p-4 text-center transition-colors duration-200`}>
            <div className="text-2xl font-bold text-green-400">
              {onlineTanks.length > 0 
                ? (onlineTanks.reduce((sum, tank) => sum + (tank.totalVolume || 0), 0) / onlineTanks.length).toFixed(1)
                : '0.0'
              }L
            </div>
            <div className={`${subtextClass} text-sm`}>Average Volume per Tank</div>
          </div>
          
          <div className={`${innerBgClass} rounded-lg p-4 text-center transition-colors duration-200`}>
            <div className="text-2xl font-bold text-orange-400">
              {onlineTanks.length > 0 
                ? (onlineTanks.reduce((sum, tank) => sum + (tank.temperature || 0), 0) / onlineTanks.length).toFixed(1)
                : '0.0'
              }°C
            </div>
            <div className={`${subtextClass} text-sm`}>Average Temperature</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;