// Requires
const mySock = require('../mySocket')

// Models
const User = require('../models/user');
const Sell = require('../models/farmerSell');
const Transport = require('../models/transport');

function ifNotEmpty(str){
    if(str === '' || str == undefined)
        throw 0;
    return str;
}


module.exports.getSellAll = (req, res)=>{
    console.log(1);
    if(req.user.role !== 'warehouse')
        return res.status(403).json({status: "Invalid role"});
    Sell.find({warehouseId: req.user._id}, (err, sell)=>{
        return res.status(200).json(sell);
    })
};

module.exports.getAllWares = (req, res)=>{
    User.warehouse.find({}, 'location', (err, wares)=>{
        return res.status(200).json(wares);
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
    // console.log("/api/warehouse/")
    User.warehouse.findOne({username: req.user.username}).then(user => {
        let sells = [];
        console.log(req.user.username);
        async function f(user1) {
            if(user1.orders.length > 0) {
                for (let i in user1.orders) {
                    console.log(req.params.status)
                    await Sell.findOne({_id: user1.orders[i], status: req.params.status}).then(sell => {
                        if (sell)
                            sells.push(sell);
                        else
                            console.log(user1.orders[i], sell);
                    });
                    if (i == user.orders.length - 1)
                        return res.status(200).json(sells);
                }
            }else
                return res.status(200).json([]);
        }
        f(user);
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
            w.orders.push(sell._id);
            w.save();
        });
        // Employ Logistics
        let trans = new Transport({
            sellId: sell._id,
            from: sell.location,
            to: req.user.location,
            status: "inQueue",
            cost: 100 // Change later
        });
        trans.save();
        mySock.sendAll('sellReqUpdate', sell._id);
        return res.status(200).json({status: "success"});
    })
};

module.exports.rejectSell = (req, res)=>{
    if(req.user.role !== 'warehouse')
        return res.status(403).json({status: "Invalid role"});
    Sell.findOne({_id: req.params.id}).then(sell=>{
        if(!sell)
            return res.status(400).json({status: "Invalid sell id"});
        User.warehouse.findOne({_id: req.user._id}).then(w=>{
            var index = w.orders.indexOf(sell._id);
            if (index > -1) {
                w.orders.splice(index, 1);
            }
            w.save();
        });
        // Employ Logistics
        let trans = new Transport({
            sellId: sell._id,
            from: sell.location,
            to: req.user.location,
            status: "inQueue",
            cost: 100 // Change later
        });
        mySock.sendAll('sellReqUpdate', sell._id);
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