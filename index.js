const program = require('commander');
const firebase = require('firebase');
const pkg = require('./package.json');
const firebaseConfig = {
  apiKey: "AIzaSyDhUPAv4jiCtix2kJ0BDi8SEwPnyFS3aFU",
  authDomain: "node-cli-money-spend.firebaseapp.com",
  databaseURL: "https://node-cli-money-spend.firebaseio.com",
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
// firebaseService.writeData('logs', { timestamp: Date.now(), value: Math.random() }).then(value => {
//   console.log('save success');
//   return firebaseService.findInRangeValue('logs', 0.1, 0.3);
// })
// .then(query => {
//   query.once("value", function(snapshot) {
//     console.log(snapshot.val());
//   });
//   // process.exit();
// })
// .catch(err => {
//   console.log('error:', err);
//   process.exit();
// });

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