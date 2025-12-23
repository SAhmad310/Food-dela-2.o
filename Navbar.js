import React from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingCart, FiUser, FiSearch, FiMapPin } from 'react-icons/fi';
import LanguageSelector from './LanguageSelector';

// Add to the right side section (with cart and user icons)
<div className="flex items-center space-x-4">
  <LanguageSelector compact={true} />
  {/* ... existing cart and user buttons ... */}
</div>


const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <span className="text-2xl font-bold text-gray-800">FoodExpress</span>
          </Link>

          {/* Location Selector */}
          <div className="hidden md:flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full">
            <FiMapPin className="text-gray-600" />
            <span className="font-medium">Delivering to: </span>
            <select className="bg-transparent outline-none font-semibold">
              <option>Home</option>
              <option>Office</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-4 hidden lg:block">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for restaurants or cuisine..."
                className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-6">
            <Link to="/restaurants" className="hidden md:block font-medium hover:text-primary transition">
              Restaurants
            </Link>
            <Link to="/cart" className="relative">
              <FiShoppingCart className="text-2xl text-gray-700 hover:text-primary transition" />
              <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                0
              </span>
            </Link>
            <Link to="/login">
              <FiUser className="text-2xl text-gray-700 hover:text-primary transition" />
            </Link>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="mt-4 lg:hidden">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search for restaurants or cuisine..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;