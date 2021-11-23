'use strict'
const b24 = require('./bitrix.js')
const speech = require('./speech.js')
const fs = require('fs')
const speech_g = require('@google-cloud/speech')
const udpserver = require('@funtiwe/udpserver')
const getRTP = require('@funtiwe/utils').getRTP


const IP_RTPSERVER = '5.189.230.61';
const RECOGNIZE_TIME = 3000;
const INITPORT = 8111;
let curport = INITPORT;
const app_name = 'ivr';

class IVR {
  number = '84997032065';
  mode = 'repeat';
  steps = null;
  demo = true;
  greet = '';
  log = null;
  ch = null;
  ari=null;
  bitrix=null;
  patch='\/var/spool\/asterisk\/recording\/';
  appname = null;

  constructor(log,ch,ari,demo,mode,greet,bitrix,appname) {
    if (demo) this.demo = demo;
    if (mode) this.mode = mode;
    if (greet) this.greet = greet;
    if (log) this.log = log;
    if (ch) this.ch = ch;
    if (ari) this.ari = ari;
    if (bitrix) this.bitrix = bitrix;
    if (appname) this.appname = appname;


    if (bitrix) {
      let res = b24.requestb24('register',{number:this.number});
      if (!res) {
        log.log('Prepare: ','Error register');
        ch.hangup();
      }
      log.log('Prepare: Bitrix lead ID: '+res.ID);

      if (res.CRM_ENTITY_ID) {
        //ret = b24.requestb24('crm.'+strtolow(res.CRM_ENTITY_TYPE)+'.get',{number:number});
        let ret = b24.requestb24('crm.contact.get',{entity_id:res.CRM_ENTITY_ID});
        if (ret) {
          res.NAME = ret.NAME;
          res.SECOND_NAME = ret.SECOND_NAME;
        } else log.log('Prepare: Bitrix lead name: '+res.NAME+' '+res.SECOND_NAME);
      } else log.log('Prepare: Error get crm info');
    }

    if (this.demo) this.exampleIVR()
    else this.buildIVR();
  }

  buildIVR() {

  }

  async startIVR(mode) {
    if (mode=='stream') {
      let r = await this.makeIVR_stream('step1',this.greet);
    } else if (mode=='file') {
      let r = await this.makeIVR_file('step1',this.greet);
    } else console.log('Wronng mode');
  }

  exampleIVR() {
    // Preprepare
    this.steps = {
      step1: {
        text:'Здравствуйте уважаемый клиент!',
        next:'step2',
      },
      step2: {
        text:'Вы уже общались с нашим менеджером?',
        next:'step1',
        answers:{
          da : {
            text : 'да',
            next: 'step1'
          },
          net : {
            text : 'нет',
            next: 'step1'
          },
        },
      },
      step3: {
        text:'Перевожу звонок на менеджера',
        next: 'step6'
      },
      step4: {
        text:'Перевожу звонок в очередь отделп продаж',
        next: 'step5'
      },
      step5: {
        text:'Не общались, так и храни Аллах Вас от этого!',
        next: 'step6'
      },
      step6: {
        text:'До новых встреч',
      }
    };
  }

  delete() {

  }

  async changeMode() {
    if (this.mode=='repeat') this.mode = 'general';
    else this.mode = 'repeat';
    let uniq = new Date().getTime();
    try {
      let audio = speech.tts_f('Меняем режим на '+this.mode,uniq+'_cm.wav');
    } catch (e) {
      //log.log(e.message);
      throw new Error(e.message);
    };
    return audio;
  };

  async makeIVR_stream(key,text) {
    if (!key) return;

    let steps = this.steps;
    let log = this.log;
    let ch = this.ch;
    let ari = this.ari;
    let mode = this.mode;
    let appname = this.appname;
    let obj = null;

    while(steps[key].next) {
      await playback(key,this.text);
      let text = await record();
      if (mode == 'repeat') {
        steps[key].next = 'step1';
        steps[key].text = text;
      }
      key = steps[key].next;
    }

    function playback(key,text) {
      return new Promise(async (res,rej)=>{
      let uniq = new Date().getTime();
      obj = steps[key];
      obj.filename_tts = uniq +'_key_tts';
      let ret = prepare(obj,text)
      .then(async ()=>{
        log.log('Begin with text: '+obj.text);
        log.log(obj.filename_tts);
        let ret2 = makeTTS(obj,key);
        ret2.then(async ()=>{
          log.log('Maked TTS audio');
          play(ch,obj,key)
          .then(async (d)=>{
            res();
          }).catch((e)=>{
            log.log('Error play: '+e.message)
            ch.hangup();
            process.exit(1)
          })
        }).catch((e)=>{
          log.log('Error make TTS: '+e.message)
          ch.hangup();
          process.exit(1)
        })
      }).catch((e)=>{
        log.log('Error prepare: '+e.message)
        ch.hangup();
        process.exit(1)
      });
    })
    }

    function rec(obj,key) {
      return new Promise(async (res,rej)=>{
      record(ch,obj,key)
      .then((d)=>{
        log.log(d);
        res();
      })
      .catch((e)=>{
        console.log(e);
      });
    })
    }

    async function prepare(obj,text) {
      return new Promise(async (res,rej)=>{
        if (text) obj.text = text;
        if (obj.text) res();
        else rej();
      })
    }

    async  function makeTTS(obj,key) {
      //return 1;
      return new Promise(async (res,rej)=>{
        let audio = speech.tts_f(obj.text,obj.filename_tts)
        .then(()=>{
          if (audio) res(audio);
          else rej(new Error('Get empty audio file from TTS'));
        }).catch((e)=>{
          //throw new Error(e.message);
          rej(new Error(e.message));
        });
      });
    }

    async function  play(ch,obj,key) {
      //return 1;
      return new Promise(async (res,rej)=>{
        let playback = new ari.Playback();
        ch.play({media:'recording:'+obj.filename_tts},playback)
        .then(async ()=>{
          playback.on('PlaybackFinished',async ()=>{
            log.log('Finished play');
            res();
            // if (!obj.next) await ch.hangup();
            // else rec(ch,obj,key);
          });
          log.log('Started play');
        }).catch((e)=>{
          throw new Error(e.message);
        });
      })
    }

function asr_s(ari,appname,IP_RTPSERVER,port,ch) {
  return new Promise(async (res,rej)=>{
  let recognizeStream = null;
  let result = null;
  let client = new speech_g.SpeechClient();
  let result_h = null;
  let usrv = null;

  const encoding = 'LINEAR16';
  const sampleRateHertz = 16000;
  const languageCode = 'ru-RU';

  const request = {
    config: {
      encoding: encoding,
      sampleRateHertz: sampleRateHertz,
      languageCode: languageCode,
    },
    interimResults: true, // If you want interim results, set this to true
  };

  let t = null;

  recognizeStream = client
  .streamingRecognize(request)
  .on('error', console.error)
  .on('data', data => {
    result = data.results[0].alternatives[0].transcript;
    console.log('HUMAN: %O\n%O', result,result_h);
  })

  getRTP(ari,appname,IP_RTPSERVER,port,ch)
  .then((d)=>{
    t = setTimeout(()=>{
      console.log('timer');
      //usrv.stop();
      //recognizeStream.end();
      res(result);
    },3000);
    result_h = result;
    usrv = new udpserver.RtpUdpServerSocket(IP_RTPSERVER + ':' + port,recognizeStream);
  })
  .catch((e)=>{
    log.log('Error');
  })

  let f_talkfinish = false;
  let f_talkstart = false;

  ch.on('ChannelTalkingStarted',(ev,ch)=>{
    if (f_talkstart) return;
    f_talkstart = true;
    log.log(key,'Start talk - ChannelTalkingStarted');
  });
  })
}
    function   record(obj,key) {
      return new Promise((res,rej)=>{
        console.log('Started record');
        asr_s(ari,appname,IP_RTPSERVER,curport++,ch)
        .then((d)=>{
          res(d);
        });
      }).catch((e)=>{
        console.log(e);
        rej(e);
      });
    }
  }
  }

module.exports.IVR = IVR

// let uniq = new Date().getTime();
// let log = new Log(uniq+'.log');
// let r = new IVR(log);
