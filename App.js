import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Restaurants from './pages/Restaurants';
import RestaurantDetail from './pages/RestaurantDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';

import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import AdminDashboard from './pages/AdminDashboard';

import Recommendations from './components/Recommendations';
import GroupOrder from './pages/GroupOrder';
import CreateGroupOrder from './pages/CreateGroupOrder';


function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/restaurant/:id" element={<RestaurantDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;

// Add these routes inside <Routes>
<Route path="/checkout" element={<Checkout />} />
<Route path="/order-tracking/:orderId" element={<OrderTracking />} />
<Route path="/admin" element={<AdminDashboard />} />

// Add routes
<Route path="/recommendations" element={
  <div className="container mx-auto px-4 py-8">
    <Recommendations />
  </div>
} />
<Route path="/group/create" element={<CreateGroupOrder />} />
<Route path="/group/:code" element={<GroupOrder />} />

// Add routes
<Route path="/recommendations" element={
  <div className="container mx-auto px-4 py-8">
    <Recommendations />
  </div>
} />
<Route path="/group/create" element={<CreateGroupOrder />} />
<Route path="/group/:code" element={<GroupOrder />} />

