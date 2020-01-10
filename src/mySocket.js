var io = require('socket.io');

module.exports.init = (s)=>{
    io = io.listen(s);

    io.on('connection', (sock)=>{
        console.log("conn");
        sock.on('login', (room)=>{
            sock.join(room);
            console.log("joined room");
        });
    });
};

module.exports.send = (to, name, val)=>{
    io.to(to).emit(name, val);
};

module.exports.sendAll = (name, val)=>{
    io.emit(name, val);
};

// module.exports.signup = (name, val)=>{
//     sock.join(sock.handshake.query.uid);
// };