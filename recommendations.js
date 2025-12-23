const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const recommendationEngine = require('../services/recommendation');

// Get personalized recommendations
router.get('/personalized', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recommendations = await recommendationEngine.getRecommendations(
      req.userId,
      parseInt(limit)
    );

    // Format response
    const formattedRecs = recommendations.map(rec => ({
      id: rec.item._id || Math.random().toString(36).substr(2, 9),
      name: rec.item.name,
      description: rec.item.description,
      price: rec.item.price,
      image: rec.item.image || rec.restaurant.image,
      restaurant: {
        id: rec.restaurant._id,
        name: rec.restaurant.name,
        rating: rec.restaurant.rating
      },
      type: rec.type,
      score: rec.score.toFixed(2),
      reason: rec.reason,
      tags: rec.type === 'trending' ? ['🔥 Trending'] : 
            rec.type === 'popular' ? ['⭐ Popular'] : 
            ['🎯 Personalized']
    }));

    res.json({
      success: true,
      recommendations: formattedRecs,
      count: formattedRecs.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate recommendations',
      fallback: await recommendationEngine.getPopularItems(10)
    });
  }
});

// Get similar items
router.get('/similar/:restaurantId/:itemName', async (req, res) => {
  try {
    const { restaurantId, itemName } = req.params;
    const { limit = 5 } = req.query;

    const similarItems = await recommendationEngine.getSimilarItems(
      restaurantId,
      itemName,
      parseInt(limit)
    );

    res.json({
      success: true,
      similarItems,
      originalItem: itemName
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trending items
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const trendingItems = await recommendationEngine.getTrendingItems(
      parseInt(limit)
    );

    res.json({
      success: true,
      trendingItems,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear recommendation cache (admin only)
router.post('/clear-cache', auth, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    recommendationEngine.recommendationCache.clear();
    recommendationEngine.similarityCache.clear();

    res.json({
      success: true,
      message: 'Recommendation cache cleared',
      clearedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;