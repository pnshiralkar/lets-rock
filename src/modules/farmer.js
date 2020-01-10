// Requires
const rabbitMQ = require('../rabbitMQ');

// Models
const User = require('../models/user');
const Sell = require('../models/farmerSell');

function ifNotEmpty(str) {
    if (str === '' || str == undefined)
        throw 0;
    return str;
}

module.exports.sell = (req, res) => {
    if (req.user.role !== 'farmer')
        return res.status(403).json({status: "Forbidden role"});

    let sell;
    try {
        sell = new Sell({
            crop_name: ifNotEmpty(req.body.cropname),
            weight: ifNotEmpty(req.body.weight),
            price: ifNotEmpty(req.body.price),
            location: [req.body.location_lat, req.body.location_lon],
            status: "inQueue",
        });
    } catch (e) {
        return res.status(400).json({status: "Invalid data"});
    }
    if (sell.save() === undefined)
        return res.status(500);
    else
    User['farmer'].findOne({username: req.user.username}).then((resp) => {
        resp.sellHistory.push(sell._id);
        rabbitMQ.send('sell', '' + sell._id);
        resp.save().then(() => {
            return res.status(200).json({status: 'success', sellId: sell._id});
        });
    });
};

module.exports.getSell = (req, res) => {
    if (req.user.role !== 'farmer')
        return res.status(403).json({status: "Forbidden role"});
    User.farmer.findOne({username: req.user.username}).then(user => {
        if (user.sellHistory.indexOf(req.params.id) === -1)
            return res.status(400).json({status: "Invalid sellId"});
        Sell.findOne({_id: req.params.id}).then(sell => {
            if (!sell)
                return res.status(400).json({status: "Invalid sellId"});
            return res.status(200).json(sell);
        })
    })
};

module.exports.getSellAll = (req, res) => {
    if (req.user.role !== 'farmer')
        return res.status(403).json({status: "Forbidden role"});
    User.farmer.findOne({username: req.user.username}).then(user => {
        let sells = [];
        async function f() {
            for (let i in user.sellHistory) {
                console.log(user.sellHistory[i]);
                await Sell.findOne({_id: user.sellHistory[i]}).then(sell => {
                    sells.push(sell);
                });
                if (i == user.sellHistory.length - 1)
                    return res.status(200).json(sells);
            }
        }
        f();
    })
};