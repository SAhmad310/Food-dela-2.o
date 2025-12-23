import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FiUsers, FiShare2, FiCopy, FiClock, FiDollarSign,
  FiCheckCircle, FiUserPlus, FiShoppingCart, FiSend,
  FiPercent, FiDivide, FiUser, FiAlertCircle
} from 'react-icons/fi';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';

const GroupOrder = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  
  const [groupOrder, setGroupOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userOrder, setUserOrder] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [splitMethod, setSplitMethod] = useState('individual');

  useEffect(() => {
    if (code) {
      fetchGroupOrder();
    }
  }, [code]);

  const fetchGroupOrder = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/group-orders/${code}`);
      setGroupOrder(response.data);
      setSplitMethod(response.data.settings.splitMethod);
      
      // Check if current user has submitted order
      const token = localStorage.getItem('token');
      if (token) {
        const userId = localStorage.getItem('userId');
        const userOrder = response.data.orders.find(o => 
          o.user?._id === userId || o.user === userId
        );
        if (userOrder) {
          setUserOrder(userOrder.items);
        }
      }
    } catch (error) {
      console.error('Error fetching group order:', error);
      toast.error('Failed to load group order');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a group code');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to join group order');
        navigate('/login');
        return;
      }

      const response = await axios.post(
        `http://localhost:5000/api/group-orders/join/${joinCode}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Joined group order successfully!');
        setShowJoinModal(false);
        navigate(`/group/${joinCode}`);
      }
    } catch (error) {
      console.error('Join error:', error);
      toast.error(error.response?.data?.error || 'Failed to join group order');
    }
  };

  const handleSubmitOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to submit order');
        return;
      }

      // Convert cart items to group order format
      const cartItems = JSON.parse(localStorage.getItem('foodCart') || '[]');
      
      const orderItems = cartItems.map(item => ({
        menuItemId: item._id,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || ''
      }));

      const response = await axios.post(
        `http://localhost:5000/api/group-orders/${code}/order`,
        { items: orderItems },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Order submitted to group!');
        setUserOrder(cartItems);
        fetchGroupOrder(); // Refresh group data
      }
    } catch (error) {
      console.error('Submit order error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit order');
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/group/${code}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const calculateYourShare = () => {
    if (!groupOrder || !groupOrder.splitDetails) return 0;
    
    const userId = localStorage.getItem('userId');
    const userSplit = groupOrder.splitDetails.find(
      split => split.user?._id === userId || split.user === userId
    );
    
    return userSplit?.amount || 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4">Loading group order...</p>
      </div>
    );
  }

  if (!groupOrder) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <FiAlertCircle className="text-4xl text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Group Order Not Found</h2>
        <p className="text-gray-600 mb-6">The group order may have expired or been cancelled.</p>
        <button
          onClick={() => setShowJoinModal(true)}
          className="bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-orange-600 transition"
        >
          Join Another Group
        </button>
      </div>
    );
  }

  const isHost = groupOrder.host?._id === localStorage.getItem('userId');
  const isParticipant = groupOrder.participants.some(
    p => p.user?._id === localStorage.getItem('userId') || p.user === localStorage.getItem('userId')
  );
  const hasSubmittedOrder = userOrder.length > 0;
  const inviteLink = `${window.location.origin}/group/${code}`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 md:p-8 text-white mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{groupOrder.name}</h1>
            <p className="text-white text-opacity-90">{groupOrder.description || 'Group food order'}</p>
            <div className="flex items-center mt-4 space-x-4">
              <div className="flex items-center">
                <FiUsers className="mr-2" />
                <span>{groupOrder.participants.length} participants</span>
              </div>
              <div className="flex items-center">
                <FiClock className="mr-2" />
                <span>Expires: {new Date(groupOrder.expiresAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
              </div>
              {isHost && (
                <div className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                  👑 Host
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 md:mt-0">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm p-4 rounded-xl">
              <div className="text-center mb-2">
                <div className="text-2xl font-bold">₹{groupOrder.totals?.total || 0}</div>
                <div className="text-sm text-white text-opacity-80">Total Group Amount</div>
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center py-2 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                <FiShare2 className="mr-2" />
                Share Invite
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {['overview', 'orders', 'split', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center px-6 py-3 font-medium whitespace-nowrap transition ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'overview' && <FiUsers className="mr-2" />}
            {tab === 'orders' && <FiShoppingCart className="mr-2" />}
            {tab === 'split' && <FiDivide className="mr-2" />}
            {tab === 'settings' && <FiPercent className="mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Restaurant Info */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 rounded-lg overflow-hidden mr-4">
                    <img
                      src={groupOrder.restaurant?.image}
                      alt={groupOrder.restaurant?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{groupOrder.restaurant?.name}</h2>
                    <p className="text-gray-600">{groupOrder.restaurant?.cuisine?.join(', ')}</p>
                    <div className="flex items-center mt-1">
                      <FiStar className="text-yellow-500 mr-1" />
                      <span className="font-semibold">{groupOrder.restaurant?.rating}</span>
                      <span className="mx-2">•</span>
                      <span>{groupOrder.restaurant?.deliveryTime} min</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => navigate(`/restaurant/${groupOrder.restaurant?._id}`)}
                  className="w-full py-3 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary hover:text-white transition"
                >
                  View Restaurant Menu
                </button>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="font-bold mb-4 flex items-center">
                    <FiUserPlus className="mr-2 text-primary" />
                    Invite Friends
                  </h3>
                  <div className="space-y-3">
                    <div className="flex">
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="flex-1 p-3 border rounded-l-lg bg-gray-50"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-4 bg-primary text-white rounded-r-lg hover:bg-orange-600 transition"
                      >
                        <FiCopy />
                      </button>
                    </div>
                    
                    <div className="text-center py-4">
                      <QRCode 
                        value={inviteLink} 
                        size={128}
                        className="mx-auto"
                      />
                      <p className="text-sm text-gray-600 mt-2">Scan to join</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="font-bold mb-4 flex items-center">
                    <FiShoppingCart className="mr-2 text-primary" />
                    Your Order
                  </h3>
                  
                  {hasSubmittedOrder ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center text-green-700">
                          <FiCheckCircle className="mr-2" />
                          <span className="font-semibold">Order Submitted</span>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          {userOrder.length} items • ₹{calculateYourShare()}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        {userOrder.map((item, index) => (
                          <div key={index} className="flex justify-between p-2 hover:bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
                            </div>
                            <div className="font-semibold">
                              ₹{item.price * item.quantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <FiShoppingCart className="text-4xl text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">You haven't added any items yet</p>
                      <button
                        onClick={() => navigate(`/restaurant/${groupOrder.restaurant?._id}`)}
                        className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-orange-600 transition"
                      >
                        Add Items from Menu
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-6">Group Orders</h2>
              
              <div className="space-y-4">
                {groupOrder.participants.map((participant, index) => (
                  <div key={index} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center text-primary font-bold mr-3">
                          {participant.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold">{participant.name}</div>
                          <div className="text-sm text-gray-500">
                            {participant.orderSubmitted ? 'Order submitted' : 'Pending order'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold">₹{participant.orderTotal || 0}</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          participant.paymentStatus === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {participant.paymentStatus || 'pending'}
                        </div>
                      </div>
                    </div>

                    {participant.orderSubmitted && (
                      <div className="pl-13">
                        <div className="border-t pt-3">
                          <div className="text-sm font-medium mb-2">Order Items:</div>
                          {groupOrder.orders
                            .filter(order => 
                              order.user?._id === participant.user?._id || 
                              order.user === participant.user
                            )
                            .flatMap(order => order.items)
                            .map((item, idx) => (
                              <div key={idx} className="flex justify-between py-1">
                                <div>
                                  <span className="font-medium">{item.item.name}</span>
                                  <span className="text-gray-500 text-sm ml-2">
                                    x{item.quantity}
                                  </span>
                                </div>
                                <div className="font-semibold">
                                  ₹{item.price * item.quantity}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Split Tab */}
          {activeTab === 'split' && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Bill Splitting</h2>
                {isHost && (
                  <select
                    value={splitMethod}
                    onChange={(e) => setSplitMethod(e.target.value)}
                    className="border rounded-lg px-4 py-2"
                  >
                    <option value="individual">Individual Orders</option>
                    <option value="equal">Split Equally</option>
                    <option value="custom">Custom Split</option>
                  </select>
                )}
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Subtotal</div>
                    <div className="font-bold text-lg">₹{groupOrder.totals?.subtotal}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Tax (5%)</div>
                    <div className="font-bold text-lg">₹{groupOrder.totals?.tax}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Delivery</div>
                    <div className="font-bold text-lg">₹{groupOrder.totals?.deliveryFee}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total</div>
                    <div className="font-bold text-lg text-primary">₹{groupOrder.totals?.total}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">Split Breakdown</h3>
                
                {groupOrder.splitDetails?.map((split, index) => (
                  <div key={index} className="border rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                          {split.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold">{split.user?.name || 'User'}</div>
                          <div className="text-sm text-gray-500">{split.items.length} items</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-xl">₹{split.amount}</div>
                        <div className={`text-sm px-3 py-1 rounded-full ${
                          split.paid 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {split.paid ? 'Paid' : 'Pending'}
                        </div>
                      </div>
                    </div>

                    <div className="pl-13">
                      <div className="text-sm text-gray-600 mb-2">Items:</div>
                      <div className="space-y-1">
                        {split.items.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            • {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isHost && groupOrder.status === 'ordered' && (
                <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-bold mb-3">Payment Collection</h4>
                  <p className="text-gray-600 mb-4">
                    Mark payments as received from participants
                  </p>
                  <button className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-orange-600 transition">
                    Update Payment Status
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-bold mb-4">Order Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Group Status</span>
                <span className={`font-semibold ${
                  groupOrder.status === 'active' ? 'text-green-600' :
                  groupOrder.status === 'ordered' ? 'text-blue-600' :
                  'text-gray-600'
                }`}>
                  {groupOrder.status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Participants</span>
                <span className="font-semibold">{groupOrder.participants.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Orders Submitted</span>
                <span className="font-semibold">
                  {groupOrder.participants.filter(p => p.orderSubmitted).length}/
                  {groupOrder.participants.length}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Your Status</span>
                <span className={`font-semibold ${
                  hasSubmittedOrder ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {hasSubmittedOrder ? 'Order Submitted' : 'Pending'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Your Share</span>
                <span className="font-bold text-primary">₹{calculateYourShare()}</span>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-bold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {!hasSubmittedOrder && isParticipant && (
                <button
                  onClick={handleSubmitOrder}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 transition flex items-center justify-center"
                >
                  <FiSend className="mr-2" />
                  Submit Your Order
                </button>
              )}
              
              <button
                onClick={handleCopyLink}
                className="w-full py-3 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary hover:text-white transition flex items-center justify-center"
              >
                <FiShare2 className="mr-2" />
                Share Group Invite
              </button>
              
              {isHost && groupOrder.status === 'active' && (
                <button
                  onClick={() => toast.info('Feature coming soon')}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center"
                >
                  <FiCheckCircle className="mr-2" />
                  Place Group Order
                </button>
              )}
              
              {isHost && (
                <button
                  onClick={() => toast.info('Feature coming soon')}
                  className="w-full py-3 border-2 border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition"
                >
                  Cancel Group Order
                </button>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-bold mb-4 flex items-center">
              <FiUsers className="mr-2" />
              Participants ({groupOrder.participants.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {groupOrder.participants.map((participant, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      participant.user?._id === groupOrder.host?._id
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {participant.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="font-medium">
                        {participant.name}
                        {participant.user?._id === groupOrder.host?._id && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                            Host
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {participant.orderSubmitted ? 'Ordered' : 'Pending'}
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold">₹{participant.orderTotal}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">Join Group Order</h2>
              <p className="text-gray-600 mb-6">Enter the 6-digit group code to join</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Group Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g., ABC123"
                    className="w-full p-4 border-2 rounded-xl text-center text-2xl font-bold tracking-wider uppercase"
                    maxLength={6}
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinGroup}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 transition"
                  >
                    Join Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupOrder;