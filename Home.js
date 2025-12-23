import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiClock, FiStar, FiChevronRight } from 'react-icons/fi';
import Recommendations from '../components/Recommendations';

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/restaurants');
      setRestaurants(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setLoading(false);
    }
  };

  // Add after restaurant listing section
<section className="mt-16">
  <Recommendations 
    userId={localStorage.getItem('userId')}
  />
</section>

  // Categories
  const categories = [
    { name: 'Pizza', icon: '🍕', color: 'bg-red-100' },
    { name: 'Burger', icon: '🍔', color: 'bg-yellow-100' },
    { name: 'Sushi', icon: '🍣', color: 'bg-blue-100' },
    { name: 'Pasta', icon: '🍝', color: 'bg-pink-100' },
    { name: 'Salad', icon: '🥗', color: 'bg-green-100' },
    { name: 'Dessert', icon: '🍰', color: 'bg-purple-100' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Craving something delicious?
        </h1>
        <p className="text-xl mb-6">Get it delivered to your doorstep in minutes!</p>
        <button className="bg-white text-primary font-bold px-8 py-3 rounded-full hover:bg-gray-100 transition">
          Order Now
        </button>
      </div>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => (
            <div
              key={index}
              className={`${category.color} rounded-xl p-4 text-center cursor-pointer hover:shadow-lg transition`}
            >
              <div className="text-3xl mb-2">{category.icon}</div>
              <div className="font-semibold">{category.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Restaurants */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Top Restaurants Near You</h2>
          <Link to="/restaurants" className="text-primary font-semibold flex items-center">
            View All <FiChevronRight className="ml-1" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading restaurants...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {restaurants.slice(0, 8).map((restaurant) => (
              <Link
                key={restaurant._id}
                to={`/restaurant/${restaurant._id}`}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition"
              >
                <div className="h-48 bg-gray-300">
                  {restaurant.image ? (
                    <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No Image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{restaurant.name}</h3>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <FiStar className="text-yellow-500 mr-1" />
                      <span className="font-semibold">{restaurant.rating}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <FiClock className="mr-1" />
                      <span>{restaurant.deliveryTime} min</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">{restaurant.cuisine?.join(', ')}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};


// Add after restaurant listing section
<section className="mt-16">
  <Recommendations 
    userId={localStorage.getItem('userId')}
  />
</section>

export default Home;