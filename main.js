var gju = require('geojson-utils');
var hat = require('hat').rack();
var express = require('express');
var app = express();
app.use(express.static('static'));
app.use(express.static('bower_components'));
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(5004);

var players = {};
var mobs = {};

function randomCoin() { return Math.random() >= 0.5; }

function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function createMob() {
  var mob = {};
  mob.id = hat();
  mob.type = (Math.random() >= 0.9 ? "dragon" : "fly");
  if (mob.type == "dragon") console.log("behold!");
  mob.loci = {type:"Point",coordinates:[51.2+0.1*Math.random(),22.4+0.3*Math.random()]};
  mob.speed = function() { return 0.0003+0.0003*Math.random(); }
  mob.update = function () {
    if (!(mob.focus && mob.focus in players)) {
      if (mob.focus) delete mob.focus;
      for (var i in shuffle(Object.keys(players))) {
        if (i in players && players[i].loci && gju.geometryWithinRadius(players[i].loci, mob.loci, 750)) mob.focus = i;
        break;
      }
    }
    if (mob.focus && mob.focus in players) {
      var locomp = players[mob.focus].loci.coordinates;
      mob.loci.coordinates[0] += (locomp[0] > mob.loci.coordinates[0] ? 1 : -1)*mob.speed();
      mob.loci.coordinates[1] += (locomp[1] > mob.loci.coordinates[1] ? 1 : -1)*mob.speed();
    } else {
      mob.loci.coordinates[0] += (randomCoin() ? 1 : -1)*mob.speed();
      mob.loci.coordinates[1] += (randomCoin() ? 1 : -1)*mob.speed();
    }
    for (var i in players) {
      var dist = gju.pointDistance(mob.loci, players[i].loci);
      if (dist < 1200) {
        io.sockets.emit("mobupdate", {id: mob.id, type: mob.type, latitude: mob.loci.coordinates[0], longitude: mob.loci.coordinates[1]});
        break;
      }
    }
    mob.updint = setTimeout(mob.update, 250+Math.random()*500)
  }
  mob.updint = setTimeout(mob.update, 250+Math.random()*500);
  mob.kill = function () {
    io.emit("mobkilled", {id:mob.id});
    clearTimeout(mob.updint);
    delete mobs[mob.id];
  }
  mobs[mob.id] = mob;
  return mob.id;
}

setInterval(function() {
  if (Object.keys(mobs).length < 5000) createMob();
},150);

io.on('connection', function(socket) {
  socket.on('disconnect', function() {
    console.log("quit");
    io.emit('logout', {user: socket.id});
    if (socket.id in players) delete players[socket.id];
  });
  socket.on('registration', function (data) {
    console.log("Registering "+socket.id+" as "+data.nickname);
    players[socket.id] = {kills:0, loci:{type:"Point",coordinates:[0,0]}, nickname: data.nickname};
    socket.emit("myname", socket.id);
    socket.on('locupdate', function (data) {
      console.log("Receiving data from "+players[socket.id].nickname);
      players[socket.id].loci.coordinates = [data.latitude, data.longitude];
      io.emit('userlocupdate', {user: socket.id, latitude: data.latitude, longitude: data.longitude, nickname: players[socket.id].nickname});
    });
    socket.on('hit', function (data) {
      console.log("Hit!"+JSON.stringify(data));
      for (var i in mobs) {
        if (gju.geometryWithinRadius(mobs[i].loci, players[socket.id].loci, 100)) {
          mobs[i].kill();
          players[socket.id].kills += 1;
        }
      }
      io.emit('hitdraw', {user: socket.id, kills: players[socket.id].kills});
    });
    socket.findMobsNearby = function () {
      var ret = {};
      return ret;
    };
  });
});
