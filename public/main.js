// Simple peer is build over WebRTC
const Peer = require('simple-peer');
// Use for socket connection
// Here we have used the CDN link of the sockets.io
// which is included in the html file
const socket = io();
// Getting the video element of the HTML page
const video = document.querySelector('video');
var client = {};

// Add these variables at the top of the file
let isLaughing = false;
let faceDetectionInterval;

// Add this function to load face-api.js models
async function loadFaceDetectionModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');
}

// Add this function to detect faces and trigger confetti
async function detectFaces() {
    if (!video) return;

    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

    const isAnyoneLaughing = detections.some(detection => detection.expressions.happy > 0.7);

    if (isAnyoneLaughing && !isLaughing) {
        isLaughing = true;
        showLaughMessage();
        triggerConfetti();
        setTimeout(() => {
            hideLaughMessage();
            isLaughing = false;
        }, 3000);
    }
}

function showLaughMessage() {
    const laughMessage = document.createElement('div');
    laughMessage.id = 'laughMessage';
    laughMessage.textContent = 'Hello Grumpy Clown!!!';
    laughMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0,0,0,0.7);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-size: 24px;
        z-index: 1000;
    `;
    document.body.appendChild(laughMessage);
}

function hideLaughMessage() {
    const laughMessage = document.getElementById('laughMessage');
    if (laughMessage) laughMessage.remove();
}

function triggerConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

// Modify the existing navigator.mediaDevices.getUserMedia() call
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(async stream => {
        // Sending the request to the server
        socket.emit('NewClient');
        // Stream of the client itself
        video.srcObject = stream;
        video.play();

        // Add these lines after setting up the video stream
        await loadFaceDetectionModels();
        faceDetectionInterval = setInterval(detectFaces, 1000);

        function constructor(type) {
            // Initalizing the Peer
            var peer = new Peer({
                // Checking if the client is initiator or not
                initiator: (type == 'init') ? true : false,
                stream: stream,
                trickle: false
            })
            // If we get the stream
            peer.on('stream', (stream) => {
                // Create the video element for the stream
                var video = document.createElement('video');
                video.id = 'peerVideo';
                // Setting the stream
                video.srcObject = stream;
                video.class = 'embed-responsive-item';
                document.querySelector('#peerDiv').appendChild(video);
                video.play();
            })
            // If connection closes
            peer.on('close', () => {
                // Removing the video element
                document.getElementById('peerVideo').remove();
                // Cleaning up
                peer.destroy();
                cleanup();
            })
            // Finally returning the Peer
            return peer
        }

        // If user is init
        function initPeer() {
            // Do we get a response
            client.gotRespond = false;
            // Getting the init peer
            var peer = constructor('init');
            // Peer signal
            // Send a request for connection
            peer.on('signal', (data) => {
                if (!client.gotRespond) {
                    socket.emit('Request', data);
                }
            })
            client.peer = peer;
        }

        // If user is not init
        function nonInitPeer(request) {
            // Getting the normal peer
            var peer = constructor('notInit');
            // Peer signal
            // Responding for connection request
            peer.on('signal', (data) => {
                socket.emit('Respond', data);
            })
            // Peer Signal to connect
            peer.signal(request);
            client.peer = peer;
        }

        // When got the respond
        function signalRespond(respond) {
            client.gotRespond = true;
            var peer = client.peer;
            // Peer Signal to connect
            peer.signal(respond);
        }

        // If more than 2 client's access the page
        socket.on('sessionActive', () => {
          // Just a simple message for the users
            document.write('Session Active. Please come back later.');
        })

        // Responds from the server
        socket.on('ServerRequest', nonInitPeer);
        socket.on('ServerRespond', signalRespond);
        socket.on('initiatorClient', initPeer);

    })
    // Something went wrong
    // This is another Future function, which runs if some error occurs
    .catch(err => document.write(err));

// Add this to the cleanup logic (e.g., in the peer.on('close') callback)
function cleanup() {
    // Existing cleanup code...

    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
    }
}

// Make sure to call cleanup() when appropriate, e.g., when the peer connection closes
