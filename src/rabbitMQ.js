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
