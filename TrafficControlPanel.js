import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiActivity, FiAlertTriangle, FiClock, FiPauseCircle,
  FiTrendingUp, FiMapPin, FiRefreshCw
} from 'react-icons/fi';

const TrafficControlPanel = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSystemStatus();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchSystemStatus, 30000); // Refresh every 30 seconds
    }
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchSystemStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/traffic/system-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemStatus(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching system status:', error);
      setLoading(false);
    }
  };

  const getLoadColor = (load) => {
    switch (load) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-blue-500';
      case 'high': return 'bg-yellow-500';
      case 'very_high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getLoadText = (load) => {
    switch (load) {
      case 'low': return 'Light Load';
      case 'medium': return 'Normal';
      case 'high': return 'Busy';
      case 'very_high': return 'Very Busy';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <FiActivity className="mr-2" />
              Traffic Control Center
            </h2>
            <p className="text-white text-opacity-90">Real-time system monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={fetchSystemStatus}
              className="bg-white bg-opacity-20 text-white p-2 rounded-lg hover:bg-opacity-30 transition"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="flex items-center">
              <div className="flex items-center mr-2">
                <div className={`w-3 h-3 rounded-full ${getLoadColor(systemStatus.systemLoad)} mr-1`}></div>
                <span className="text-white font-semibold">
                  {getLoadText(systemStatus.systemLoad)}
                </span>
              </div>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                  <div className={`block w-12 h-6 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${autoRefresh ? 'translate-x-6' : ''}`}></div>
                </div>
                <div className="ml-3 text-white text-sm">Auto-refresh</div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="p-6 border-b">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${systemStatus.isPeakHour ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center">
              <FiClock className={`text-xl ${systemStatus.isPeakHour ? 'text-yellow-600' : 'text-green-600'} mr-3`} />
              <div>
                <div className="font-semibold">Peak Hours</div>
                <div className={systemStatus.isPeakHour ? 'text-yellow-700 font-bold' : 'text-green-700'}>
                  {systemStatus.isPeakHour ? 'ACTIVE' : 'Inactive'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-center">
              <FiTrendingUp className="text-xl text-blue-600 mr-3" />
              <div>
                <div className="font-semibold">System Load</div>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${getLoadColor(systemStatus.systemLoad)} mr-2`}></div>
                  <span className="text-blue-700 font-bold">{getLoadText(systemStatus.systemLoad)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
            <div className="flex items-center">
              <FiMapPin className="text-xl text-purple-600 mr-3" />
              <div>
                <div className="font-semibold">Busy Restaurants</div>
                <div className="text-purple-700 font-bold">
                  {systemStatus.busyRestaurants?.length || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-center">
              <FiAlertTriangle className="text-xl text-red-600 mr-3" />
              <div>
                <div className="font-semibold">Alerts</div>
                <div className="text-red-700 font-bold">
                  {systemStatus.systemLoad === 'very_high' ? '1 Active' : 'None'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Peak Hours & Busy Restaurants */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Peak Hours Schedule */}
          <div>
            <h3 className="text-lg font-bold mb-4">Peak Hours Schedule</h3>
            <div className="space-y-3">
              {Object.entries(systemStatus.peakHours || {}).map(([period, hours]) => (
                <div key={period} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="capitalize font-medium">{period}</div>
                  <div className="text-gray-700">
                    {hours.start}:00 - {hours.end}:00
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    new Date().getHours() >= hours.start && new Date().getHours() <= hours.end
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {new Date().getHours() >= hours.start && new Date().getHours() <= hours.end
                      ? 'Active Now'
                      : 'Inactive'
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Busy Restaurants */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Busy Restaurants</h3>
              <span className="text-sm text-gray-500">
                Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            {systemStatus.busyRestaurants?.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {systemStatus.busyRestaurants.map((restaurant) => (
                  <div key={restaurant._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium">{restaurant.name}</div>
                      <div className="text-sm text-gray-600">
                        {restaurant.orderCount} active orders
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
                        High Load
                      </button>
                      <button className="text-xs px-3 py-1 border border-red-300 text-red-600 rounded-full font-semibold hover:bg-red-50 transition">
                        <FiPauseCircle className="inline mr-1" />
                        Pause
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiActivity className="text-4xl mx-auto mb-2 opacity-50" />
                <p>No restaurants are currently overloaded</p>
                <p className="text-sm">System operating normally</p>
              </div>
            )}
          </div>
        </div>

        {/* System Message */}
        {systemStatus.message && (
          <div className={`mt-6 p-4 rounded-lg ${systemStatus.systemLoad === 'very_high' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex items-start">
              <FiAlertTriangle className={`mt-1 mr-3 ${systemStatus.systemLoad === 'very_high' ? 'text-red-600' : 'text-blue-600'}`} />
              <div>
                <div className={`font-semibold ${systemStatus.systemLoad === 'very_high' ? 'text-red-800' : 'text-blue-800'}`}>
                  System Alert
                </div>
                <p className={`${systemStatus.systemLoad === 'very_high' ? 'text-red-700' : 'text-blue-700'}`}>
                  {systemStatus.message}
                </p>
                {systemStatus.systemLoad === 'very_high' && (
                  <div className="mt-2">
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">
                      Activate Emergency Protocol
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficControlPanel;