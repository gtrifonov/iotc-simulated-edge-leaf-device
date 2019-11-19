/*
* IoT Hub Raspberry Pi NodeJS - Microsoft Sample Code - Copyright (c) 2017 - Licensed MIT
*/

'use strict';

const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const Protocol = require('azure-iot-device-mqtt').Mqtt;
const fs = require('fs');
// You can use .env file
require('dotenv').config();
const engine = require('./engine');

// Or you can pass args
var argv = require('yargs')
  .usage('Usage: $0 --scopeId <SCOPEID> --deviceId <DEVICEID> --key <SAS_KEY> --dpsEndpoint <DPS_ENDPOINT> --dpsVersion <DPS_VERSION> --hostName <EDGEHOST> --gatewayID <GATEWAY_ID>')
  .option('scopeId', {
    alias: 's',
    describe: 'Scope ID',
    type: 'string',
    demandOption: false
  }).option('deviceId', {
    alias: 'd',
    describe: 'deviceId',
    type: 'string',
    demandOption: false
  }).option('sasKey', {
    alias: 'k',
    describe: 'sasKey',
    type: 'string',
    demandOption: false
  }).option('dpsEndpoint', {
    alias: 'e',
    describe: 'dpsEndpoint',
    type: 'string',
    demandOption: false
  }).option('dpsVersion', {
    alias: 'v',
    describe: 'dpsVersion',
    type: 'string',
    demandOption: false
  }).option('hostName', {
    alias: 'h',
    describe: 'Edge Hostname',
    type: 'string',
    demandOption: false
  }).option('gatewayID', {
    alias: 'g',
    describe: 'Edge Gateway Device ID',
    type: 'string',
    demandOption: false
  }).argv;

const SCOPEID = argv.scopeId || process.env.SCOPEID;
const SASKEY = argv.sasKey || process.env.SASKEY ;
const DPS_ENDPOINT = argv.dpsEndpoint || process.env.DPS_ENDPOINT || 'global.azure-devices-provisioning.net';
const DPS_VERSION = argv.dpsVersion || process.env.DPS_VERSION || '2019-03-31';
const DEVICE_ID = argv.deviceId || process.env.DEVICE_ID;
const EDGEHOST = argv.hostName || process.env.EDGEHOST ;
const GATEWAY_ID =argv.gatewayID || process.env.GATEWAY_ID || 'edge-gateway-id';

console.log(`SCOPEID - ${SCOPEID}`);
console.log(`SASKEY - ${SASKEY}`);
console.log(`DPS_ENDPOINT - ${DPS_ENDPOINT}`);
console.log(`DPS_VERSION - ${DPS_VERSION}`);
console.log(`EDGEHOST - ${EDGEHOST}`);
console.log(`GATEWAY_ID - ${GATEWAY_ID}`);
console.log(`DEVICE_ID - ${DEVICE_ID}`);

if (!SCOPEID) {
  throw new Error("SCOPEID is undefined")
}

if (!SASKEY) {
  throw new Error("SASKEY is undefined")
}

if (!DEVICE_ID) {
  throw new Error("DEVICE_ID is undefined")
}

if (!GATEWAY_ID) {
  throw new Error("GATEWAY_ID is undefined")
}

if (!EDGEHOST) {
  throw new Error("EDGEHOST is undefined")
}

var context = {
  log: (input) => {
    console.log(input);
  },
  idScope: SCOPEID,
  actAsGateway: false,
  gatewayDeviceId: GATEWAY_ID,
  dpsEndpoint: DPS_ENDPOINT,
  dpsVersion: DPS_VERSION,
  getSecret: () => { return SASKEY; }
};

// Send device reported properties.
function sendDeviceProperties(twin, properties) {
  twin.properties.reported.update(properties, err =>
    console.log(
      `Sent device properties: ${JSON.stringify(properties)}; ` +
        (err ? `error: ${err.toString()}` : `status: success`)
    )
  );
}
async function main() {

  let connectionString;
  try {
    connectionString = await engine.getDeviceConnectionString(context, { deviceId: DEVICE_ID, gatewayId: GATEWAY_ID });
    console.log(`Connection string: ${connectionString}`);
    connectionString +=`;GatewayHostName=${EDGEHOST}`
    console.log(`Modified Connection string: ${connectionString}`);
  } catch (error) { 
    console.error(error);
    return;
  }

const  edge_ca_cert_path ='./azure-iot-test-only.root.ca.cert.pem';

// fromConnectionString must specify a transport constructor, coming from any transport package.
var client = Client.fromConnectionString(connectionString, Protocol);

var connectCallback = function (err) {
  if (err) {
    console.error('Could not connect: ' + err.message);
  } else {
    console.log('Client connected');
    client.on('message', function (msg) {
      console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
      // When using MQTT the following line is a no-op.
      client.complete(msg, printResultFor('completed'));
      // The AMQP and HTTP transports also have the notion of completing, rejecting or abandoning the message.
      // When completing a message, the service that sent the C2D message is notified that the message has been processed.
      // When rejecting a message, the service that sent the C2D message is notified that the message won't be processed by the device. the method to use is client.reject(msg, callback).
      // When abandoning the message, IoT Hub will immediately try to resend it. The method to use is client.abandon(msg, callback).
      // MQTT is simpler: it accepts the message by default, and doesn't support rejecting or abandoning a message.
    });

    // Create a message and send it to the IoT Hub every two seconds
    var sendInterval = setInterval(function () {
      var pressure = 100 + (Math.random() * 4); // range: [10, 14]
      var temperature = 20 + (Math.random() * 10); // range: [20, 30]
      var humidity = 60 + (Math.random() * 20); // range: [60, 80]
      var data = JSON.stringify({ deviceId: DEVICE_ID, pressure: pressure, temperature: temperature, humidity: humidity });
      var message = new Message(data);
      message.properties.add('temperatureAlert', (temperature > 28) ? 'true' : 'false');
      //console.log('Sending message: ' + message.getData());
      client.sendEvent(message, printResultIfErrorFor('send'));
    }, 2000);

    client.on('error', function (err) {
      console.error(err.message);
    });
    // Get device twin from Azure IoT Central.
    client.getTwin((err, twin) => {
      if (err) {
        console.log(`Error getting device twin: ${err.toString()}`);
      } else {
        // Send device properties once on device start up.
        var properties = {
          serialNumber: "123-ABC",
          manufacturer: "Contoso",
          model:"MXchip",
          swVersion: "1.0.0",
          osName:"MXchip",
          processorArchitecture:"Custom",
          processorManufacturer:"noName",
          totalStorage:1024,
          totalMemory: 1024,

        };
        sendDeviceProperties(twin, properties);
      }
    });

    // Handle countdown command
  function onCountdown(request, response) {
    console.log("Received call to countdown" + JSON.stringify(request));

    var countFrom =
      typeof request.payload === "number" &&
      request.payload < 100
        ? request.payload
        : 10;

    response.send(200, err => {
      if (err) {
        console.error("Unable to send method response: " + err.toString());
      } else {
        client.getTwin((err, twin) => {
          function doCountdown() {
            if (countFrom >= 0) {
              var patch = {
                countdown: countFrom
              };
              sendDeviceProperties(twin, patch);
              countFrom--;
              setTimeout(doCountdown, 2000);
            }
          }

          doCountdown();
        });
      }
    });
  }
    client.onDeviceMethod('countdown',onCountdown);

    client.on('disconnect', function () {
      clearInterval(sendInterval);
      client.removeAllListeners();
      client.open(connectCallback);
    });
  }
};

// Provide the Azure IoT device client via setOptions with the X509
// Edge root CA certificate that was used to setup the Edge runtime
var options = {
  ca : fs.readFileSync(edge_ca_cert_path, 'utf-8'),
};

client.setOptions(options, function(err) {
  if (err) {
    console.log('SetOptions Error: ' + err);
  } else {
    client.open(connectCallback);
  }
});

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}
function printResultIfErrorFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (err && res) console.log(op + ' status: ' + res.constructor.name);
  };
}
  
}
try {
  main();
} catch (ex) {
  console.error(ex);
}





