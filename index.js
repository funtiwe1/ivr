#!/usr/bin/env node
'use strict';

const client = require('ari-client');
const fs = require('fs');
const sleep = require('@funtiwe/utils').sleep
const Log = require('@funtiwe/utils').Log
const IVR = require('./ivr.js').IVR

const APPNAME = 'ivr';
const IP_RTPSERVER = '5.189.230.61';
const IP_ASTERSERVER = '5.189.230.61';
const PORT_ASTERSERVER = '8088';
const ARI_USERNAME = 'amd';
const ARI_PASS = '57d5cf235bc84181cb101335ce689eba';
//const IP_ASTERSERVER = 'pbx.informunity.ru';

function makecall(number) {
  console.log(number);
  client.connect('http:\/\/' + IP_ASTERSERVER +':'+ PORT_ASTERSERVER  ,ARI_USERNAME , ARI_PASS,function (err, ari) {
    //client.connect('http:\/\/' + IP_ASTERSERVER + ':8088', 'amd', '57d5cf235bc84181cb101335ce689eba',function (err, ari) {
    let log = new Log(APPNAME+'.log');
    if (err) {
      log.log('Error connect asterisk ari')
      log.log(err.message);
      return;
    }

    let outgoing = ari.Channel();
    log.log('Connected to asterisk');
    ari.start(APPNAME);
    log.log('Started '+APPNAME+' app');

    let s_mode = process.argv[2];
    if (!s_mode) s_mode = 'stream';
    else s_mode = 'file';
    log.log(s_mode);

    let mode = process.argv[3];
    if (!mode) mode = 'repeat';
    else mode = 'file';
    log.log(mode);

    outgoing.originate({
        endpoint:'SIP/inbound_sipp/'+number,
        app:APPNAME,
        appArgs:''
      }).then(function(channel){
        log.log('Created outgoing channel: '+ channel.id);
        //let date_start = getDate(new Date(),true);
        //logstr = '\n' + date_start + ':' + number;
        //log.log('');
      }).catch((e)=> {
        console.log(e);
      });

    outgoing.once('StasisStart', async function (event, ch) {
      let uniq = new Date().getTime();
      log.log('StasisStart:'+ch.id);

      let bitrix = false;
      let ivr = new IVR(log,ch,ari,'true',mode,'',bitrix,APPNAME);
      //log.log(ivr);
      ivr.startIVR(s_mode);

      ch.once('StasisEnd', function (event, chan) {
        log.log('StasisEnd:'+ch.id);
      });

      ch.once('ChannelHangupRequest', (e,ch)=>{
        log.log('ChannelHangupRequest:'+ch.id);
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
  .catch((e)=>{
    console.log('Error','Error asterisk ari')
  });

  process.on('SIGINT',()=>{
    console.log('Terminated');
    process.exit();
  });
}

module.exports.makecall = makecall;
