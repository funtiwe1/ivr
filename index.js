#!/usr/bin/env node
'use strict';

const client = require('ari-client');
const fs = require('fs');
const sleep = require('@funtiwe/utils').sleep
const Log = require('@funtiwe/utils').Log
//const IVR = require('./ivr.js').IVR
const IVR = require('./ivr.js').IVR


const IP_RTPSERVER = '5.189.230.61';
const IP_ASTERSERVER = '5.189.230.61';
//const IP_ASTERSERVER = 'pbx.informunity.ru';

client.connect('http:\/\/' + IP_ASTERSERVER + ':8088', 'amd', '57d5cf235bc84181cb101335ce689eba',function (err, ari) {
  //client.connect('http:\/\/' + IP_ASTERSERVER + ':8088', 'amd', '57d5cf235bc84181cb101335ce689eba',function (err, ari) {

  console.log('Connected to asterisk');
  ari.start('ivr');
  console.log('Started ivr app');

  let mode = process.argv[2];
  if (!mode) mode = 'stream';
  else mode = 'file';
  console.log(mode);

  ari.once('StasisStart', async function (event, ch) {
    let uniq = new Date().getTime();
    let log = new Log(uniq+'.log');
    log.log('StasisStart',ch.id);

    let ivr = new IVR(log,ch,ari);
    ivr.startIVR(mode);

    ch.once('StasisEnd', function (event, chan) {
      log.log('StasisEnd',ch.id);
    });

    ch.once('ChannelHangupRequest', (e,ch)=>{
      log.log('ChannelHangupRequest',ch.id);
      ivr.delete();
    });

    ch.on('ChannelDtmfReceived', async (ev,ch)=>{
      log.log('Get ChannelDtmfReceived: '+ev.digit);
      switch (ev.digit) {
        case '*': {
          try {
            let filename = await ivr.changeMode();
          } catch {
            log.log(e.message);
          }
          let playback = new ari.Playback();
          await ch.play({media:'recording:'+filename},playback)
          .then(async ()=>{
            log.log('CM','Started play change mode');
          })
          .catch((e)=>{
            log.log('CM','Error play change mode');
          });
          break;
        }
        case '#': {ivr.buildIVR();break;}
        default:;
      }
    });
  })
})
.catch((e)=>{log.log('Error','Error asterisk ari')});

process.on('SIGINT',()=>{
  console.log('Terminated');
  process.exit();
});
