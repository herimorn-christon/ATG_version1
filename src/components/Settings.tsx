import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Settings as SettingsIcon, Cloud, Clock, Database, Save, AlertCircle, CheckCircle } from 'lucide-react';

const Settings = () => {
  const { mode } = useSelector((state) => state.theme);
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    cloudSync: {
      enabled: true,
      apiUrl: '/api/v1/report', // Changed to use proxy endpoint
      apiKey: 'YOU3hwGLs9HqZN2t1XLraMef8QWhwWUD',
      ewuraLicenseNo: 'PRL-2010-015',
      syncInterval: 3600, // seconds (1 hour default)
      syncTime: '06:00', // daily sync time
      autoSync: true
    },
    dataCollection: {
      readingInterval: 10, // seconds
      retentionDays: 90,
      autoBackup: true
    },
    notifications: {
      lowFuel: true,
      highTemperature: true,
      systemErrors: true,
      dailyReports: true
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  useEffect(() => {
    // Load settings from localStorage on component mount
    const savedSettings = localStorage.getItem('fuelMonitorSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Ensure we use proxy endpoint for existing saved settings
      if (parsed.cloudSync && parsed.cloudSync.apiUrl && parsed.cloudSync.apiUrl.includes('137.184.53.63')) {
        parsed.cloudSync.apiUrl = '/api/v1/report';
      }
      setSettings(parsed);
    }
  }, []);

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      // Save to localStorage
      localStorage.setItem('fuelMonitorSettings', JSON.stringify(settings));
      // Here you would typically send to backend API
      // await fetch('/api/settings', { method: 'POST', body: JSON.stringify(settings) });
      setTimeout(() => {
        setSaveStatus('success');
        setIsSaving(false);
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 1000);
    } catch (error) {
      setSaveStatus('error');
      setIsSaving(false);
      console.error('Failed to save settings:', error);
    }
  };

  const testCloudConnection = async () => {
    try {
      const testData = {
        ReportNumber: parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, '')),
        EwuraLicenseNo: settings.cloudSync.ewuraLicenseNo,
        Reports: [{
          StartVolume: 1000,
          DeliveryVolume: 0,
          EndVolume: 1000,
          FuelGradeName: "TEST"
        }]
      };

      // Use proxy endpoint instead of direct external URL
      const response = await fetch('/api/v1/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'api-key': settings.cloudSync.apiKey
        },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      alert(`Connection test: ${response.ok ? 'SUCCESS' : 'FAILED'}\nResponse: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      alert(`Connection test FAILED: ${error.message}`);
    }
  };

  const formatInterval = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const baseClasses = mode === 'dark' 
    ? 'bg-gray-800 border-gray-700 text-white' 
    : 'bg-white border-gray-300 text-gray-900';

  const inputClasses = mode === 'dark'
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200
          ${mode === 'dark' 
            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }
        `}
      >
        <SettingsIcon className="h-4 w-4" />
        <span className="text-sm font-medium">Settings</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 flex items-start justify-center z-50 px-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          <div className={`
            relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border shadow-lg
            ${baseClasses} mt-10
          `}>
            {/* Header */}
            <div className="sticky top-0 p-6 border-b border-gray-600 bg-inherit">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center space-x-2">
                  <SettingsIcon className="h-5 w-5 text-blue-400" />
                  <span>System Settings</span>
                </h3>
                <div className="flex items-center space-x-2">
                  {saveStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-400" />}
                  {saveStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-400" />}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Settings Content */}
            <div className="p-6 space-y-8">
              {/* Cloud Sync Settings */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Cloud className="h-5 w-5 text-blue-400" />
                  <h4 className="text-lg font-semibold">Cloud Synchronization</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Enable Cloud Sync
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.cloudSync.enabled}
                        onChange={(e) => handleSettingChange('cloudSync', 'enabled', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Automatically sync data to cloud</span>
                    </label>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      EWURA License No.
                    </label>
                    <input
                      type="text"
                      value={settings.cloudSync.ewuraLicenseNo}
                      onChange={(e) => handleSettingChange('cloudSync', 'ewuraLicenseNo', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                      placeholder="PRL-2010-015"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      API Endpoint
                    </label>
                    <input
                      type="text"
                      value={settings.cloudSync.apiUrl}
                      readOnly
                      className={`w-full px-3 py-2 border rounded-md text-sm bg-gray-600 text-gray-300 cursor-not-allowed`}
                      title="Using proxy endpoint to avoid CORS issues"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Using proxy endpoint to avoid CORS issues. Points to: http://137.184.53.63:5570/api/v1/report
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      API Key
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="password"
                        value={settings.cloudSync.apiKey}
                        onChange={(e) => handleSettingChange('cloudSync', 'apiKey', e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                      />
                      <button
                        onClick={testCloudConnection}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Test Connection
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Sync Interval
                    </label>
                    <select
                      value={settings.cloudSync.syncInterval}
                      onChange={(e) => handleSettingChange('cloudSync', 'syncInterval', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                    >
                      <option value={300}>5 minutes</option>
                      <option value={900}>15 minutes</option>
                      <option value={1800}>30 minutes</option>
                      <option value={3600}>1 hour</option>
                      <option value={7200}>2 hours</option>
                      <option value={14400}>4 hours</option>
                      <option value={28800}>8 hours</option>
                      <option value={86400}>24 hours</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {formatInterval(settings.cloudSync.syncInterval)}
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Daily Sync Time
                    </label>
                    <input
                      type="time"
                      value={settings.cloudSync.syncTime}
                      onChange={(e) => handleSettingChange('cloudSync', 'syncTime', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Daily report sync time
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Collection Settings */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-green-400" />
                  <h4 className="text-lg font-semibold">Data Collection</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Reading Interval (seconds)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="3600"
                      value={settings.dataCollection.readingInterval}
                      onChange={(e) => handleSettingChange('dataCollection', 'readingInterval', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Data Retention (days)
                    </label>
                    <input
                      type="number"
                      min="7"
                      max="365"
                      value={settings.dataCollection.retentionDays}
                      onChange={(e) => handleSettingChange('dataCollection', 'retentionDays', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Auto Backup
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.dataCollection.autoBackup}
                        onChange={(e) => handleSettingChange('dataCollection', 'autoBackup', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Enable automatic backups</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-400" />
                  <h4 className="text-lg font-semibold">Notifications</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.notifications.lowFuel}
                        onChange={(e) => handleSettingChange('notifications', 'lowFuel', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Low fuel alerts</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.notifications.highTemperature}
                        onChange={(e) => handleSettingChange('notifications', 'highTemperature', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">High temperature alerts</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.notifications.systemErrors}
                        onChange={(e) => handleSettingChange('notifications', 'systemErrors', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">System error notifications</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.notifications.dailyReports}
                        onChange={(e) => handleSettingChange('notifications', 'dailyReports', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Daily report notifications</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;