const mongoose = require('mongoose');
const Schema = mongoose.Schema;

module.exports = mongoose.model('FarmerSell', new Schema({
    crop_name: String,
    //description
    weight: Number, // in kg
    location: [Number], // Location of farm
    status: String, // in queue , warehouse allocated, logistics allocated, transit, delivered
    warehouseId: String, // Id of warehouse allocated
    logisticsTransitId: String, // Id of transit order
    pickupDate: String
}, {timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}}));