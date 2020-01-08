// Requires
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const md5 = require('md5');
const validator = require('validator');

// Express init
const app = express();
app.use(bodyParser.urlencoded({extended: true}));


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

// Verify JWT middleware
function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1];
        req.token = bearerToken;
        jwt.verify(req.token, 'secretkey', (err, user) => {
            if (err)
                res.sendStatus(403);
            else
                req.user = user.user;
        });
        next();
    } else {
        res.sendStatus(403);
    }
}

function ifNotEmpty(str) {
    if (str === '' || str == undefined)
        throw 0;
    return str;
}
app.post('/api/register', (req, res) => {
    console.log(req.body);
    let user;
    try {
        if (!validator.isEmail(req.body.email) || validator.isEmpty('' + req.body.name) || validator.isEmpty('' + req.body.username) || validator.isEmpty('' + req.body.password))
            throw 1;
        user = {
            name: req.body.name,
            //moile No.
            username: req.body.username,
            email: req.body.email,
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
                User[req.body.role].findOne({email: req.body.email}).then((result) => {
                    if (result == null) {
                        if (user.role === 'farmer') {
                            user.location = req.body.location;
                            user = new User.farmer(user);
                        } else if (user.role === 'warehouse') {
                            user.totalSpace = req.body.totalSpace;
                            user.location = [req.body.location_lat, req.body.location_lon];
                            user = new User.warehouse(user);
                        } else if (user.role === 'logistics') {
                            user = new User.logistics(user);
                        } else {
                            res.status(400).json({status: "Invalid role"})
                        }
                        let us = user.save();
                        if (typeof us === 'undefined')
                            res.sendStatus(500);
                        else
                            res.json({status: 'success'});
                    } else
                        res.json({status: 'duplicate_email'})
                })
            } else
                res.json({status: 'duplicate_username'})
        }
    );
});

app.post('/api/login', (req, res) => {
    if (['farmer', 'logistics', 'warehouse'].indexOf(req.body.role) === -1) {
        res.status(400).json({status: "Invalid role"});
        return
    }
    User[req.body.role].findOne({username: req.body.username, password: md5(req.body.password)}).then((result) => {
        if (result) {
            console.log(result);
            jwt.sign({user: result}, 'secretkey', (err, token) => {
                res.json({token});
            })
        } else
            res.status(400).json({status: 'invalid_username_password'});
    });
});

app.get('/api/check', verifyToken, (req, res)=>{
    return res.json({status: "success", user: req.user})
}); // temporary

app.post('/api/farmer/sell', verifyToken, farmerPortal.sell);

app.get('/api/farmer/sell', verifyToken, farmerPortal.getSellAll);

app.get('/api/farmer/sell/:id', verifyToken, farmerPortal.getSell);


app.get('/api/warehouse/sell', verifyToken, warehousePortal.getSellAll); // Get all warehouse orders

app.get('/api/warehouse/:status', verifyToken, warehousePortal.getSellStatus); // Get allocation request orders

app.get('/api/warehouse/sell/:id', verifyToken, warehousePortal.getSell); // Get specific order

app.post('/api/warehouse/accept/:id', verifyToken, warehousePortal.acceptSell); // Accept specific order

app.post('/api/warehouse/confirmDel/:id', verifyToken, warehousePortal.confirmDelivery); // Confirm delivery of specific order


app.listen(8888);