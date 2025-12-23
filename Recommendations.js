import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  FiStar, FiTrendingUp, FiTarget, FiRefreshCw, 
  FiThumbsUp, FiClock, FiFilter
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const Recommendations = ({ userId, restaurantId, itemName, type = 'personalized' }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personalized');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRecommendations();
  }, [activeTab, userId, restaurantId, itemName]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      let params = {};

      switch (activeTab) {
        case 'personalized':
          if (!userId) {
            endpoint = '/api/recommendations/trending';
          } else {
            endpoint = '/api/recommendations/personalized';
            params = { limit: 12 };
          }
          break;
        case 'similar':
          if (restaurantId && itemName) {
            endpoint = `/api/recommendations/similar/${restaurantId}/${itemName}`;
          } else {
            endpoint = '/api/recommendations/trending';
          }
          break;
        case 'trending':
          endpoint = '/api/recommendations/trending';
          params = { limit: 12 };
          break;
        default:
          endpoint = '/api/recommendations/trending';
      }

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`http://localhost:5000${endpoint}`, {
        params,
        headers
      });

      if (response.data.success) {
        const data = response.data.recommendations || 
                    response.data.similarItems || 
                    response.data.trendingItems || [];
        
        // Apply filter
        let filteredData = data;
        if (filter === 'affordable') {
          filteredData = data.filter(item => item.price < 300);
        } else if (filter === 'premium') {
          filteredData = data.filter(item => item.price >= 300);
        }

        setRecommendations(filteredData);
      }
    } catch (error) {
      console.error('Fetch recommendations error:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getTabIcon = (tab) => {
    switch (tab) {
      case 'personalized': return <FiTarget />;
      case 'similar': return <FiThumbsUp />;
      case 'trending': return <FiTrendingUp />;
      default: return <FiStar />;
    }
  };

  const getTabTitle = (tab) => {
    switch (tab) {
      case 'personalized': return 'For You';
      case 'similar': return 'Similar Items';
      case 'trending': return 'Trending Now';
      default: return 'Recommendations';
    }
  };

  const getTagColor = (tag) => {
    switch (tag) {
      case '🔥 Trending': return 'bg-red-100 text-red-800';
      case '⭐ Popular': return 'bg-yellow-100 text-yellow-800';
      case '🎯 Personalized': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <FiStar className="mr-2 text-primary" />
              Smart Recommendations
            </h2>
            <p className="text-gray-600">AI-powered suggestions just for you</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-primary bg-opacity-10 text-primary rounded-lg hover:bg-opacity-20 transition disabled:opacity-50"
            >
              <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {['personalized', 'similar', 'trending'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center px-6 py-3 font-medium whitespace-nowrap transition ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {getTabIcon(tab)}
              <span className="ml-2">{getTabTitle(tab)}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 flex flex-wrap gap-2">
          <span className="flex items-center text-gray-600">
            <FiFilter className="mr-2" /> Filter:
          </span>
          {['all', 'affordable', 'premium'].map(filterType => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-1 rounded-full text-sm font-medium transition ${
                filter === filterType
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filterType === 'affordable' ? 'Under ₹300' :
               filterType === 'premium' ? 'Premium' : 'All Items'}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="p-6">
        {recommendations.length === 0 ? (
          <div className="text-center py-12">
            <FiStar className="text-4xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No recommendations found</p>
            <p className="text-sm text-gray-500 mt-2">
              {activeTab === 'personalized' 
                ? 'Order more items to get personalized recommendations'
                : 'Try refreshing or changing filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600 flex items-center">
              <FiClock className="mr-2" />
              Recommendations updated just now
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.id || index}
                  className="group border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  {/* Item Image */}
                  <div className="h-40 bg-gray-200 relative overflow-hidden">
                    {rec.image ? (
                      <img
                        src={rec.image}
                        alt={rec.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                    
                    {/* Tags */}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {rec.tags?.map((tag, i) => (
                        <span
                          key={i}
                          className={`px-2 py-1 rounded-full text-xs font-bold ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Score Badge */}
                    {rec.score && (
                      <div className="absolute top-2 right-2 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold">
                        🎯 {rec.score}
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg truncate">{rec.name}</h3>
                      <span className="font-bold text-primary whitespace-nowrap">
                        ₹{rec.price}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {rec.description || 'Delicious food item'}
                    </p>

                    {/* Restaurant Info */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden mr-2">
                          {rec.restaurant?.image ? (
                            <img
                              src={rec.restaurant.image}
                              alt={rec.restaurant.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs">
                              {rec.restaurant?.name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {rec.restaurant?.name}
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <FiStar className="text-yellow-500 mr-1" />
                            {rec.restaurant?.rating?.toFixed(1) || '4.0'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    {rec.reason && (
                      <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-50 rounded">
                        💡 {rec.reason}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Link
                        to={`/restaurant/${rec.restaurant?.id}`}
                        className="flex-1 text-center py-2 border border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-white transition"
                      >
                        View Restaurant
                      </Link>
                      <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-orange-600 transition">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Explanation */}
            <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  AI
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">
                    How these recommendations are generated:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-white rounded-lg">
                      <div className="font-semibold text-blue-600 mb-1">Personalized AI</div>
                      <p className="text-sm text-gray-600">
                        Analyzes your order history and preferences
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <div className="font-semibold text-purple-600 mb-1">Collaborative Filtering</div>
                      <p className="text-sm text-gray-600">
                        Finds items liked by users with similar tastes
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <div className="font-semibold text-green-600 mb-1">Trend Analysis</div>
                      <p className="text-sm text-gray-600">
                        Identifies popular and trending items in real-time
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Recommendations;