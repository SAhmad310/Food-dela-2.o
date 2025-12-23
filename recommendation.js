const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

class RecommendationEngine {
  constructor() {
    this.similarityCache = new Map();
    this.recommendationCache = new Map();
    this.cacheTTL = 30 * 60 * 1000; // 30 minutes
  }

  // Clean expired cache
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.recommendationCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.recommendationCache.delete(key);
      }
    }
  }

  // Get recommendations for a user
  async getRecommendations(userId, limit = 10) {
    this.cleanCache();
    
    const cacheKey = `user_${userId}`;
    const cached = this.recommendationCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      return cached.recommendations;
    }

    try {
      const user = await User.findById(userId);
      if (!user) return this.getPopularItems(limit);

      const userOrders = await Order.find({ user: userId })
        .populate('restaurant')
        .sort({ createdAt: -1 })
        .limit(50);

      if (userOrders.length === 0) {
        return this.getPopularItems(limit);
      }

      // Extract user preferences
      const userPreferences = this.extractPreferences(userOrders);
      
      // Get recommendations using multiple strategies
      const [collaborativeRecs, contentBasedRecs, popularRecs] = await Promise.all([
        this.collaborativeFiltering(userId, userPreferences, limit),
        this.contentBasedFiltering(userPreferences, limit),
        this.getPopularItems(Math.floor(limit / 2))
      ]);

      // Combine and deduplicate recommendations
      const allRecs = [...collaborativeRecs, ...contentBasedRecs, ...popularRecs];
      const uniqueRecs = this.deduplicateRecommendations(allRecs);
      
      // Score and rank recommendations
      const scoredRecs = uniqueRecs.map(rec => ({
        ...rec,
        score: this.calculateScore(rec, userPreferences)
      }));

      scoredRecs.sort((a, b) => b.score - a.score);
      const recommendations = scoredRecs.slice(0, limit);

      // Cache the results
      this.recommendationCache.set(cacheKey, {
        timestamp: Date.now(),
        recommendations
      });

      return recommendations;
    } catch (error) {
      console.error('Recommendation error:', error);
      return this.getPopularItems(limit);
    }
  }

  // Extract user preferences from order history
  extractPreferences(orders) {
    const preferences = {
      cuisines: new Map(),
      restaurants: new Map(),
      categories: new Map(),
      priceRange: { min: Infinity, max: 0 },
      avgOrderValue: 0
    };

    let totalAmount = 0;
    let totalItems = 0;

    orders.forEach(order => {
      order.items.forEach(item => {
        // Track cuisine preferences
        const restaurantCuisines = order.restaurant?.cuisine || [];
        restaurantCuisines.forEach(cuisine => {
          preferences.cuisines.set(cuisine, (preferences.cuisines.get(cuisine) || 0) + item.quantity);
        });

        // Track restaurant preferences
        preferences.restaurants.set(
          order.restaurant?._id.toString(),
          (preferences.restaurants.get(order.restaurant?._id.toString()) || 0) + item.quantity
        );

        // Track category preferences
        if (item.item.category) {
          preferences.categories.set(
            item.item.category,
            (preferences.categories.get(item.item.category) || 0) + item.quantity
          );
        }

        // Track price range
        totalAmount += item.price * item.quantity;
        totalItems += item.quantity;
        preferences.priceRange.min = Math.min(preferences.priceRange.min, item.price);
        preferences.priceRange.max = Math.max(preferences.priceRange.max, item.price);
      });
    });

    preferences.avgOrderValue = totalItems > 0 ? totalAmount / totalItems : 0;

    return preferences;
  }

  // Collaborative filtering: Users who bought this also bought...
  async collaborativeFiltering(userId, userPreferences, limit) {
    try {
      // Get similar users based on order history
      const allUsers = await User.find({ _id: { $ne: userId } }).limit(100);
      const userSimilarities = [];

      for (const otherUser of allUsers) {
        const similarity = await this.calculateUserSimilarity(userId, otherUser._id);
        if (similarity > 0.3) { // Threshold for similarity
          userSimilarities.push({ user: otherUser._id, similarity });
        }
      }

      // Sort by similarity
      userSimilarities.sort((a, b) => b.similarity - a.similarity);

      // Get items ordered by similar users but not by current user
      const recommendedItems = new Map();
      const userOrderedRestaurants = Array.from(userPreferences.restaurants.keys());

      for (const { user: similarUserId } of userSimilarities.slice(0, 10)) {
        const similarUserOrders = await Order.find({ user: similarUserId })
          .populate('restaurant')
          .limit(10);

        similarUserOrders.forEach(order => {
          const restaurantId = order.restaurant?._id.toString();
          
          // Skip restaurants user already ordered from
          if (userOrderedRestaurants.includes(restaurantId)) return;

          order.items.forEach(item => {
            const key = `${restaurantId}_${item.item.name}`;
            recommendedItems.set(key, {
              type: 'collaborative',
              restaurant: order.restaurant,
              item: item.item,
              score: 0.8, // Base score for collaborative filtering
              reason: 'Users with similar taste ordered this'
            });
          });
        });
      }

      return Array.from(recommendedItems.values()).slice(0, limit);
    } catch (error) {
      console.error('Collaborative filtering error:', error);
      return [];
    }
  }

  // Content-based filtering: Based on user preferences
  async contentBasedFiltering(userPreferences, limit) {
    try {
      const recommendedItems = new Map();
      
      // Get restaurants matching user's preferred cuisines
      const preferredCuisines = Array.from(userPreferences.cuisines.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cuisine]) => cuisine);

      const restaurants = await Restaurant.find({
        cuisine: { $in: preferredCuisines },
        isActive: true
      }).limit(20);

      // Recommend items from matching restaurants
      for (const restaurant of restaurants) {
        // Skip if user already ordered from this restaurant frequently
        if (userPreferences.restaurants.get(restaurant._id.toString()) > 5) {
          continue;
        }

        // Get popular items from this restaurant
        const popularItems = restaurant.menu
          .filter(item => item.isAvailable)
          .sort((a, b) => {
            // Simple popularity score based on price and category
            const scoreA = this.calculateItemScore(a, userPreferences);
            const scoreB = this.calculateItemScore(b, userPreferences);
            return scoreB - scoreA;
          })
          .slice(0, 3);

        popularItems.forEach(item => {
          const key = `${restaurant._id}_${item.name}`;
          recommendedItems.set(key, {
            type: 'content',
            restaurant: restaurant,
            item: item,
            score: 0.7, // Base score for content-based
            reason: `Matches your taste for ${preferredCuisines.join(', ')}`
          });
        });
      }

      return Array.from(recommendedItems.values()).slice(0, limit);
    } catch (error) {
      console.error('Content-based filtering error:', error);
      return [];
    }
  }

  // Get popular items overall
  async getPopularItems(limit) {
    try {
      // In production, use actual order statistics
      // For now, get items from popular restaurants
      const popularRestaurants = await Restaurant.find({ isActive: true })
        .sort({ rating: -1 })
        .limit(10);

      const popularItems = [];
      
      for (const restaurant of popularRestaurants) {
        const items = restaurant.menu
          .filter(item => item.isAvailable)
          .sort((a, b) => b.price - a.price) // Higher price items first
          .slice(0, 2);

        items.forEach(item => {
          popularItems.push({
            type: 'popular',
            restaurant: restaurant,
            item: item,
            score: 0.6,
            reason: 'Popular choice'
          });
        });
      }

      return popularItems.slice(0, limit);
    } catch (error) {
      console.error('Popular items error:', error);
      return [];
    }
  }

  // Calculate similarity between two users
  async calculateUserSimilarity(userId1, userId2) {
    const cacheKey = `${userId1}_${userId2}`;
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey);
    }

    try {
      const [orders1, orders2] = await Promise.all([
        Order.find({ user: userId1 }).populate('restaurant'),
        Order.find({ user: userId2 }).populate('restaurant')
      ]);

      if (orders1.length === 0 || orders2.length === 0) return 0;

      // Extract restaurant sets
      const restaurants1 = new Set(orders1.map(o => o.restaurant?._id.toString()));
      const restaurants2 = new Set(orders2.map(o => o.restaurant?._id.toString()));

      // Jaccard similarity coefficient
      const intersection = new Set([...restaurants1].filter(x => restaurants2.has(x)));
      const union = new Set([...restaurants1, ...restaurants2]);

      const similarity = union.size > 0 ? intersection.size / union.size : 0;
      
      this.similarityCache.set(cacheKey, similarity);
      return similarity;
    } catch (error) {
      console.error('Similarity calculation error:', error);
      return 0;
    }
  }

  // Calculate item score based on user preferences
  calculateItemScore(item, userPreferences) {
    let score = 0;

    // Price scoring (closer to user's average preferred price is better)
    const avgPrice = userPreferences.avgOrderValue || 0;
    if (avgPrice > 0) {
      const priceDiff = Math.abs(item.price - avgPrice);
      const priceScore = Math.max(0, 1 - (priceDiff / avgPrice));
      score += priceScore * 0.4;
    }

    // Category preference scoring
    if (item.category && userPreferences.categories.has(item.category)) {
      const categoryCount = userPreferences.categories.get(item.category);
      const categoryScore = Math.min(1, categoryCount / 10); // Normalize
      score += categoryScore * 0.3;
    }

    // Veg/Non-veg preference (simplified)
    if (userPreferences.vegPreference !== undefined) {
      if (item.isVeg === userPreferences.vegPreference) {
        score += 0.2;
      }
    }

    // Restaurant rating
    if (item.restaurant?.rating) {
      score += (item.restaurant.rating / 5) * 0.1;
    }

    return score;
  }

  // Calculate final recommendation score
  calculateScore(recommendation, userPreferences) {
    let score = recommendation.score;
    
    // Boost score based on item characteristics
    const itemScore = this.calculateItemScore(recommendation.item, userPreferences);
    score += itemScore * 0.5;

    // Time-based decay for cache
    if (recommendation.timestamp) {
      const age = Date.now() - recommendation.timestamp;
      const decay = Math.max(0.5, 1 - (age / (24 * 60 * 60 * 1000))); // Decay over 24 hours
      score *= decay;
    }

    return score;
  }

  // Deduplicate recommendations
  deduplicateRecommendations(recommendations) {
    const seen = new Set();
    return recommendations.filter(rec => {
      const key = `${rec.restaurant?._id}_${rec.item?.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Get "You might also like" for specific item
  async getSimilarItems(restaurantId, itemName, limit = 5) {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) return [];

      const targetItem = restaurant.menu.find(item => item.name === itemName);
      if (!targetItem) return [];

      // Find similar items in same restaurant
      const similarItems = restaurant.menu
        .filter(item => 
          item.name !== itemName && 
          item.isAvailable &&
          (item.category === targetItem.category || 
           Math.abs(item.price - targetItem.price) < 50)
        )
        .slice(0, limit)
        .map(item => ({
          type: 'similar',
          restaurant: restaurant,
          item: item,
          score: 0.9,
          reason: `Similar to ${itemName}`
        }));

      return similarItems;
    } catch (error) {
      console.error('Similar items error:', error);
      return [];
    }
  }

  // Get trending items (based on recent orders)
  async getTrendingItems(limit = 10) {
    try {
      // In production, analyze recent orders
      // For now, return items from highly rated restaurants
      const trendingRestaurants = await Restaurant.find({ 
        isActive: true,
        rating: { $gte: 4 }
      })
      .sort({ rating: -1 })
      .limit(5);

      const trendingItems = [];
      
      for (const restaurant of trendingRestaurants) {
        const expensiveItems = restaurant.menu
          .filter(item => item.isAvailable && item.price > 300)
          .slice(0, 2);

        expensiveItems.forEach(item => {
          trendingItems.push({
            type: 'trending',
            restaurant: restaurant,
            item: item,
            score: 0.85,
            reason: 'Trending now'
          });
        });
      }

      return trendingItems.slice(0, limit);
    } catch (error) {
      console.error('Trending items error:', error);
      return [];
    }
  }
}

module.exports = new RecommendationEngine();