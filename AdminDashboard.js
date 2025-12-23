import React, { useState, useEffect } from 'react';
import { 
  FiShoppingCart, FiUsers, FiDollarSign, FiTrendingUp, 
  FiPackage, FiHome, FiPieChart, FiBarChart2 
} from 'react-icons/fi';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('weekly');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [dashboardRes, analyticsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:5000/api/admin/analytics/revenue?period=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStats(dashboardRes.data.statistics);
      setRecentOrders(dashboardRes.data.recentOrders);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₹${stats?.totalRevenue?.toLocaleString() || '0'}`,
      icon: <FiDollarSign className="text-2xl" />,
      change: '+12.5%',
      color: 'bg-green-500'
    },
    {
      title: 'Today\'s Orders',
      value: stats?.todayOrders || '0',
      icon: <FiShoppingCart className="text-2xl" />,
      change: '+8.2%',
      color: 'bg-blue-500'
    },
    {
      title: 'Total Users',
      value: stats?.totalUsers || '0',
      icon: <FiUsers className="text-2xl" />,
      change: '+5.7%',
      color: 'bg-purple-500'
    },
    {
      title: 'Restaurants',
      value: stats?.totalRestaurants || '0',
      icon: <FiHome className="text-2xl" />,
      change: '+3.4%',
      color: 'bg-orange-500'
    }
  ];

  // Mock data for charts
  const revenueData = [
    { date: 'Mon', revenue: 45000, orders: 120 },
    { date: 'Tue', revenue: 52000, orders: 135 },
    { date: 'Wed', revenue: 48000, orders: 125 },
    { date: 'Thu', revenue: 61000, orders: 155 },
    { date: 'Fri', revenue: 72000, orders: 180 },
    { date: 'Sat', revenue: 68000, orders: 170 },
    { date: 'Sun', revenue: 55000, orders: 140 }
  ];

  const cuisineData = [
    { name: 'Italian', value: 35, color: '#FF6B35' },
    { name: 'Chinese', value: 25, color: '#4CAF50' },
    { name: 'Indian', value: 20, color: '#2196F3' },
    { name: 'Mexican', value: 15, color: '#FFC107' },
    { name: 'Others', value: 5, color: '#9C27B0' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600">Monitor and manage your food delivery platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                <div className={card.color.replace('bg-', 'text-')}>
                  {card.icon}
                </div>
              </div>
              <span className="text-green-500 text-sm font-semibold">
                {card.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{card.value}</h3>
            <p className="text-gray-600">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center">
              <FiTrendingUp className="mr-2 text-primary" />
              Revenue Overview
            </h2>
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border rounded-lg px-3 py-1"
            >
              <option value="daily">Last 7 Days</option>
              <option value="weekly">Last 30 Days</option>
              <option value="monthly">Last 12 Months</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  labelStyle={{ color: '#333' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#FF6B35" 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#4CAF50" 
                  strokeWidth={2}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cuisine Distribution */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <FiPieChart className="mr-2 text-primary" />
            Cuisine Distribution
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cuisineData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {cuisineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center">
              <FiPackage className="mr-2 text-primary" />
              Recent Orders
            </h2>
            <button className="text-primary font-semibold">View All</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Order ID</th>
                  <th className="text-left py-3 px-2">Customer</th>
                  <th className="text-left py-3 px-2">Restaurant</th>
                  <th className="text-left py-3 px-2">Amount</th>
                  <th className="text-left py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="font-medium">{order._id.slice(-8)}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div>{order.user?.name}</div>
                      <div className="text-gray-500 text-sm">{order.user?.email}</div>
                    </td>
                    <td className="py-3 px-2">{order.restaurant?.name}</td>
                    <td className="py-3 px-2 font-semibold">₹{order.totalAmount}</td>
                    <td className="py-3 px-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.orderStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-bold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-orange-600 transition">
                Add New Restaurant
              </button>
              <button className="w-full py-3 border border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition">
                View All Orders
              </button>
              <button className="w-full py-3 border border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition">
                Manage Users
              </button>
              <button className="w-full py-3 border border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition">
                Generate Reports
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-bold mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">API Server</span>
                <span className="text-green-500 font-semibold">● Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Database</span>
                <span className="text-green-500 font-semibold">● Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Gateway</span>
                <span className="text-green-500 font-semibold">● Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Response Time</span>
                <span className="font-semibold">128ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;