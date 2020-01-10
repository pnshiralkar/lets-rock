// Requires
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const md5 = require('md5');
const validator = require('validator');
const rabbitMQ = require('./rabbitMQ');
const geoJson = require('geojson-tools');
const sockio = require('./mySocket');

// Express init
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

app.use((req, res, next)=>{
    console.log(req.originalUrl);
    next();
});

let s = app.listen(8888);
sockio.init(s);


// DB Init
let dbconn = false;
mongoose.connect('mongodb://root:pass1234@localhost:27017/', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.connection.once('open', () => {
    //connected!
    dbconn = true;
    console.log("DB Connected");
}).on('error', (err) => {
    console.log(err);
});


// Models
const User = require('./models/user');
const Sell = require('./models/farmerSell');

// Custom Modules
const farmerPortal = require('./modules/farmer');
const warehousePortal = require('./modules/warehouse');
const logisticsPortal = require('./modules/logistics');

// Verify JWT middleware
function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1];
        req.token = bearerToken;
        jwt.verify(req.token, 'secretkey', (err, user) => {
            if (err)
                return res.sendStatus(403);
            else{
                User[user.user.role].findOne({username: user.user.username}).then(u=>{
                    if(u)
                        req.user = user.user;
                    else
                        return res.sendStatus(403);
                    // console.log(u);
                    next();
                })
            }
        });
    } else {
        return res.sendStatus(403);
    }
}

function ifNotEmpty(str) {
    if (str === '' || str == undefined)
        throw 0;
    return str;
}
app.post('/api/register', (req, res) => {
    // console.log(req);
    console.log(req.body);
    let user;
    try {
        if (isNaN(req.body.mobileNo) || validator.isEmpty('' + req.body.name) || validator.isEmpty('' + req.body.username) || validator.isEmpty('' + req.body.password))
            throw 1;
        user = {
            name: req.body.name,
            username: req.body.username,
            mobile: req.body.mobileNo,
            password: md5(req.body.password),
            role: req.body.role
        };
    } catch (e) {
        res.status(400).json({status: "Invalid data"});
        return;
    }

    if (['farmer', 'logistics', 'warehouse'].indexOf(req.body.role) === -1) {
        res.status(400).json({status: "Invalid role"});
        return
    }

    User[req.body.role].findOne({username: req.body.username}).then((result) => {
            if (result == null) {
                User[req.body.role].findOne({mobile: req.body.mobileNo}).then((result) => {
                    if (result == null) {
                        if (user.role === 'farmer') {
                            user.location = req.body.location;
                            user = new User.farmer(user);
                        } else if (user.role === 'warehouse') {
                            try {
                                user.totalSpace = ifNotEmpty(req.body.totalSpace);
                                user.spaceAvailable = req.body.totalSpace;
                            }catch (e) {
                                return res.status(400).json({status: "Specify total space"});
                            }
                            user.location = [req.body.location_lat, req.body.location_lon];
                            user = new User.warehouse(user);
                        } else if (user.role === 'logistics') {
                            user = new User.logistics(user);
                        } else {
                            return res.status(400).json({status: "Invalid role"})
                        }
                        let us = user.save();
                        if (typeof us === 'undefined')
                            return res.sendStatus(500);
                        else
                            return res.json({status: 'success'});
                    } else
                        return res.json({status: 'duplicate_email'})
                })
            } else
                return res.json({status: 'duplicate_username'})
        }
    );
});

app.post('/api/login', (req, res) => {
    // console.log(req.body);
    if (['farmer', 'logistics', 'warehouse'].indexOf(req.body.role) === -1) {
        return res.status(400).json({status: "Invalid role"});
    }
    User[req.body.role].findOne({username: req.body.username, password: md5(req.body.password)}).then((result) => {
        if (result) {
            // console.log(result);
            jwt.sign({user: result}, 'secretkey', (err, token) => {
                return res.json({token, uid: result._id});
                console.log("loggedin");
            })
        } else
            return res.status(400).json({status: 'invalid_username_password'});
    });
});

app.get('/api/check', verifyToken, (req, res)=>{
    return res.json({status: "success", user: req.user})
}); // temporary



app.post('/api/farmer/sell', verifyToken, farmerPortal.sell);

app.get('/api/farmer/sell', verifyToken, farmerPortal.getSellAll);

app.get('/api/farmer/sell/:id', verifyToken, farmerPortal.getSell);



app.get('/api/warehouse/all', warehousePortal.getAllWares); // Get all warehouses

app.get('/api/warehouse/sell', verifyToken, warehousePortal.getSellAll); // Get all warehouse orders

app.get('/api/warehouse/:status', verifyToken, warehousePortal.getSellStatus); // Get allocation request orders

app.get('/api/warehouse/sell/:id', verifyToken, warehousePortal.getSell); // Get specific order

app.post('/api/warehouse/accept/:id', verifyToken, warehousePortal.acceptSell); // Accept specific order

app.post('/api/warehouse/reject/:id', verifyToken, warehousePortal.rejectSell); // Reject specific order

app.post('/api/warehouse/confirmDel/:id', verifyToken, warehousePortal.confirmDelivery); // Confirm delivery of specific order


app.get('/api/logistics/orders', verifyToken, logisticsPortal.getOrders);

app.post('/api/logistics/schedule', verifyToken, logisticsPortal.schedule);

app.post('/api/logistics/pickup', verifyToken, logisticsPortal.pickup);

app.post('/api/logistics/deliver', verifyToken, logisticsPortal.deliver);

app.get('/sock', (req, res)=>{
    sockio.send("uid33", "name", "val");
});




let demand = 111;

function compare(a, b) {
    if (a.val < b.val)
        return -1;
    if (a.val > b.val)
        return 1;
    return 0;
}

function topWarehouses(sell, callback) {
    console.log(1);
    let wares = [];
    console.log(sell);
    async function f() {
        await User.warehouse.find({spaceAvailable: {$gt: sell.weight}}, (err, warehouses) => {
            // console.log(sell.location, warehouses.location, warehouses)
            for (let i in warehouses) {
                wares.push({
                    val: (demand * 0.6 + geoJson.getDistance([sell.location, warehouses[i].location], 3) * 0.4),
                    wareId: warehouses[i]._id
                });
                    sockio.send(warehouses[i]._id, 'newSellReq', sell._id);
            }
        });
        wares.sort(compare);
        callback(wares);
    }
    f();
}

rabbitMQ.receive('sell', (msg) => {
    let sellId = msg.content.toString();
    console.log(sellId);
    Sell.findOne({_id: sellId}).then(sell => {
        topWarehouses(sell, (topw)=>{
            for(let i in topw){
                if(i>=3)
                    break;
                User.warehouse.findOne({_id: topw[i].wareId}).then(ware=>{
                    ware.orders.push(sellId);
                    ware.save()
                })
            }
        });
    })
});