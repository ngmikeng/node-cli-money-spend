#!/usr/bin/env node
const program = require('commander');
const firebase = require('firebase');
const pkg = require('./package.json');
const clc = require('cli-color');
const clui = require('clui');
const Line = clui.Line;
const Spinner = clui.Spinner;

require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

function FirebaseService(firebase, config) {
  this.config = config;
  this.firebase = firebase;
  if (firebase && config) {
    firebase.initializeApp(config);  
  }
}

FirebaseService.prototype = {
  writeData: function(key, data) {
    var newDataKey = this.firebase.database().ref().child(key).push().key;
    var updates = {};
    updates[`/${key}/${newDataKey}`] = data;

    return this.firebase.database().ref().update(updates);
  },
  findInRangeValue: function(dbKey, min, max) {
    var ref = this.firebase.database().ref(dbKey);
    var query = ref.orderByChild("value").startAt(min, 'value').endAt(max, 'value');

    return query;
  }
};

function _printLogTable(objData) {
  if (typeof objData === 'object' && objData !== null) {
    const headers = new Line()
      .padding(2)
      .column('Created at', 30, [clc.cyan])
      .column('Description', 20, [clc.cyan])
      .column('Value', 20, [clc.cyan])
      .fill()
      .output();
    
    for (const key in objData) {
      if (objData.hasOwnProperty(key)) {
        const record = objData[key];
        if (typeof record === 'object' && record !== null) {
          const line = new Line()
            .padding(2)
            .column(new Date(record.timestamp).toLocaleString(), 30)
            .column(record.description, 20)
            .column(record.value + "", 20)
            .fill()
            .output();
        }
      }
    }
  }
}


const firebaseService = new FirebaseService(firebase, firebaseConfig);

program
  .version(pkg.version)
  .option('-x, --create', 'Create a record')
  .option('-d, --description [value]', 'Add description')
  .option('-v, --value [value]', 'Add value')
  .option('-f, --findInRange', 'Find data in range value')
  .option('-s, --min [value]', 'Min value')
  .option('-e, --max [value]', 'Max value')

program.on('--help', function(){
  console.log('')
  console.log('Examples:');
  console.log(' # Create a record with description and value');
  console.log(' $ node index.js -x -d "cafe with friends" -v 10000');
  console.log(' # Query records with value from 1000 to 100000');
  console.log(' $ node index.js -f -s 1000 -e 100000');
});

program.parse(process.argv);

if (program.create && program.description && program.value) {
  const spin = new Spinner('Writing data...');
  spin.start();
  firebaseService.writeData('logs', {
    timestamp: Date.now(),
    description: program.description,
    value: program.value * 1
  }).then(value => {
    spin.stop();
    console.log('saved');
    process.exit();
  })
  .catch(err => {
    spin.stop();
    console.log('error:', err);
    process.exit();
  });
}
if (program.findInRange && program.min && program.max) {
  const spin = new Spinner('Fetching data...');
  spin.start();
  const query = firebaseService.findInRangeValue('logs', parseFloat(program.min), parseFloat(program.max));
  query.once("value", function (snapshot) {
    spin.stop();
    const result = snapshot.val();
    _printLogTable(result);
    process.exit();
  }, function(err) {
    spin.stop();
    if (err && err.message) {
      console.log(err.message);
    } 
  });
}
