import React, { useState } from 'react';
import { loadScript } from '@razorpay/checkout';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiCreditCard, FiCheckCircle } from 'react-icons/fi';

const PaymentModal = ({ isOpen, onClose, orderId, amount, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online');

  const loadRazorpayScript = async () => {
    return loadScript('https://checkout.razorpay.com/v1/checkout.js');
  };

  const handlePayment = async () => {
    if (paymentMethod === 'cod') {
      // Handle COD
      try {
        await axios.post(`http://localhost:5000/api/orders/${orderId}/update-payment`, {
          paymentMethod: 'cod',
          paymentStatus: 'pending'
        });
        onPaymentSuccess();
        toast.success('Order placed successfully with COD!');
        onClose();
      } catch (error) {
        toast.error('Failed to place order');
      }
      return;
    }

    // Online Payment
    setLoading(true);
    try {
      await loadRazorpayScript();

      // Create order in backend
      const { data: orderData } = await axios.post('http://localhost:5000/api/payment/create-order', {
        amount: amount,
        receipt: `order_${orderId}`,
        currency: 'INR'
      });

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'FoodExpress',
        description: 'Food Order Payment',
        order_id: orderData.id,
        handler: async (response) => {
          // Verify payment
          const verifyResponse = await axios.post('http://localhost:5000/api/payment/verify-payment', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            orderId: orderId
          });

          if (verifyResponse.data.success) {
            toast.success('Payment successful! Order confirmed.');
            onPaymentSuccess();
            onClose();
          } else {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: 'Customer Name',
          email: 'customer@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#FF6B35'
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled');
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Payment Options</h2>
          
          <div className="space-y-4 mb-8">
            {/* Online Payment */}
            <div 
              className={`border-2 rounded-xl p-4 cursor-pointer transition ${paymentMethod === 'online' ? 'border-primary bg-blue-50' : 'border-gray-200'}`}
              onClick={() => setPaymentMethod('online')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'online' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                    {paymentMethod === 'online' && <FiCheckCircle className="text-white text-sm" />}
                  </div>
                  <FiCreditCard className="text-2xl" />
                  <div>
                    <h3 className="font-bold">Online Payment</h3>
                    <p className="text-sm text-gray-600">Pay with card, UPI, or wallet</p>
                  </div>
                </div>
              </div>
            </div>

            {/* COD */}
            <div 
              className={`border-2 rounded-xl p-4 cursor-pointer transition ${paymentMethod === 'cod' ? 'border-primary bg-blue-50' : 'border-gray-200'}`}
              onClick={() => setPaymentMethod('cod')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                    {paymentMethod === 'cod' && <FiCheckCircle className="text-white text-sm" />}
                  </div>
                  <div className="text-2xl">💵</div>
                  <div>
                    <h3 className="font-bold">Cash on Delivery</h3>
                    <p className="text-sm text-gray-600">Pay when you receive your order</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Summary */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span>Order Amount</span>
              <span className="font-semibold">₹{amount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Delivery Fee</span>
              <span className="font-semibold">₹40</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Taxes</span>
              <span className="font-semibold">₹{(amount * 0.05).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">₹{(parseFloat(amount) + 40 + (amount * 0.05)).toFixed(2)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={loading}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : paymentMethod === 'cod' ? 'Place Order (COD)' : `Pay ₹${(parseFloat(amount) + 40 + (amount * 0.05)).toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;