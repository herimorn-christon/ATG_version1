import React from 'react';
import { useSelector } from 'react-redux';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

const StatusIndicator = ({ status }) => {
  const { mode } = useSelector((state) => state.theme);
  
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-400',
          bgColor: mode === 'dark' ? 'bg-green-400/20' : 'bg-green-100',
          text: 'Connected',
        };
      case 'connecting':
        return {
          icon: AlertCircle,
          color: 'text-yellow-400',
          bgColor: mode === 'dark' ? 'bg-yellow-400/20' : 'bg-yellow-100',
          text: 'Connecting...',
        };
      default:
        return {
          icon: WifiOff,
          color: 'text-red-400',
          bgColor: mode === 'dark' ? 'bg-red-400/20' : 'bg-red-100',
          text: 'Disconnected',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${config.bgColor} transition-colors duration-200`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
      {status === 'connected' && (
        <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')} animate-pulse`} />
      )}
    </div>
  );
};

export default StatusIndicator;