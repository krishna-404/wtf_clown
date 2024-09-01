const path = require('path');
const express = require('express');
const app = express();

const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/views"));
app.set('view engine', 'pug');
var clients = 0;

io.on('connection', function (socket) {
    socket.on("NewClient", function () {
        // Communication between only 2 clients
        if (clients < 2) {
            if (clients == 1) {
                // If the first client make it the
                // initator of the peer
                this.emit('initiatorClient');
            }
        }
        else
            this.emit('sessionActive');
        clients++;
        console.log("Client Added");
    })
    // Sending the request to other clients
    socket.on('Request', (data) => {
        socket.broadcast.emit("ServerRequest", data);
    })
    // Sending the respond to other clients
    socket.on('Respond', (data) => {
        socket.broadcast.emit("ServerRespond", data);
    })
    // If connection closes
    socket.on('disconnect', Disconnect);
})

function Disconnect() {
    if (clients > 0) {
        if (clients <= 2)
            this.broadcast.emit("Disconnect");
        clients--;
    }
}

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname+'/public/login.html'));
});

app.get('/video', function (req, res) {
  res.sendFile(path.join(__dirname+'/public/video.html'));
});

http.listen(port, () => console.log('Running on port '));
