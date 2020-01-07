const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const extend = require('mongoose-extend-schema');

const User = new Schema({
    name: String,
    username: String,
    email: String,
    password: String,
    role: {type: String, enum: ['admin', 'farmer', 'logistics', 'warehouse']}
});

module.exports.user = mongoose.model('User', User);


// Farmer
const schema_farmer = extend(User, {
    location: String,
    sellHistory: [String],
    currentCrop: [String]
});

module.exports.farmer = mongoose.model('Farmer', schema_farmer);


// Logistics
const schema_logistics = extend(User, {
    payment: Number
});

module.exports.logistics = mongoose.model('Logistic', schema_logistics);


// Warehouse
const schema_warehouse = extend(User, {
    totalSpace: Number,
    spaceAvailable: Number,
    location: String,
});

module.exports.warehouse = mongoose.model('Warehouse', schema_warehouse);