#!/usr/bin/env node
'use strict'

const https = require('https')
const fs = require('fs')
const express = require('express')
const bodyParser = require('body-parser')
const makecall = require('./index.js').makecall

const app = express();
app.use(express.static('static'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

app.get('/',(req,res)=>res.send('ok'));

app.post('/ajax',(req,res)=>{
  console.log(req.body.number);
  makecall(req.body.number);
  res.send('get');
});

app.post('/',(req,res)=>{
  let ret = fs.readFileSync('form.html');
  res.send(ret+'');
});
//app.listen(7001);
https.createServer(options,app).listen(7000);
