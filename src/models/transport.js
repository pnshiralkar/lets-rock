const mongoose = require('mongoose');
const Schema = mongoose.Schema;

module.exports = mongoose.model('Transport', new Schema({
    sellId: String,
    from: [Number],
    to: [Number],
    status: String,
    cost: Number,
    pickupDate: String,
    deliveryDate: String,
}));