const program = require('commander');
const firebase = require('firebase');
const pkg = require('./package.json');

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
    console.log(snapshot.val());
    process.exit();
  });
}