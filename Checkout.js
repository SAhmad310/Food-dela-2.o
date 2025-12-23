import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import PaymentModal from '../components/PaymentModal';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiMapPin, FiClock, FiEdit2 } from 'react-icons/fi';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, total, clearCart } = useCart();
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      toast.error('Please enter delivery address');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Get restaurant ID from first item in cart
      const restaurantId = cart[0]?.restaurantId;

      const orderData = {
        restaurantId,
        items: cart.map(item => ({
          menuItemId: item._id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || ''
        })),
        deliveryAddress: address,
        paymentMethod: 'online',
        deliveryInstructions: instructions
      };

      const response = await axios.post('http://localhost:5000/api/orders', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOrderId(response.data._id);
      setShowPayment(true);
      
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    toast.success('Order placed successfully!');
    navigate(`/order-tracking/${orderId}`);
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <button
          onClick={() => navigate('/restaurants')}
          className="bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-orange-600 transition"
        >
          Browse Restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <FiMapPin className="mr-2 text-primary" />
                Delivery Address
              </h2>
              <button className="text-primary flex items-center">
                <FiEdit2 className="mr-1" /> Change
              </button>
            </div>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your complete delivery address..."
              className="w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Delivery Instructions */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Delivery Instructions</h2>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any special instructions for delivery?"
              className="w-full h-24 p-4 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item._id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-gray-600 text-sm">Quantity: {item.quantity}</p>
                  </div>
                  <div className="font-bold">
                    ₹{item.price * item.quantity}
                  </div>
                </div>
              ))}
              
              <div className="space-y-2 pt-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>₹40</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (5%)</span>
                  <span>₹{(total * 0.05).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    ₹{(parseFloat(total) + 40 + (total * 0.05)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Payment */}
        <div className="space-y-6">
          {/* Delivery Time */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FiClock className="mr-2 text-primary" />
              Delivery Time
            </h2>
            <div className="text-center p-4 bg-primary bg-opacity-10 rounded-lg">
              <div className="text-2xl font-bold text-primary">30-40 mins</div>
              <div className="text-gray-600">Estimated arrival</div>
            </div>
          </div>

          {/* Place Order Button */}
          <div className="sticky top-24">
            <button
              onClick={handlePlaceOrder}
              disabled={loading || !address.trim()}
              className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Place Order • ₹${(parseFloat(total) + 40 + (total * 0.05)).toFixed(2)}`}
            </button>
            
            <p className="text-center text-gray-600 text-sm mt-4">
              By placing your order, you agree to our Terms & Conditions
            </p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        orderId={orderId}
        amount={total}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default Checkout;