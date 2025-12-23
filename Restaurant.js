const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  cuisine: [String],
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  deliveryTime: { type: Number, default: 30 }, // minutes
  minOrder: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  image: String,
  isActive: { type: Boolean, default: true },
  menu: [
    {
      name: String,
      description: String,
      price: Number,
      category: String,
      image: String,
      isVeg: { type: Boolean, default: true },
      isAvailable: { type: Boolean, default: true }
    }
  ]
});

module.exports = mongoose.model('Restaurant', restaurantSchema);