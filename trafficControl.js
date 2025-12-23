const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const axios = require('axios');

class TrafficControlService {
  constructor() {
    this.peakHours = {
      morning: { start: 8, end: 10 },
      lunch: { start: 12, end: 14 },
      evening: { start: 19, end: 21 }
    };
    this.surgeMultipliers = {
      low: 1.0,
      medium: 1.2,
      high: 1.5,
      very_high: 2.0
    };
  }

  // Check if current time is peak hour
  isPeakHour() {
    const now = new Date();
    const currentHour = now.getHours();
    
    for (const period of Object.values(this.peakHours)) {
      if (currentHour >= period.start && currentHour <= period.end) {
        return true;
      }
    }
    return false;
  }

  // Calculate surge multiplier based on demand
  async calculateSurgeMultiplier(restaurantId) {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Get order count in last hour
      const orderCount = await Order.countDocuments({
        restaurant: restaurantId,
        createdAt: { $gte: oneHourAgo },
        orderStatus: { $nin: ['cancelled', 'failed'] }
      });

      // Get restaurant capacity
      const restaurant = await Restaurant.findById(restaurantId);
      const maxCapacity = restaurant.maxOrdersPerHour || 50;

      // Calculate load percentage
      const loadPercentage = (orderCount / maxCapacity) * 100;

      // Determine surge level
      if (loadPercentage < 50) return this.surgeMultipliers.low;
      if (loadPercentage < 75) return this.surgeMultipliers.medium;
      if (loadPercentage < 90) return this.surgeMultipliers.high;
      return this.surgeMultipliers.very_high;
    } catch (error) {
      console.error('Surge calculation error:', error);
      return this.surgeMultipliers.low;
    }
  }

  // Calculate dynamic delivery time
  async calculateDeliveryTime(restaurantId, deliveryAddress) {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
      
      // Base preparation time
      let totalTime = restaurant.deliveryTime || 30;

      // Add peak hour buffer
      if (this.isPeakHour()) {
        totalTime += 15;
      }

      // Add surge time based on current orders
      const surgeMultiplier = await this.calculateSurgeMultiplier(restaurantId);
      totalTime *= surgeMultiplier;

      // Add travel time estimation (using Google Maps API)
      const travelTime = await this.estimateTravelTime(
        restaurant.address.coordinates,
        deliveryAddress.coordinates
      );

      totalTime += travelTime;

      return Math.ceil(totalTime);
    } catch (error) {
      console.error('Delivery time calculation error:', error);
      return 45; // Default fallback
    }
  }

  // Estimate travel time using Google Maps API
  async estimateTravelTime(origin, destination) {
    try {
      // Mock implementation - replace with actual Google Maps API
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        // Fallback: simple distance calculation
        const distance = this.calculateDistance(origin, destination);
        return Math.ceil(distance * 2); // Approx 2 mins per km
      }

      // Actual Google Maps API call
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json`,
        {
          params: {
            origins: `${origin.lat},${origin.lng}`,
            destinations: `${destination.lat},${destination.lng}`,
            key: apiKey,
            mode: 'driving'
          }
        }
      );

      if (response.data.rows[0]?.elements[0]?.duration) {
        return response.data.rows[0].elements[0].duration.value / 60; // Convert to minutes
      }

      return 30; // Default fallback
    } catch (error) {
      console.error('Travel time estimation error:', error);
      return 30; // Default fallback
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(coord1.lat)) * Math.cos(this.toRad(coord2.lat)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Check if restaurant can accept new orders
  async canAcceptOrder(restaurantId) {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const activeOrders = await Order.countDocuments({
        restaurant: restaurantId,
        createdAt: { $gte: fifteenMinutesAgo },
        orderStatus: { $nin: ['delivered', 'cancelled'] }
      });

      const restaurant = await Restaurant.findById(restaurantId);
      const maxConcurrentOrders = restaurant.maxConcurrentOrders || 10;

      return activeOrders < maxConcurrentOrders;
    } catch (error) {
      console.error('Order acceptance check error:', error);
      return true; // Default to accepting orders
    }
  }

  // Get system load status
  async getSystemLoad() {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const totalActiveOrders = await Order.countDocuments({
        createdAt: { $gte: fifteenMinutesAgo },
        orderStatus: { $nin: ['delivered', 'cancelled'] }
      });

      const totalRestaurants = await Restaurant.countDocuments({ isActive: true });
      
      const avgOrdersPerRestaurant = totalActiveOrders / totalRestaurants;

      if (avgOrdersPerRestaurant < 5) return 'low';
      if (avgOrdersPerRestaurant < 10) return 'medium';
      if (avgOrdersPerRestaurant < 15) return 'high';
      return 'very_high';
    } catch (error) {
      console.error('System load check error:', error);
      return 'medium';
    }
  }
}

module.exports = new TrafficControlService();