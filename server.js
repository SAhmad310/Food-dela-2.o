// Add these imports
const recommendationRoutes = require('./routes/recommendations');
const languageRoutes = require('./routes/language');
const groupOrderRoutes = require('./routes/groupOrders');

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware to make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join user room
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });

  // Join restaurant room
  socket.on('join_restaurant', (restaurantId) => {
    socket.join(`restaurant_${restaurantId}`);
    console.log(`Restaurant ${restaurantId} joined room`);
  });

  // Join delivery room
  socket.on('join_delivery', (deliveryId) => {
    socket.join(`delivery_${deliveryId}`);
    console.log(`Delivery partner ${deliveryId} joined room`);
  });

  // Update delivery location
  socket.on('update_location', (data) => {
    const { orderId, lat, lng } = data;
    io.to(`user_${orderId}`).emit('location_updated', { lat, lng });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ... rest of your server code ...

// Change app.listen to server.listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const paymentRoutes = require('./routes/payment');
app.use('/api/payment', paymentRoutes);

// Add these routes
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/language', languageRoutes);
app.use('/api/group-orders', groupOrderRoutes);

// Add these imports


// Add these routes
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/language', languageRoutes);
app.use('/api/group-orders', groupOrderRoutes);