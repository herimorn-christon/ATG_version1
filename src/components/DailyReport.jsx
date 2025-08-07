import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector }  from 'react-redux';
import { fetchDailyReport, fetchTankReport, updateFilters } from '../store/slices/reportSlice';
import { FileText, Calendar, Clock, Download, Filter, TrendingUp, TrendingDown, Cloud, Send, X } from 'lucide-react';

const DailyReport = () => {
  const dispatch = useDispatch();
  const { dailyReport, filters, status } = useSelector((state) => state.reports);
  const { tankProducts } = useSelector((state) => state.products);
  const { mode } = useSelector((state) => state.theme);
  const [isOpen, setIsOpen] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle');

  useEffect(() => {
    dispatch(fetchDailyReport(filters));
  }, [dispatch, filters]);

  const handleFilterChange = (newFilters) => {
    dispatch(updateFilters(newFilters));
  };

  const exportReport = () => {
    if (!dailyReport) return;
    const csvContent = [
      ['Tank', 'Product', 'Start Volume', 'End Volume', 'Opening Volume', 'Closing Volume', 'Volume Change', 'Oil Volume', 'Water Volume', 'Avg Temperature', 'Readings Count'],
      ...dailyReport.tanks.map(tank => [
        tank.tank_number,
        tankProducts[tank.tank_number]?.name || 'Unknown',
        tank.start_volume?.toFixed(1) || '0.0',
        tank.end_volume?.toFixed(1) || '0.0',
        tank.opening_total_volume?.toFixed(1) || '0.0',
        tank.closing_total_volume?.toFixed(1) || '0.0',
        tank.total_volume_change?.toFixed(1) || '0.0',
        tank.closing_oil_volume?.toFixed(1) || '0.0',
        tank.closing_water_volume?.toFixed(1) || '0.0',
        tank.avg_temperature?.toFixed(1) || '0.0',
        tank.readings_count || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuel-report-${filters.date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const sendToCloud = async () => {
    if (!dailyReport) return;

    setCloudSyncStatus('sending');
    try {
      const settings = JSON.parse(localStorage.getItem('fuelMonitorSettings') || '{}');
      const reportNumber = parseInt(filters.date.replace(/-/g, ''));

      // Update mapping with uppercase keys and values
      const fuelGradeMap = {
        'PREMIUM GASOLINE': 'UNLEADED',
        'REGULAR GASOLINE': 'UNLEADED',
        'DIESEL': 'DIESEL',
        'KEROSENE': 'KEROSENE'
      };
      
      const cloudData = {
        ReportNumber: reportNumber,
        EwuraLicenseNo: settings.cloudSync?.ewuraLicenseNo || 'PRL-2010-015',
        Reports: dailyReport.tanks.map(tank => {
          // Convert product name to uppercase for matching
          const productName = (tankProducts[tank.tank_number]?.name || '').toUpperCase();
          const fuelGradeName = fuelGradeMap[productName];
          
          // Debug logging
          console.log('Tank Details:', {
            tankNumber: tank.tank_number,
            originalProduct: tankProducts[tank.tank_number]?.name,
            uppercaseProduct: productName,
            mappedFuelGrade: fuelGradeName,
            rawProduct: tankProducts[tank.tank_number]
          });

          if (!fuelGradeName) {
            console.warn(`Warning: No fuel grade mapping found for product: ${productName}`);
          }

          return {
            StartVolume: Math.round(tank.start_volume || tank.opening_total_volume || 0),
            DeliveryVolume: Math.round(Math.max(0, (tank.closing_total_volume || 0) - (tank.opening_total_volume || 0))),
            EndVolume: Math.round(tank.end_volume || tank.closing_total_volume || 0),
            FuelGradeName: fuelGradeName
          };
        }).filter(report => report.FuelGradeName) // Only include reports with valid fuel grades
      };

      // Log final payload for verification
      console.log('Cloud Sync Payload:', JSON.stringify(cloudData, null, 2));

      const response = await fetch('/api/v1/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'api-key': settings.cloudSync?.apiKey || 'YOU3hwGLs9HqZN2t1XLraMef8QWhwWUD'
        },
        body: JSON.stringify(cloudData)
      });

      const result = await response.json();
      console.log('Cloud Sync Response:', result);

      if (response.ok) {
        setCloudSyncStatus('success');
        alert('Data successfully sent to cloud!');
      } else {
        setCloudSyncStatus('error');
        alert(`Failed to send data: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      setCloudSyncStatus('error');
      alert(`Error sending data: ${error.message}`);
    }

    setTimeout(() => setCloudSyncStatus('idle'), 3000);
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
        <FileText className="h-4 w-4" />
        <span className="text-sm font-medium">Daily Report</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 flex items-start justify-center z-[9999] px-4 py-8">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          <div
            className={`
              relative w-full max-w-[90vw] max-h-[85vh] overflow-hidden rounded-lg border shadow-xl
              ${baseClasses}
              mt-10
            `}
          >
            {/* Header */}
            <div className="sticky top-0 p-4 sm:p-6 border-b border-gray-600 bg-inherit z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-400" />
                  <span>Daily Fuel Report</span>
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`
                    p-2 rounded-lg transition-colors duration-200 hover:bg-gray-600
                    ${mode === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                  `}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) => handleFilterChange({ date: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={filters.startTime}
                    onChange={(e) => handleFilterChange({ startTime: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={filters.endTime}
                    onChange={(e) => handleFilterChange({ endTime: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>Report for {new Date(filters.date).toLocaleDateString()}</span>
                  <Clock className="h-4 w-4 ml-4" />
                  <span>{filters.startTime} - {filters.endTime}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={sendToCloud}
                    disabled={!dailyReport || cloudSyncStatus === 'sending'}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium
                      ${cloudSyncStatus === 'success' ? 'bg-green-600 hover:bg-green-700' :
                        cloudSyncStatus === 'error' ? 'bg-red-600 hover:bg-red-700' :
                        'bg-blue-600 hover:bg-blue-700'
                      } text-white disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {cloudSyncStatus === 'sending' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    <span>
                      {cloudSyncStatus === 'sending' ? 'Sending...' :
                       cloudSyncStatus === 'success' ? 'Sent!' :
                       cloudSyncStatus === 'error' ? 'Failed' : 'Send to Cloud'}
                    </span>
                  </button>
                  <button
                    onClick={exportReport}
                    disabled={!dailyReport}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Report Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
              {status === 'loading' ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="mt-2 text-gray-400">Loading report...</p>
                </div>
              ) : dailyReport ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className={`p-4 rounded-lg ${mode === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
                      <p className="text-sm text-gray-400">Total Oil Volume</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-400">
                        {dailyReport.summary?.total_oil_volume?.toFixed(1) || '0.0'}L
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${mode === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
                      <p className="text-sm text-gray-400">Total Water Volume</p>
                      <p className="text-xl sm:text-2xl font-bold text-cyan-400">
                        {dailyReport.summary?.total_water_volume?.toFixed(1) || '0.0'}L
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${mode === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
                      <p className="text-sm text-gray-400">Avg Temperature</p>
                      <p className="text-xl sm:text-2xl font-bold text-orange-400">
                        {dailyReport.summary?.avg_temperature?.toFixed(1) || '0.0'}°C
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${mode === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
                      <p className="text-sm text-gray-400">Active Tanks</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-400">
                        {dailyReport.tanks?.length || 0}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${mode === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
                      <p className="text-sm text-gray-400">Total Readings</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-400">
                        {dailyReport.summary?.total_readings || 0}
                      </p>
                    </div>
                  </div>

                  {/* Tank Details Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className={`border-b ${mode === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                          <th className="text-left py-3 px-2 sm:px-4">Tank</th>
                          <th className="text-left py-3 px-2 sm:px-4">Product</th>
                          <th className="text-left py-3 px-2 sm:px-4">Start Vol.</th>
                          <th className="text-left py-3 px-2 sm:px-4">End Vol.</th>
                          <th className="text-left py-3 px-2 sm:px-4">Opening</th>
                          <th className="text-left py-3 px-2 sm:px-4">Closing</th>
                          <th className="text-left py-3 px-2 sm:px-4">Change</th>
                          <th className="text-left py-3 px-2 sm:px-4">Oil Vol.</th>
                          <th className="text-left py-3 px-2 sm:px-4">Water Vol.</th>
                          <th className="text-left py-3 px-2 sm:px-4">Avg Temp</th>
                          <th className="text-left py-3 px-2 sm:px-4">Pumps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyReport.tanks?.map((tank) => {
                          const product = tankProducts[tank.tank_number];
                          const volumeChange = tank.total_volume_change || 0;
                          return (
                            <tr key={tank.tank_number} className={`border-b ${mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                              <td className="py-3 px-2 sm:px-4 font-medium">Tank {tank.tank_number}</td>
                              <td className="py-3 px-2 sm:px-4">
                                <div className="flex items-center space-x-2">
                                  {product && (
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: product.color }}
                                    />
                                  )}
                                  <span>{product?.name || 'Unknown'}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-green-400 font-medium">
                                {tank.start_volume?.toFixed(1) || tank.opening_total_volume?.toFixed(1) || '0.0'}L
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-red-400 font-medium">
                                {tank.end_volume?.toFixed(1) || tank.closing_total_volume?.toFixed(1) || '0.0'}L
                              </td>
                              <td className="py-3 px-2 sm:px-4">{tank.opening_total_volume?.toFixed(1) || '0.0'}L</td>
                              <td className="py-3 px-2 sm:px-4">{tank.closing_total_volume?.toFixed(1) || '0.0'}L</td>
                              <td className="py-3 px-2 sm:px-4">
                                <div className="flex items-center space-x-1">
                                  {volumeChange > 0 ? (
                                    <TrendingUp className="h-4 w-4 text-green-400" />
                                  ) : volumeChange < 0 ? (
                                    <TrendingDown className="h-4 w-4 text-red-400" />
                                  ) : null}
                                  <span className={volumeChange > 0 ? 'text-green-400' : volumeChange < 0 ? 'text-red-400' : ''}>
                                    {volumeChange > 0 ? '+' : ''}{volumeChange.toFixed(1)}L
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-blue-400">{tank.closing_oil_volume?.toFixed(1) || '0.0'}L</td>
                              <td className="py-3 px-2 sm:px-4 text-cyan-400">{tank.closing_water_volume?.toFixed(1) || '0.0'}L</td>
                              <td className="py-3 px-2 sm:px-4 text-orange-400">{tank.avg_temperature?.toFixed(1) || '0.0'}°C</td>
                              <td className="py-3 px-2 sm:px-4 text-sm text-gray-400">
                                {product?.pumpNumbers?.join(', ') || 'None'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">No data available for selected period</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReport;