const mongoose = require('mongoose');
const DriverSchema = new mongoose.Schema({
  driverName: { type: String, required: true },
  plate: { type: String, required: true },
  status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  }
});
DriverSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Driver', DriverSchema);
