'use strict'
const fs = require('fs');
const request = require('sync-request');

let url_tel = 'https:\/\/test.bitrix24.com\/rest\/1\/n8vchmfspyrhq3y2\/telephony.externalcall.';
let url_crm = 'https:\/\/test.bitrix24.com\/rest\/1\/n8vchmfspyrhq3y2\/';
let token = 'n8vchmfspyrhq3y2';
let user = 1;
let iscrm = false;

function register(params) {
  let r = {
    USER_PHONE_INNER:'100',
    USER_ID:1,
    PHONE_NUMBER:params.number,
    TYPE:1,
    CRM_CREATE:1
  };
iscrm = false;
  return r;
}

function finish(params) {
  let r = {
    CALL_ID:params.callid,
    USER_ID:1,
    DURATION:params.time,
    STATUS_CODE:params.code,
  };
  console.log(r);
  iscrm = false;
  return r;
}

function show(params) {
  let r = {
    CALL_ID:params.callid,
    USER_ID:1
  };
  iscrm = false;
  return r;
}

function hide(params) {
  let r = {
    CALL_ID:params.callid,
    USER_ID:1,
  };
  iscrm = false;
  return r;
}

function attachrecord(params) {
  let r = {
    CALL_ID:params.callid,
    FILENAME:params.filename,
    FILE_CONTENT:''
  };

  let f = fs.readFileSync('/var/spool/asterisk/recording/'+params.filename);
  r.FILE_CONTENT = Buffer.from(f).toString('base64');
iscrm = false;
return r;
}

function getentity(params) {
  let r = {
    ID:params.entity_id,
  };
  iscrm = true;
//console.log(r);
return r;
}

function requestb24(method,params) {
  let data = '';

  switch (method) {
    case 'register': {data = register(params);break;}
    case 'hide': {data = show(params);break;}
    case 'finish': {data = finish(params);break;}
    case 'attachrecord': {data = attachrecord(params);break;}
    case 'crm.contact.get': {data = getentity(params);break;}
    case 'crm.lead.get': {data = getentity(params);break;}
    default : data = '';
  }

//console.log(data);
let url = url_tel;
if (iscrm) url = url_crm;
if (!data) console.log('Error post data');
else {
  //console.log(data);
  let res = request('POST',url+method+'.json',{
    json:data
  });
  //console.log(res);

  let ret = JSON.parse(res.getBody('UTF-8'));
  //console.log(ret);
  if (ret) return ret.result;
  else return false;
}
return false;
}

module.exports.requestb24 = requestb24

//let r = requestb24('register',{number:'84991111111'});
//console.log(r);
