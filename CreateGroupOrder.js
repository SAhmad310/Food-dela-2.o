import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUsers, FiSettings, FiLink, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CreateGroupOrder = () => {
  const navigate = useNavigate();
  
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState({
    restaurantId: '',
    name: '',
    description: '',
    splitMethod: 'individual',
    allowLateJoin: true,
    requireApproval: false,
    autoCloseTime: '',
    taxIncluded: true,
    deliveryFeeIncluded: true
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/restaurants');
      setRestaurants(response.data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateGroup = async () => {
    if (!formData.restaurantId || !formData.name.trim()) {
      toast.error('Please select a restaurant and enter a group name');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to create group order');
        navigate('/login');
        return;
      }

      const response = await axios.post(
        'http://localhost:5000/api/group-orders/create',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Group order created successfully!');
        navigate(`/group/${response.data.groupOrder.code}`);
      }
    } catch (error) {
      console.error('Create group error:', error);
      toast.error(error.response?.data?.error || 'Failed to create group order');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Select Restaurant', icon: '🍽️' },
    { number: 2, title: 'Group Details', icon: '👥' },
    { number: 3, title: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Create Group Order</h1>
        <p className="text-gray-600">Order together with friends, family, or colleagues</p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-between mb-12 relative">
        <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 -z-10"></div>
        <div 
          className="absolute top-4 left-0 h-1 bg-primary -z-10 transition-all duration-300"
          style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
        ></div>
        
        {steps.map((stepItem) => (
          <div key={stepItem.number} className="flex flex-col items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-xl mb-2
              ${step >= stepItem.number ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}
              ${step === stepItem.number ? 'ring-4 ring-primary ring-opacity-30' : ''}
            `}>
              {stepItem.icon}
            </div>
            <span className={`text-sm font-medium ${
              step >= stepItem.number ? 'text-primary' : 'text-gray-500'
            }`}>
              {stepItem.title}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
        {/* Step 1: Select Restaurant */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Select a Restaurant</h2>
            <p className="text-gray-600 mb-8">Choose where you want to order from</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {restaurants.slice(0, 6).map(restaurant => (
                <div
                  key={restaurant._id}
                  onClick={() => setFormData(prev => ({ ...prev, restaurantId: restaurant._id }))}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition ${
                    formData.restaurantId === restaurant._id
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-16 h-16 rounded-lg overflow-hidden mr-4">
                      {restaurant.image ? (
                        <img
                          src={restaurant.image}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-500">No Image</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold">{restaurant.name}</h3>
                      <p className="text-gray-600 text-sm">{restaurant.cuisine?.join(', ')}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-yellow-500">★</span>
                        <span className="font-semibold ml-1">{restaurant.rating}</span>
                        <span className="mx-2">•</span>
                        <span>{restaurant.deliveryTime} min</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Group Details */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Group Details</h2>
            <p className="text-gray-600 mb-8">Tell everyone about your group order</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Group Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Team Lunch, Family Dinner, Roommates Order"
                  className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Add a note for your group members..."
                  rows={3}
                  className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Split Method</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'individual', label: 'Individual Orders', desc: 'Each pays for their own items' },
                    { value: 'equal', label: 'Split Equally', desc: 'Divide total equally among all' },
                    { value: 'custom', label: 'Custom Split', desc: 'Set custom amounts manually' }
                  ].map(method => (
                    <div
                      key={method.value}
                      onClick={() => setFormData(prev => ({ ...prev, splitMethod: method.value }))}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition ${
                        formData.splitMethod === method.value
                          ? 'border-primary bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold mb-1">{method.label}</div>
                      <div className="text-sm text-gray-600">{method.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Group Settings</h2>
            <p className="text-gray-600 mb-8">Customize how your group order works</p>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="allowLateJoin"
                        checked={formData.allowLateJoin}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`block w-12 h-6 rounded-full transition ${
                        formData.allowLateJoin ? 'bg-primary' : 'bg-gray-300'
                      }`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${
                        formData.allowLateJoin ? 'translate-x-6' : ''
                      }`}></div>
                    </div>
                    <div>
                      <div className="font-medium">Allow Late Join</div>
                      <div className="text-sm text-gray-500">Others can join after orders start</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="requireApproval"
                        checked={formData.requireApproval}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`block w-12 h-6 rounded-full transition ${
                        formData.requireApproval ? 'bg-primary' : 'bg-gray-300'
                      }`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${
                        formData.requireApproval ? 'translate-x-6' : ''
                      }`}></div>
                    </div>
                    <div>
                      <div className="font-medium">Require Approval</div>
                      <div className="text-sm text-gray-500">Approve participants before they join</div>
                    </div>
                  </label>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="taxIncluded"
                        checked={formData.taxIncluded}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`block w-12 h-6 rounded-full transition ${
                        formData.taxIncluded ? 'bg-primary' : 'bg-gray-300'
                      }`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${
                        formData.taxIncluded ? 'translate-x-6' : ''
                      }`}></div>
                    </div>
                    <div>
                      <div className="font-medium">Include Tax in Split</div>
                      <div className="text-sm text-gray-500">Divide tax among participants</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="deliveryFeeIncluded"
                        checked={formData.deliveryFeeIncluded}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`block w-12 h-6 rounded-full transition ${
                        formData.deliveryFeeIncluded ? 'bg-primary' : 'bg-gray-300'
                      }`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${
                        formData.deliveryFeeIncluded ? 'translate-x-6' : ''
                      }`}></div>
                    </div>
                    <div>
                      <div className="font-medium">Include Delivery Fee</div>
                      <div className="text-sm text-gray-500">Divide delivery fee among all</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Auto-close Time (Optional)</label>
                <input
                  type="datetime-local"
                  name="autoCloseTime"
                  value={formData.autoCloseTime}
                  onChange={handleInputChange}
                  className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <div className="text-sm text-gray-500 mt-2">
                  Group order will automatically close at this time
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-12 pt-6 border-t">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-8 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition"
            >
              Back
            </button>
          ) : (
            <div></div>
          )}
          
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 transition flex items-center"
            >
              Next Step
              <FiChevronRight className="ml-2" />
            </button>
          ) : (
            <button
              onClick={handleCreateGroup}
              disabled={loading || !formData.restaurantId || !formData.name.trim()}
              className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Group Order'}
            </button>
          )}
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-3xl mb-4">👥</div>
          <h3 className="font-bold mb-2">Order Together</h3>
          <p className="text-gray-600">Invite friends, family, or colleagues to order from the same restaurant</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-3xl mb-4">💸</div>
          <h3 className="font-bold mb-2">Split Bills Easily</h3>
          <p className="text-gray-600">Automatically calculate and split the bill based on your chosen method</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-3xl mb-4">🚚</div>
          <h3 className="font-bold mb-2">Single Delivery</h3>
          <p className="text-gray-600">All orders delivered together, saving on delivery fees</p>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupOrder;