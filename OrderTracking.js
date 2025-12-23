import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiClock, FiMapPin, FiCheckCircle, FiPackage, FiBicycle, FiHome } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Fix for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const OrderTracking = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [socket, setSocket] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const mapRef = useRef();

  // Status steps with icons
  const statusSteps = [
    { id: 'placed', label: 'Order Placed', icon: '📝' },
    { id: 'confirmed', label: 'Confirmed', icon: '✅' },
    { id: 'preparing', label: 'Preparing Food', icon: '👨‍🍳' },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: '🚴' },
    { id: 'delivered', label: 'Delivered', icon: '🎉' }
  ];

  useEffect(() => {
    fetchOrderDetails();
    setupWebSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/tracking/${orderId}/tracking`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(response.data.order);
      setTracking(response.data.tracking);
      setCurrentLocation(response.data.tracking.currentLocation);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    }
  };

  const setupWebSocket = () => {
    const newSocket = io('http://localhost:5000');
    
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      newSocket.emit('join_user', orderId);
    });

    newSocket.on('order_status_update', (data) => {
      toast.success(`Order status updated: ${data.status}`);
      fetchOrderDetails(); // Refresh data
    });

    newSocket.on('location_updated', (data) => {
      setCurrentLocation(data);
      
      // Animate marker movement
      if (mapRef.current && data.lat && data.lng) {
        const map = mapRef.current;
        map.flyTo([data.lat, data.lng], 15, {
          duration: 1
        });
      }
    });

    setSocket(newSocket);
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    return statusSteps.findIndex(step => step.id === order.orderStatus);
  };

  if (!order || !tracking) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4">Loading order details...</p>
      </div>
    );
  }

  const center = currentLocation || [28.7041, 77.1025]; // Default to Delhi

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
        <p className="text-gray-600">Order ID: {order._id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Bar */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Order Status</h2>
              <div className="flex items-center text-primary">
                <FiClock className="mr-2" />
                <span className="font-semibold">
                  {new Date(order.estimatedDelivery).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>

            {/* Status Steps */}
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-0 right-0 top-4 h-1 bg-gray-200"></div>
              <div 
                className="absolute left-0 top-4 h-1 bg-primary transition-all duration-500"
                style={{ width: `${(getCurrentStepIndex() / (statusSteps.length - 1)) * 100}%` }}
              ></div>

              {/* Steps */}
              <div className="flex justify-between relative">
                {statusSteps.map((step, index) => {
                  const isActive = index <= getCurrentStepIndex();
                  const isCurrent = index === getCurrentStepIndex();
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center text-center" style={{ width: '20%' }}>
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-xl mb-2
                        ${isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}
                        ${isCurrent ? 'ring-4 ring-primary ring-opacity-30' : ''}
                      `}>
                        {step.icon}
                      </div>
                      <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                        {step.label}
                      </span>
                      {isCurrent && (
                        <span className="text-xs text-gray-500 mt-1">Current</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Map */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold flex items-center">
                <FiMapPin className="mr-2 text-primary" />
                Live Delivery Tracking
              </h2>
            </div>
            <div className="h-96 relative">
              <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                whenCreated={(mapInstance) => { mapRef.current = mapInstance }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* Restaurant Marker */}
                {order.restaurant?.address?.coordinates && (
                  <Marker position={[
                    order.restaurant.address.coordinates.lat,
                    order.restaurant.address.coordinates.lng
                  ]}>
                    <Popup>
                      <div className="font-bold">{order.restaurant.name}</div>
                      <div>Restaurant</div>
                    </Popup>
                  </Marker>
                )}

                {/* Delivery Partner Marker */}
                {currentLocation && (
                  <Marker 
                    position={[currentLocation.lat, currentLocation.lng]}
                    icon={L.divIcon({
                      className: 'delivery-marker',
                      html: `<div class="relative">
                        <div class="animate-ping absolute -inset-1 bg-primary rounded-full opacity-75"></div>
                        <div class="relative bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center">
                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>`,
                      iconSize: [40, 40]
                    })}
                  >
                    <Popup>
                      <div className="font-bold">Delivery Partner</div>
                      <div>On the way to your location</div>
                    </Popup>
                  </Marker>
                )}

                {/* Route Polyline */}
                {tracking.route && tracking.route.length > 0 && (
                  <Polyline
                    positions={tracking.route.map(point => [point.lat, point.lng])}
                    color="#FF6B35"
                    weight={3}
                    opacity={0.7}
                    dashArray="10, 10"
                  />
                )}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Right Column - Order Info */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Order Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <FiPackage className="text-gray-400 mr-3" />
                <div>
                  <div className="font-semibold">Order ID</div>
                  <div className="text-gray-600 text-sm">{order._id.slice(-8)}</div>
                </div>
              </div>

              <div className="flex items-center">
                <FiClock className="text-gray-400 mr-3" />
                <div>
                  <div className="font-semibold">Estimated Delivery</div>
                  <div className="text-gray-600 text-sm">
                    {new Date(order.estimatedDelivery).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>

              {order.deliveryPartner && (
                <div className="flex items-center">
                  <FiBicycle className="text-gray-400 mr-3" />
                  <div>
                    <div className="font-semibold">Delivery Partner</div>
                    <div className="text-gray-600 text-sm">{order.deliveryPartner.name}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <FiHome className="text-gray-400 mr-3" />
                <div>
                  <div className="font-semibold">Delivery Address</div>
                  <div className="text-gray-600 text-sm">
                    {order.deliveryAddress.street}, {order.deliveryAddress.city}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between mb-2">
                <span>Order Total</span>
                <span className="font-bold">₹{order.totalAmount}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Payment Status</span>
                <span className={`font-bold ${order.paymentStatus === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {order.paymentStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="font-bold mb-2">Need Help?</h3>
            <p className="text-gray-600 text-sm mb-4">
              Having issues with your delivery?
            </p>
            <div className="space-y-2">
              <button className="w-full py-2 border border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-white transition">
                Contact Restaurant
              </button>
              <button className="w-full py-2 bg-primary text-white rounded-lg font-medium hover:bg-orange-600 transition">
                Call Support: 1800-123-456
              </button>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-bold mb-4">Your Order</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <div>
                    <div className="font-medium">{item.item.name}</div>
                    <div className="text-gray-600 text-sm">Qty: {item.quantity}</div>
                  </div>
                  <div className="font-semibold">₹{item.price * item.quantity}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;