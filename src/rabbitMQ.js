const amqp = require('amqplib/callback_api');

module.exports.send = (queue, msg)=>{
    amqp.connect("amqp://localhost", (err, conn) => {
        if (err)
            throw err;

        conn.createChannel((err, channel) => {
            if (err)
                throw err;

            channel.assertQueue(queue, {
                durable: true
            });

            channel.sendToQueue(queue, Buffer.from(msg));
            console.log(" [x] Sent %s", msg);
        })
    });
};

module.exports.receive = (queue, callback)=>{
    amqp.connect('amqp://localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function (error1, channel) {
            if (error1) {
                throw error1;
            }

            channel.assertQueue(queue, {
                durable: true
            });
            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
            channel.consume(queue, callback, {
                noAck: true
            });
        });
    });
};