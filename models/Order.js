const mongoose = require('mongoose');
const OrderSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  status: { type: String, enum: ['pending', 'accepted', 'delivered'], default: 'pending' },
  eta: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Order', OrderSchema);
