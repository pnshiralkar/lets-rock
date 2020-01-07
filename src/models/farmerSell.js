const mongoose = require('mongoose');
const Schema = mongoose.Schema;

module.exports = mongoose.model('FarmerSell', new Schema({
    crop_name: String,
    weight: Number, // in kg
    location: String, // Location of farm
    status: String, // in queue, warehouse allocated, logistics allocated, picked up
    warehouseId: String, // Id of warehouse allocated
    logisticsTransitId: String // Id of transit order
}, {timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}}));