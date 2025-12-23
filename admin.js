const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Middleware to check admin role
const adminAuth = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Dashboard statistics
router.get('/dashboard', auth, adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      totalUsers,
      totalRestaurants,
      recentOrders,
      topRestaurants
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Order.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      User.countDocuments(),
      Restaurant.countDocuments(),
      Order.find()
        .populate('user', 'name email')
        .populate('restaurant', 'name')
        .sort({ createdAt: -1 })
        .limit(10),
      Restaurant.aggregate([
        { $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'restaurant',
          as: 'orders'
        }},
        { $project: {
          name: 1,
          orderCount: { $size: '$orders' },
          totalRevenue: { $sum: '$orders.totalAmount' }
        }},
        { $sort: { orderCount: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      statistics: {
        totalOrders: totalOrders,
        todayOrders: todayOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        totalUsers,
        totalRestaurants,
        avgOrderValue: totalRevenue[0]?.total / totalOrders || 0
      },
      recentOrders,
      topRestaurants
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders with filters
router.get('/orders', auth, adminAuth, async (req, res) => {
  try {
    const { status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.orderStatus = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .populate('restaurant', 'name')
      .populate('deliveryPartner', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage restaurants
router.get('/restaurants', auth, adminAuth, async (req, res) => {
  try {
    const restaurants = await Restaurant.find()
      .sort({ createdAt: -1 });
    
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/Disable restaurant
router.patch('/restaurants/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );
    
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.patch('/users/:id/role', auth, adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revenue analytics
router.get('/analytics/revenue', auth, adminAuth, async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'weekly':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'monthly':
        startDate.setMonth(endDate.getMonth() - 12);
        break;
    }

    const revenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          totalRevenue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(revenueData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;