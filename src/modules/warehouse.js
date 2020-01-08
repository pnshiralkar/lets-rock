// Requires
const rabbitMQ = require('../rabbitMQ');

// Models
const User = require('../models/user');
const Sell = require('../models/farmerSell');

function ifNotEmpty(str){
    if(str === '' || str == undefined)
        throw 0;
    return str;
}


module.exports.getSellAll = (req, res)=>{
    if(req.user.role !== 'warehouse')
        return res.status(403).json({status: "Invalid role"});
    Sell.find({warehouseId: req.user._id}, (err, sell)=>{
        return res.status(200).json(sell);
    })
};

module.exports.getSell = (req, res)=>{
    if(req.user.role !== 'warehouse')
        return res.status(403).json({status: "Invalid role"});
    Sell.findOne({_id: req.params.id, warehouseId: req.user._id}).then((sell)=>{
        return res.status(200).json(sell);
    })
};

module.exports.getSellStatus = (req, res)=>{
    if(req.user.role !== 'warehouse')
        return res.status(403).json({status: "Invalid role"});
    User.warehouse.findOne({username: req.user.username}).then(user => {
        let sells = [];
        async function f() {
            for (let i in user.orders) {
                await Sell.findOne({_id: user.orders[i], status: req.params.status}).then(sell => {
                    if(sell)
                        sells.push(sell);
                });
                if (i == user.orders.length - 1)
                    return res.status(200).json(sells);
            }
        }
        f();
    })
};


module.exports.acceptSell = (req, res)=>{
    if(req.user.role !== 'warehouse')
        return res.status(403).json({status: "Invalid role"});
    Sell.findOne({_id: req.params.id}).then(sell=>{
        if(!sell)
            return res.status(400).json({status: "Invalid sell id"});
        if(sell.status !== 'inQueue')
            return res.status(400).json({status: "Warehouse Allocation requst expired"});
        sell.warehouseId = req.user._id;
        sell.status = "warehouseAllocated";
        sell.save();
        User.warehouse.findOne({_id: req.user._id}).then(w=>{
            w.spaceAvailable = w.spaceAvailable - sell.weight;
            e.save();
        })
        // Employ Logistics
        return res.status(200).json({status: "success"});
    })
};

module.exports.confirmDelivery = (req, res)=>{
    if(req.user.role !== 'warehouse')
        return res.status(403).json({status: "Invalid role"});
    Sell.findOne({_id: req.params.id, warehouseId: req.user._id}).then(sell=>{
        if(!sell)
            return res.status(400).json({status: "Invalid sell id"});
        if(sell.status === 'delivered')
            return res.status(400).json({status: "Delivery already confirmed"});
        else if(sell.status !== 'transit')
            return res.status(400).json({status: "Invalid"});
        sell.warehouseId = req.user._id;
        sell.status = "warehouseAllocated";
        sell.save();
        // Employ Logistics
        return res.status(200).json({status: "success"});
    })
};