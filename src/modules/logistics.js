// Requires
const rabbitMQ = require('../rabbitMQ');

// Models
const User = require('../models/user');
const Sell = require('../models/farmerSell');
const Transport = require('../models/transport');

function ifNotEmpty(str) {
    if (str === '' || str == undefined)
        throw 0;
    return str;
}


module.exports.getOrders = (req, res)=>{
    let orders = [];
    Transport.find({}, (err, data)=>{
        for(let i in data){
            orders.push(data[i]);
            if(i==data.length - 1)
                return res.status(200).json(orders);
        }
    })
};

module.exports.schedule = (req, res)=>{
    Transport.findOne({_id: req.body.id}).then(order=>{
        if(order.status !== 'inQueue')
            return res.status(400).json({status: "Invalid request"});
        try {
            order.status = 'scheduled';
            order.pickupDate = ifNotEmpty(req.body.pickupDate);
            order.save();
        }catch (e) {
            return res.status(400).json({status: "Invalid PickupDate"});
        }
        Sell.findOne({_id: order.sellId}, (err, sell)=>{
            try {
                sell.status = 'scheduled';
                sell.pickupDate = ifNotEmpty(req.body.pickupDate);
                sell.save();
                return res.status(200).json({status: "success"});
            }catch (e) {
                return res.status(400).json({status: "Invalid PickupDate"});
            }
        });
    });
};

module.exports.deliver = (req, res)=>{
    Transport.findOne({_id: req.body.id}).then(order=>{
        if(order.status !== 'transit')
            return res.status(400).json({status: "Invalid request"});
        try {
            order.status = 'delivered';
            order.deliveryDate = ifNotEmpty(req.body.deliveryDate);
            order.save();
        }catch (e) {
            return res.status(400).json({status: "Invalid DeliveryDate"});
        }
        Sell.findOne({_id: order.sellId}, (err, sell)=>{
            try {
                sell.status = 'delivered';
                sell.deliveryDate = ifNotEmpty(req.body.deliveryDate);
                sell.save();
                return res.status(200).json({status: "success"});
            }catch (e) {
                return res.status(400).json({status: "Invalid DeliveryDate"});
            }
        });
    });
};

module.exports.pickup = (req, res)=>{
    Transport.findOne({_id: req.body.id}).then(order=>{
        if(order.status !== 'scheduled')
            return res.status(400).json({status: "Invalid request"});
        try {
            order.status = 'transit';
            order.save();
        }catch (e) {
            return res.status(400).json({status: "Invalid PickupDate"});
        }
        Sell.findOne({_id: order.sellId}, (err, sell)=>{
            try {
                sell.status = 'transit';
                sell.save();
                return res.status(200).json({status: "success"});
            }catch (e) {
                return res.status(400).json({status: "Invalid PickupDate"});
            }
        });
    });
};