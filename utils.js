'use strict'
const fs = require('fs');

function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

function getDate(date,mode=false) {
  let y = date.getFullYear();
  let m = date.getMonth();
  let d = date.getDate();
  let h = date.getHours();
  let mm = date.getMinutes();
  let s = date.getSeconds();

  if (mode)
    return y+'.'+m+'.'+d+' '+h+':'+mm+':'+s;
  else {
    return h+':'+mm+':'+s;
  }
}

class Log {
  filename = 'all.log';
  file = null;

  constructor (filename){
    this.filename = filename;
    this.file = fs.createWriteStream(this.filename,{flags:'a'});
    console.log('Log file: '+filename);

    return this;
  };

  log(key,params) {
    console.log(key+' : '+params);
    this.file.write(key+' : '+params+'\n');
  };
};

module.exports.sleep = sleep
module.exports.Log = Log
