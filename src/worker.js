const rabbitMQ = require('./rabbitMQ');
const geoJson = require('geojson-tools');
const mongoose = require('mongoose');

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
    async function f() {
        await User.warehouse.find({spaceAvailable: {$gt: sell.weight}}, (err, warehouses) => {
            // console.log(sell.location, warehouses.location, warehouses)
            for (let i in warehouses) {
                wares.push({
                    val: (demand * 0.6 + geoJson.getDistance([sell.location, warehouses[i].location], 3) * 0.4),
                    wareId: warehouses[i]._id
                });
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