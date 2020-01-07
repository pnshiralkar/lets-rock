// Requires
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const md5 = require('md5');
const validator = require('validator');
const rabbitMQ = require('./rabbitMQ');

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

function ifNotEmpty(str){
    if(str === '' || str == undefined)
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
                            user.location = req.body.location;
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
    res.json({status: "success", user: req.user})
}); // temporary

app.post('/api/farmer/sell', verifyToken, (req, res)=>{
    if(req.user.role !== 'farmer')
        return res.status(403).json({status: "Forbidden role"});

    let sell;
    try{
        sell = new Sell({
            crop_name: ifNotEmpty(req.body.cropname),
            weight: ifNotEmpty(req.body.weight),
            location: ifNotEmpty(req.body.location),
            status: "inQueue",
        })
    }catch (e) {
        return res.status(400).json({status: "Invalid data"});
    }
    if(sell.save() === undefined)
        return res.status(500);
    else
        console.log(req.user.username);
        User['farmer'].findOne({username: req.user.username}).then((resp)=>{
            console.log(resp);
            resp.sellHistory.push(sell._id);
            rabbitMQ.send('sell', '' + sell._id);
            resp.save().then(()=>{
                return res.status(200).json({status: 'success', sellId: sell._id});
            });
        });
});

app.get('/api/farmer/sell/:id', verifyToken, (req, res)=>{
    if(req.user.role !== 'farmer')
        return res.status(403).json({status: "Forbidden role"});
    User.farmer.findOne({username: req.user.username}).then(user=>{
        if(user.sellHistory.indexOf(req.params.id) === -1)
            return res.status(400).json({status: "Invalid sellId"});
        Sell.findOne({_id: req.params.id}).then(sell=>{
            if(!sell)
                return res.status(400).json({status: "Invalid sellId"});
            return res.status(200).json(sell);
        })
    })
});

app.listen(8888);