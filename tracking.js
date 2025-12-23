const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Real-time order tracking
router.get('/:orderId/tracking', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('restaurant', 'name address.coordinates')
      .populate('deliveryPartner', 'name phone currentLocation');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Mock delivery location (in real app, get from delivery partner's GPS)
    const deliveryLocations = generateMockRoute(
      order.restaurant.address.coordinates,
      order.deliveryAddress.coordinates || { lat: 28.7041, lng: 77.1025 } // Default to Delhi
    );

    res.json({
      order,
      tracking: {
        currentLocation: deliveryLocations.current,
        route: deliveryLocations.route,
        estimatedDelivery: order.estimatedDelivery,
        status: order.orderStatus,
        statusUpdates: [
          { status: 'placed', time: order.createdAt, message: 'Order placed' },
          { status: 'confirmed', time: new Date(order.createdAt.getTime() + 5*60000), message: 'Restaurant confirmed order' },
          { status: 'preparing', time: new Date(order.createdAt.getTime() + 10*60000), message: 'Food is being prepared' },
          // More updates based on actual status
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate mock delivery route
function generateMockRoute(start, end) {
  const route = [];
  const steps = 10;
  
  for (let i = 0; i <= steps; i++) {
    const lat = start.lat + (end.lat - start.lat) * (i / steps);
    const lng = start.lng + (end.lng - start.lng) * (i / steps);
    route.push({ lat, lng });
  }
  
  return {
    current: route[Math.floor(steps * 0.7)], // 70% through route
    route: route
  };
}

module.exports = router;