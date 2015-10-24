var hat = require('hat').rack();
var schedule = require('node-schedule');

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(5004);

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var db;

MongoClient.connect('mongodb://localhost:27017/rikka', function(err, mon) {
  assert.equal(null, err);
  db = mon;
  db.collection('users').createIndex({"location": "2dsphere"});
  console.log("Database connection established.");
});


io.on('connection', function(socket) {
  db.collection('users').insertOne({"id": socket.id, "nickname": "Hero", "location": {"type": "Point", "coordinates": [51.2493, 22.5367]}, "health": 1});
  socket.on('registration', function (data) {
    db.collection('users').updateOne({"id": socket.id},{$set: {"nickname": data.nickname}}, function (err, results) { console.log("Registration complete"); });
  });
  socket.on('locupdate', function (data) {
    db.collection('users').updateOne({"id": socket.id},{$set: {"location.coordinates":[data.latitude, data.longitude]}}, function (err, results) { console.log("Registration complete"); });
  });
  socket.on('hit', function (data) {
  });
  socket.getDbObject = function () {
    return db.collection('users').find({"id": socket.id}).toArray()[0];
  };
  socket.findMobsNearby = function () {
    return db.runCommand({geoNear: monsters, near: socket.getDbObject().location});
  };
});
