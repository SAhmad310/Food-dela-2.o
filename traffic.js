const express = require('express');
const router = express.Router();
const trafficControl = require('../services/trafficControl');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

// Get delivery time estimate
router.post('/estimate-delivery', async (req, res) => {
  try {
    const { restaurantId, deliveryAddress } = req.body;
    
    const deliveryTime = await trafficControl.calculateDeliveryTime(
      restaurantId,
      deliveryAddress
    );

    const canAcceptOrder = await trafficControl.canAcceptOrder(restaurantId);
    const surgeMultiplier = await trafficControl.calculateSurgeMultiplier(restaurantId);
    const isPeakHour = trafficControl.isPeakHour();

    res.json({
      deliveryTime,
      canAcceptOrder,
      surgeMultiplier,
      isPeakHour,
      surgePrice: surgeMultiplier > 1 ? `Surge ${((surgeMultiplier - 1) * 100).toFixed(0)}%` : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system status
router.get('/system-status', async (req, res) => {
  try {
    const systemLoad = await trafficControl.getSystemLoad();
    const isPeakHour = trafficControl.isPeakHour();
    
    // Get busy restaurants
    const busyRestaurants = await Restaurant.aggregate([
      {
        $lookup: {
          from: 'orders',
          let: { restaurantId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$restaurant', '$$restaurantId'] },
                    { $gte: ['$createdAt', new Date(Date.now() - 30 * 60 * 1000)] },
                    { $nin: ['$orderStatus', ['delivered', 'cancelled']] }
                  ]
                }
              }
            }
          ],
          as: 'recentOrders'
        }
      },
      {
        $project: {
          name: 1,
          orderCount: { $size: '$recentOrders' },
          isBusy: { $gte: [{ $size: '$recentOrders' }, 5] }
        }
      },
      { $match: { isBusy: true } },
      { $limit: 10 }
    ]);

    res.json({
      systemLoad,
      isPeakHour,
      peakHours: trafficControl.peakHours,
      busyRestaurants,
      message: systemLoad === 'very_high' 
        ? 'High system load. Delivery times may be longer than usual.' 
        : 'System operating normally'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Emergency pause for restaurant
router.post('/restaurants/:id/pause', async (req, res) => {
  try {
    const { reason } = req.body;
    
    await Restaurant.findByIdAndUpdate(req.params.id, {
      isPaused: true,
      pauseReason: reason,
      pausedUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    // Notify users with active orders
    const activeOrders = await Order.find({
      restaurant: req.params.id,
      orderStatus: { $nin: ['delivered', 'cancelled'] }
    });

    // TODO: Send notifications to users

    res.json({ 
      success: true, 
      message: 'Restaurant paused temporarily',
      resumeTime: new Date(Date.now() + 30 * 60 * 1000)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;