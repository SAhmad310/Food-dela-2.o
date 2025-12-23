const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

// Create new order
router.post('/', auth, async (req, res) => {
  try {
    const { restaurantId, items, deliveryAddress, paymentMethod, deliveryInstructions } = req.body;
    
    // Calculate total amount
    const restaurant = await Restaurant.findById(restaurantId);
    let totalAmount = 0;
    
    const orderItems = items.map(item => {
      const menuItem = restaurant.menu.id(item.menuItemId);
      totalAmount += menuItem.price * item.quantity;
      
      return {
        item: menuItem,
        quantity: item.quantity,
        price: menuItem.price,
        specialInstructions: item.specialInstructions
      };
    });

    // Add delivery charge
    totalAmount += 40; // ₹40 delivery charge
    totalAmount += totalAmount * 0.05; // 5% tax

    // Estimate delivery time (30 mins + restaurant prep time)
    const estimatedDelivery = new Date();
    estimatedDelivery.setMinutes(estimatedDelivery.getMinutes() + 30 + restaurant.deliveryTime);

    const order = new Order({
      user: req.userId,
      restaurant: restaurantId,
      items: orderItems,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      deliveryInstructions,
      estimatedDelivery,
      orderStatus: 'placed'
    });

    await order.save();
    
    // Emit real-time event (we'll add Socket.io later)
    if (req.io) {
      req.io.to(`restaurant_${restaurantId}`).emit('new_order', order);
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate('restaurant', 'name image')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name image address')
      .populate('deliveryPartner', 'name phone');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user owns the order or is admin
    if (order.user.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (for restaurant/admin)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check permissions
    const isRestaurantOwner = req.userId === order.restaurant.owner?.toString();
    const isAdmin = req.userRole === 'admin';
    
    if (!isRestaurantOwner && !isAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    order.orderStatus = status;
    order.updatedAt = new Date();
    
    // If delivered, update delivery time
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Emit real-time update
    if (req.io) {
      req.io.to(`user_${order.user}`).emit('order_status_update', {
        orderId: order._id,
        status: order.orderStatus
      });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel order
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only allow cancellation within 5 minutes of ordering
    const orderTime = new Date(order.createdAt);
    const currentTime = new Date();
    const timeDiff = (currentTime - orderTime) / (1000 * 60); // in minutes

    if (timeDiff > 5 && req.userRole !== 'admin') {
      return res.status(400).json({ 
        error: 'Cannot cancel order after 5 minutes. Please contact support.' 
      });
    }

    // Cannot cancel if already out for delivery or delivered
    if (['out_for_delivery', 'delivered'].includes(order.orderStatus)) {
      return res.status(400).json({ 
        error: 'Cannot cancel order that is already out for delivery' 
      });
    }

    order.orderStatus = 'cancelled';
    await order.save();

    // Emit cancellation event
    if (req.io) {
      req.io.to(`restaurant_${order.restaurant}`).emit('order_cancelled', order._id);
    }

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;