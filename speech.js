'use strict'


const speech = require('@google-cloud/speech');
const speechtts = require('@google-cloud/text-to-speech');
const util = require('util');
const fs = require('fs');
let getDate = require('@funtiwe/utils').getDate

//const grpc = require('grpc');
//const protoLoader = require('@grpc/proto-loader');

const CHUNK_SIZE = 4000;
const TIME_CHECK = 2000;
const NUMLINES = 2;
const RECOGNIZE_TIME = 10000;

// // Получаем ID каталога и IAM-токен из переменных окружения.
const folderId = process.env.FOLDER_ID;
const iamToken = process.env.IAM_TOKEN;
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./asramd-1614946989346-92764bd4cea8.json";

const IP_RTPSERVER = '5.189.230.61';
const IP_ASTERSERVER = '5.189.230.61';

const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'ru-RU';

// yandex request
const request_y = {
  config: {
    specification: {
      languageCode: languageCode,
      profanityFilter: false,
      model: 'general',
      partialResults: true,
      audioEncoding: encoding,
      sampleRateHertz: sampleRateHertz
    },
    folderId: folderId
  }
};

// google request
const request_g = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
  },
  interimResults: true, // If you want interim results, set this to true
};

// function asr() {
//   const client = new speech.SpeechClient();
//   let famd = null;
//   let result_h = '';
//   let logstr = '';
//
//   return client.streamingRecognize(request_g).on('error', ()=>{console.log('Error connect to google asr services')});
// }
//
// class Speech {
//   async tts_f(text,filename) {
//     const client = new speechtts.TextToSpeechClient();
//     const request = {
//       input: {text: text},
//       voice: {languageCode: 'ru-RU', ssmlGender: 'NEUTRAL'},
//       audioConfig: {audioEncoding: 'MP3'},
//     };
//     const [response] = await client.synthesizeSpeech(request);
//     let buff = new Buffer.from(response.audioContent, 'base64');
//     const writeFile = util.promisify(fs.writeFile);
//     await writeFile('\/var/spool\/asterisk\/recording\/'+filename+'.mp3', buff, 'binary');
//     console.log('Audio content written to file: '+filename+'.mp3');
//
//     return filename;
//   };
//
//   asr_f() {
//     return '1111';
//   };
// }

async function asr_f(filename,obj) {
  return new Promise(async (res,rej)=>{
  let req = {};
  let client = null;
  try {
    client = new speech.SpeechClient();
  } catch(e) {
    rej('Error init ASR client: '+e.message);
    return;
  }
  Object.assign(req,request_g);

  if (!fs.existsSync(filename)) {
    rej('Not file for asr_f'+filename);
    return;
  }
  req.audio = {content:fs.readFileSync(filename).toString('base64'),} ;
  req.config.sampleRateHertz = 8000;
  req.encoding = 'MULAW';

  try{
    const [response] = await client.recognize(req);
    const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join(' ');
    obj.text_next = transcription;
    //console.log('Transcription: ', transcription);
    res(transcription);
    return;
  } catch(e) {
    rej('Error get asr_f text from file'+filename+': '+e.message);
    return;
  }
})
};

async  function tts_f(text,filename) {
  return new Promise(async (res,rej)=>{
  let client = null;
  try {
    client = new speechtts.TextToSpeechClient();
  } catch(e) {
    rej(new Error('Error init TTS client: '+e.message));
    return;
  }

  if (!text) rej(new Error('No text for tts_f'))//throw new Error('No text for tts_f')
  if (!filename) rej(new Error('No filename for tts_f'))
  const request = {
    input: {text: text},
    voice: {languageCode: 'ru-RU', ssmlGender: 'NEUTRAL'},
    audioConfig: {audioEncoding: 'MP3'},
  };
  let response = null;
  try {
    [response] = await client.synthesizeSpeech(request);
  } catch(e) {
    rej(new Error('Error send TTS request to google: '+e.message));
    return;
  }

  let buff = new Buffer.from(response.audioContent, 'base64');
  const writeFile = util.promisify(fs.writeFile);

  try {
    await writeFile('\/var/spool\/asterisk\/recording\/'+filename+'.mp3', buff, 'binary');
  } catch(e) {
    rej(new Error('Error write tts_f to file '+filename+': '+e.message));
    return;
  }
  //console.log('Audio content written to file: '+filename+'.mp3');
//Promise.resolve(filename);
  res(filename);
})
};


// const FREQUENCY = 250;
// const serviceMetadata = new grpc.Metadata();
// serviceMetadata.add('authorization', `Bearer ${iamToken}`);
// const packageDefinition = protoLoader.loadSync('../../yandex/cloud/ai/stt/v2/stt_service.proto', {
//     includeDirs: ['node_modules/google-proto-files', '..']
// });
// const packageObject = grpc.loadPackageDefinition(packageDefinition);
//
// // Установить соединение с сервером.
// const serviceConstructor = packageObject.yandex.cloud.ai.stt.v2.SttService;
// const grpcCredentials = grpc.credentials.createSsl(fs.readFileSync('./roots.pem'));
// const service = new serviceConstructor('stt.api.cloud.yandex.net:443', grpcCredentials);
// const call = service['StreamingRecognize'](serviceMetadata);
//
// // Отправить сообщение с настройками распознавания.
// call.write(request_y);
//
// const interval = setInterval(() => {
//   if (i * CHUNK_SIZE <= audio.length) {
//     const chunk = new Uint16Array(audio.slice((i - 1) * CHUNK_SIZE, i * CHUNK_SIZE));
//     const chunkBuffer = Buffer.from(chunk);
//     call.write({audioContent: chunkBuffer});
//     i++;
// } else {
//     call.end();
//     clearInterval(interval);
// }}, FREQUENCY);
//
// call.on('data', (response) => {
//     console.log('Start chunk: ');
// response.chunks[0].alternatives.forEach((alternative) => {
//     console.log('alternative: ', alternative.text)
// })
// ;
// console.log('Is final: ', Boolean(response.chunks[0].final));
// console.log('');
// })
// ;
//
// call.on('error', (response) => {
//     // Обрабатываем ошибки
//     console.log(response);
// })

// function asr_s(input,obj) {
//   let req = {};
//   Object.assign(req,request_g);
//   req.config.sampleRateHertz = 8000;
//   req.encoding = 'MULAW';
//
//   const client = new speech.SpeechClient();
//   let recognizeStream = client
//   .streamingRecognize(req)
//   .on('error', console.error)
//   .on('data', data => {
//     //let date = getDate(new Date());
//
//     let result = data.results[0].alternatives[0].transcript;
//     //console.log('ASR: '+result);
//     obj.asr = result;
//     console.log(obj.asr);
//     Promise.resolve(result);
//   })
//
// let s = fs.createReadStream('\/var/spool\/asterisk\/recording\/'+input);
// s.on('data',(d)=>{
//   console.log(d);
// });
//
// // setTimeout(()=>{
// //   recognizeStream.end();
// //   s = null;
// // },7000);
// s.pipe(recognizeStream);
// }
//
// // amdbase.forEach(function(item,index,array){
// //   if (result.indexOf(item)!=-1) {
// //     console.log('%s\n%s',result.indexOf(item),item);
// //     famd = true;
// //   }
// // })
//
//
// // Import other required libraries
// // Creates a client
// //function
// async function tts_s(text,filename) {
//   const client = new speechtts.TextToSpeechClient();
//   const request = {
//     input: {text: text},
//     voice: {languageCode: 'ru-RU', ssmlGender: 'NEUTRAL'},
//     audioConfig: {audioEncoding: 'MP3'},
//   };
//   const [response] = await client.synthesizeSpeech(request);
//   let buff = new Buffer.from(response.audioContent, 'base64');
//   const writeFile = util.promisify(fs.writeFile);
//   await writeFile('\/var/spool\/asterisk\/recording\/'+filename+'.mp3', buff, 'binary');
//   console.log('Audio content written to file: '+filename+'.mp3');
//
//   return filename;
// }

//module.exports.asr_s = asr_s;
//module.exports.tts_s = tts_s;
module.exports.asr_f = asr_f;
module.exports.tts_f = tts_f;
//module.exports.Speech = Speech;

//tts('Привет Иван Иванович');

//asr_s('1634159627967_key_asr.wav');
//asr_f({});
