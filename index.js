const program = require('commander');
const firebase = require('firebase');
const pkg = require('./package.json');
const clc = require('cli-color');
const clui = require('clui');
const Line = clui.Line;

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
  findInRangeValue: function(key, min, max) {
    var ref = this.firebase.database().ref(key);
    var query = ref.orderByChild("value").startAt(min, 'value').endAt(max, 'value');

    return query;
  }
};

function _printLogTable(objData) {
  if (typeof objData === 'object' && objData !== null) {
    const headers = new Line()
      .padding(2)
      .column('Timestamp', 30, [clc.cyan])
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
  .parse(process.argv);

if (program.create && program.description && program.value) {
  firebaseService.writeData('logs', {
    timestamp: Date.now(),
    description: program.description,
    value: program.value * 1
  }).then(value => {
    console.log('saved');
    process.exit();
  })
  .catch(err => {
    console.log('error:', err);
    process.exit();
  });
}
if (program.findInRange && program.min && program.max) {
  var query = firebaseService.findInRangeValue('logs', parseFloat(program.min), parseFloat(program.max));
  query.once("value", function (snapshot) {
    const result = snapshot.val();
    console.log(result);
    _printLogTable(result);
    process.exit();
  });
}
