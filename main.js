var gju = require('geojson-utils');
var hat = require('hat').rack();
var schedule = require('node-schedule');
var express = require('express');
var app = express();
app.use(express.static('static'));
app.use(express.static('bower_components'));
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(80);

var players = {};
var mobs = {};

io.on('connection', function(socket) {
  socket.on('registration', function (data) {
    console.log("Registering "+socket.id+" as "+data.nickname);
    players[socket.id] = {loci:{type:"Point",coordinates:[0,0]}, nickname: data.nickname};
    socket.emit("myname", socket.id);
  });
  socket.on('disconnection', function() {
    io.emit('logout', {user: socket.id});
    delete players[socket.id].nickname;
  });
  socket.on('locupdate', function (data) {
    console.log("Receiving data from "+players[socket.id].nickname);
    players[socket.id].loci.coordinates = [data.latitude, data.longitude];
    io.emit('userlocupdate', {user: socket.id, latitude: data.latitude, longitude: data.longitude, nickname: players[socket.id].nickname});
  });
  socket.on('hit', function (data) {
    console.log("Hit!"+JSON.stringify(data));
    io.emit('hitdraw', {user: socket.id});
  });
  socket.findMobsNearby = function () {
    var ret = {};
    for (var i in mobs) if (gju.geometryWithinRadius(mobs[i], players[socket.id].loci, 50)) ret[i] = mobs[i];
    return ret;
  };
});
