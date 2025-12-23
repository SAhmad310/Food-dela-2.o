const express = require('express');
const router = express.Router();
const GroupOrder = require('../models/GroupOrder');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Create a new group order
router.post('/create', auth, async (req, res) => {
  try {
    const { restaurantId, name, description, settings } = req.body;
    
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const groupOrder = new GroupOrder({
      name,
      description,
      restaurant: restaurantId,
      host: req.userId,
      participants: [{
        user: req.userId,
        name: req.userName,
        email: req.userEmail,
        joinedAt: new Date()
      }],
      settings: {
        splitMethod: settings?.splitMethod || 'individual',
        allowLateJoin: settings?.allowLateJoin !== false,
        autoCloseTime: settings?.autoCloseTime,
        requireApproval: settings?.requireApproval || false,
        taxIncluded: settings?.taxIncluded !== false,
        deliveryFeeIncluded: settings?.deliveryFeeIncluded !== false
      }
    });

    await groupOrder.save();

    res.status(201).json({
      success: true,
      message: 'Group order created successfully',
      groupOrder: {
        id: groupOrder._id,
        code: groupOrder.code,
        name: groupOrder.name,
        restaurant: restaurant,
        host: groupOrder.host,
        inviteLink: `${req.headers.origin}/group/${groupOrder.code}`,
        expiresAt: groupOrder.expiresAt
      }
    });
  } catch (error) {
    console.error('Create group order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join a group order by code
router.post('/join/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    
    const groupOrder = await GroupOrder.findOne({ 
      code: code.toUpperCase(),
      status: 'active'
    }).populate('restaurant');

    if (!groupOrder) {
      return res.status(404).json({ error: 'Group order not found or closed' });
    }

    // Check if user already joined
    const alreadyJoined = groupOrder.participants.some(
      p => p.user && p.user.toString() === req.userId
    );

    if (alreadyJoined) {
      return res.status(400).json({ error: 'Already joined this group order' });
    }

    // Check if late joining is allowed
    if (!groupOrder.settings.allowLateJoin && groupOrder.participants.length > 1) {
      return res.status(400).json({ error: 'Late joining is not allowed' });
    }

    // Add participant
    groupOrder.participants.push({
      user: req.userId,
      name: req.userName,
      email: req.userEmail,
      joinedAt: new Date()
    });

    await groupOrder.save();

    res.json({
      success: true,
      message: 'Joined group order successfully',
      groupOrder: {
        id: groupOrder._id,
        code: groupOrder.code,
        name: groupOrder.name,
        restaurant: groupOrder.restaurant,
        host: groupOrder.host,
        participantCount: groupOrder.participants.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit individual order to group
router.post('/:code/order', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { items, specialInstructions } = req.body;

    const groupOrder = await GroupOrder.findOne({ 
      code: code.toUpperCase(),
      status: 'active'
    }).populate('restaurant');

    if (!groupOrder) {
      return res.status(404).json({ error: 'Group order not found or closed' });
    }

    // Check if user is a participant
    const participant = groupOrder.participants.find(
      p => p.user && p.user.toString() === req.userId
    );

    if (!participant) {
      return res.status(403).json({ error: 'You must join the group order first' });
    }

    // Check if already submitted
    const existingOrder = groupOrder.orders.find(
      o => o.user && o.user.toString() === req.userId
    );

    if (existingOrder) {
      return res.status(400).json({ error: 'Order already submitted' });
    }

    // Validate items against restaurant menu
    const restaurant = groupOrder.restaurant;
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = restaurant.menu.id(item.menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ 
          error: `Item ${item.name} is not available` 
        });
      }

      subtotal += menuItem.price * item.quantity;
      orderItems.push({
        item: menuItem,
        quantity: item.quantity,
        price: menuItem.price,
        specialInstructions: item.specialInstructions
      });
    }

    // Add order to group
    groupOrder.orders.push({
      user: req.userId,
      items: orderItems,
      subtotal,
      submittedAt: new Date()
    });

    // Update participant status
    participant.orderSubmitted = true;
    participant.orderTotal = subtotal;

    // Update group totals
    await groupOrder.updateTotals();

    res.json({
      success: true,
      message: 'Order submitted to group successfully',
      order: {
        items: orderItems,
        subtotal,
        groupTotal: groupOrder.totals.total,
        yourShare: groupOrder.splitDetails.find(s => 
          s.user.toString() === req.userId
        )?.amount || subtotal
      }
    });
  } catch (error) {
    console.error('Submit group order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get group order details
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const groupOrder = await GroupOrder.findOne({ code: code.toUpperCase() })
      .populate('restaurant')
      .populate('host', 'name email')
      .populate('participants.user', 'name email')
      .populate('orders.user', 'name email');

    if (!groupOrder) {
      return res.status(404).json({ error: 'Group order not found' });
    }

    // Format response
    const response = {
      id: groupOrder._id,
      code: groupOrder.code,
      name: groupOrder.name,
      description: groupOrder.description,
      restaurant: groupOrder.restaurant,
      host: groupOrder.host,
      status: groupOrder.status,
      settings: groupOrder.settings,
      totals: groupOrder.totals,
      participants: groupOrder.participants.map(p => ({
        user: p.user,
        name: p.name,
        orderSubmitted: p.orderSubmitted,
        orderTotal: p.orderTotal,
        paymentStatus: p.paymentStatus
      })),
      orders: groupOrder.orders,
      splitDetails: groupOrder.splitDetails,
      expiresAt: groupOrder.expiresAt,
      createdAt: groupOrder.createdAt
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Close group order and create main order
router.post('/:code/close', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { paymentMethod, deliveryAddress } = req.body;

    const groupOrder = await GroupOrder.findOne({ 
      code: code.toUpperCase(),
      status: 'active'
    }).populate('restaurant');

    if (!groupOrder) {
      return res.status(404).json({ error: 'Group order not found' });
    }

    // Check if user is host
    if (groupOrder.host.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only host can close the group order' });
    }

    // Check if minimum participants have ordered
    const orderedParticipants = groupOrder.participants.filter(p => p.orderSubmitted);
    if (orderedParticipants.length < 1) {
      return res.status(400).json({ error: 'At least one participant must submit an order' });
    }

    // Combine all orders
    const allItems = [];
    groupOrder.orders.forEach(order => {
      order.items.forEach(item => {
        allItems.push({
          ...item,
          user: order.user
        });
      });
    });

    // Create main order
    const mainOrder = new Order({
      user: req.userId, // Host pays initially
      restaurant: groupOrder.restaurant._id,
      items: allItems.map(item => ({
        item: item.item,
        quantity: item.quantity,
        price: item.price,
        specialInstructions: item.specialInstructions
      })),
      totalAmount: groupOrder.totals.total,
      deliveryAddress,
      paymentMethod,
      orderType: 'group',
      groupOrder: groupOrder._id,
      specialInstructions: `Group Order: ${groupOrder.name}. Participants: ${orderedParticipants.length}`
    });

    await mainOrder.save();

    // Update group order status
    groupOrder.status = 'ordered';
    groupOrder.orderedAt = new Date();
    groupOrder.mainOrder = mainOrder._id;
    await groupOrder.save();

    // TODO: Send notifications to participants

    res.json({
      success: true,
      message: 'Group order placed successfully',
      order: mainOrder,
      groupOrder: {
        id: groupOrder._id,
        code: groupOrder.code,
        totals: groupOrder.totals,
        splitDetails: groupOrder.splitDetails
      }
    });
  } catch (error) {
    console.error('Close group order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Split payment among participants
router.post('/:code/split-payment', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { splitUpdates } = req.body;

    const groupOrder = await GroupOrder.findOne({ 
      code: code.toUpperCase(),
      status: 'ordered'
    });

    if (!groupOrder) {
      return res.status(404).json({ error: 'Group order not found or not yet ordered' });
    }

    // Check if user is host or admin
    if (groupOrder.host.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Only host can manage split payments' });
    }

    // Update payment statuses
    splitUpdates.forEach(update => {
      const participant = groupOrder.participants.find(
        p => p.user.toString() === update.userId
      );
      
      if (participant) {
        participant.paymentStatus = update.status;
        
        // Update split details
        const splitDetail = groupOrder.splitDetails.find(
          s => s.user.toString() === update.userId
        );
        
        if (splitDetail) {
          splitDetail.paid = update.status === 'paid';
        }
      }
    });

    await groupOrder.save();

    // Check if all paid
    const allPaid = groupOrder.participants.every(
      p => p.paymentStatus === 'paid' || p.paymentStatus === 'none'
    );

    if (allPaid) {
      groupOrder.status = 'completed';
      await groupOrder.save();
    }

    res.json({
      success: true,
      message: 'Payment split updated successfully',
      groupOrder: {
        id: groupOrder._id,
        status: groupOrder.status,
        participants: groupOrder.participants.map(p => ({
          user: p.user,
          name: p.name,
          paymentStatus: p.paymentStatus
        })),
        splitDetails: groupOrder.splitDetails
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's active group orders
router.get('/user/active', auth, async (req, res) => {
  try {
    const groupOrders = await GroupOrder.find({
      'participants.user': req.userId,
      status: 'active'
    })
    .populate('restaurant', 'name image')
    .populate('host', 'name')
    .sort({ createdAt: -1 });

    res.json(groupOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;