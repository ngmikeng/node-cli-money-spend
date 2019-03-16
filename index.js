#!/usr/bin/env node
const program = require('commander');
const firebase = require('firebase');
const inquirer = require('inquirer');
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
  findInRangeValue: function(dbKey, propKey, min, max) {
    propKey = propKey ? propKey : 'value';
    var ref = this.firebase.database().ref(dbKey);
    var query = ref.orderByChild(propKey).startAt(min, propKey).endAt(max, propKey);

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
            .column(record.description || 'N/A', 20)
            .column(record.value + "" || 'N/A', 20)
            .fill()
            .output();
        }
      }
    }
  }
}

function _writeData(data) {
  const spin = new Spinner('Writing data...');
  spin.start();
  firebaseService.writeData('logs', data).then(value => {
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

function _isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}


const firebaseService = new FirebaseService(firebase, firebaseConfig);

program
  .version(pkg.version)
  .option('-x, --create', 'Create a record')
  .option('-d, --description [value]', 'Add description')
  .option('-v, --value [value]', 'Add value')
  .option('-i, --input', 'Create a record by answer')

program
  .command('search')
  .description('Find records data from x value to y value')
  .action(function(prop, options){
    const questions = [
    {
      type: 'list',
      name: 'searchBy',
      message: "Search by",
      choices: ['value', 'timestamp'],
      default: 'value'
    },
    {
      type: 'input',
      name: 'startValue',
      message: "Start value"
    },
    {
      type: 'input',
      name: 'endValue',
      message: "End value"
    }
  ];

  inquirer.prompt(questions).then(answers => {
    const prop = answers.searchBy;
    let startValue = parseFloat(answers.startValue);
    let endValue = parseFloat(answers.endValue);
    if (prop === 'timestamp') {
      startValue = new Date(answers.startValue).getTime();
      endValue = new Date(answers.endValue).getTime();
    }
    if (_isNumber(startValue) && _isNumber(endValue)) {
      const spin = new Spinner('Fetching data...');
      spin.start();
      const query = firebaseService.findInRangeValue('logs', prop, startValue, endValue);
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
    } else {
      console.log('Invalid Input');
      process.exit();
    }
  });

    
  });

program.on('--help', function(){
  console.log('')
  console.log('Examples:');
  console.log(' # Create a record with description and value');
  console.log('   $ node index.js -x -d "cafe with friends" -v 10000');
});

program.parse(process.argv);

if (program.create && program.description && program.value) {
  _writeData({
    timestamp: Date.now(),
    description: program.description,
    value: program.value * 1
  });
}

if (program.input) {
  const questions = [
    {
      type: 'input',
      name: 'description',
      message: "Spend this money for what?"
    },
    {
      type: 'input',
      name: 'value',
      message: "How much?"
    }
  ];

  inquirer.prompt(questions).then(answers => {
    const data = {
      timestamp: Date.now(),
      description: answers.description,
      value: answers.value * 1
    };
    _writeData(data);
  });
}