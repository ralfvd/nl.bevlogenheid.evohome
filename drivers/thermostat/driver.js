var Evohomey = require('../../lib/evohomey');
var Util = require('../../lib/util.js')
var jsonPath = require('jsonpath-plus');
var devices = {};

var sessionID = ("empty");
var userID = ("empty");
var locationID = ("empty");
var allinformation = [];

var debugSetting = true;
var debugLog = [];

function evohomeDebugLog(message, data) {
  if (!debugSetting) {
        return;
  }
  if (!debugLog) {
        debugLog = [];
  }
  if (!data) {
      data = null;
  }
  Homey.manager('api').realtime('evohomeLog', {datetime: new Date(), message: message, data: data});
  debugLog.push({datetime: new Date(), message: message, data: data});
  if (debugLog.length > 100) debugLog.splice(0, 1);
  if (data == null) {
    Homey.log(Util.epochToTimeFormatter(), message);
  } else {
    Homey.log(Util.epochToTimeFormatter(), message, data);
  };
  Homey.manager('settings').set('evohomeLog', debugLog);
} // function evohomeDebugLog

var self = module.exports = {

  init : function (devices_data, callback) {
  // when the driver starts, Homey rebooted. Initialize all previously paired devices.
      Homey.log(devices_data)
      devices_data.forEach(function(device_data){
          Homey.log(device_data)
          //Homey.log('initializing:' + device_data.id + ': ' + device_data.name)
          devices[ device_data.id ] = {
                data    : device_data,
                state   : {
                  measure_temperature: false,
                  target_temperature: false
                }

            }

          //Homey.log(devices[ device_data.id ])
          //self.getState( device_data )
      })
      var settings = Homey.manager('settings').get('evohomeaccount')
        if (settings) {
          var evohomesystem = new Evohomey({
            user: settings.user,
            password: settings.password,
            appid: settings.appid
          })
        }
      // initial update after start
      Homey.log(devices_data.length)
      if ( devices_data.length != 0 ) {
        if (settings) {
          var tijdstip = new Date()
          Homey.log ("initial update: " + tijdstip)
          self.updateState(evohomesystem,devices_data,'true',callback)
        }

        //evohomesystem.updateState(devices, devices_data,function(callback){
        //devices.push
        //})
      }
      evohomeDebugLog('Evohome app started')

      Homey.manager('flow').on('action.reset_temperature', function( callback, args, state ) {
              Homey.log('action reset temperature')
              Homey.logs (args, state)
              if ( args.current_state == state.state ) {
                  callback( null, true );
              } else {
                  callback( null, false );
              }
          });


      // start interval
      setInterval(function(){
        var tijdstip = new Date()
        Homey.log('[Evohome] Recurring Interval devices: ' + tijdstip)

            if ( devices_data.length != 0 ) {
            Homey.log(devices_data.length)
            if (settings) {
              //Homey.log(devices)
              self.updateState(evohomesystem,devices_data,'false',callback)
            //devices_data.forEach(function(device_data){
            //  Homey.log('Updating: ' + device_data.id)

            //})
          // getState(devices_data)
            }
          }
        }, 1000 * 60 * 1)


      callback()

  },


  getState: function ( device_data, callback) {
    Homey.log('getState')
    value = 5
    devices[ device_data.id ].state.measure_temperature = value;
    self.realtime( device_data, 'measure_temperature', value );
  },

  updateState: function ( evohomesystem, devices_data, initial_run,callback) {
    //Homey.log ('initial run: ' + initial_run)
    var rawdata =[]

    evohomesystem.getAllInformation(function(rawdata) {
      var rawdevices = rawdata[0]["devices"]
    rawdevices.forEach(function(entry){
        //Homey.log(entry["deviceID"] + ' checken...')
        devices_data.forEach(function(device_data) {
          // !! BUG: als je device toevoegt terwijl app al draait, dan wordt deze nog niet meegenomen. Pas na herstarten weer
          //Homey.log (entry["deviceID"] + ' vergelijken met ' + device_data.id)
          if (device_data.id == entry["deviceID"]) {
            Homey.log ('Gevonden: ' + device_data.name)
            // voer updates uit
            // check of temperatuur veranderd is
            var temp_old = device_data.temp
            var temp_new = Number(entry["thermostat"]["indoorTemperature"].toFixed(2))
            devices[ device_data.id ].state.measure_temperature = temp_new
            Homey.log ('target temperature: ' + Number(entry["thermostat"]["changeableValues"]["heatSetpoint"]["value"].toFixed(2)))
            Homey.log (devices[ device_data.id ].state.target_temperature)
            devices[ device_data.id ].state.target_temperature = Number(entry["thermostat"]["changeableValues"]["heatSetpoint"]["value"].toFixed(2))
            Homey.log (devices[ device_data.id ].state.target_temperature)
            Homey.log ('einde target temperature')
            if ( temp_old != temp_new) {
              Homey.log ('temperatuur verschil gevonden')
              //Homey.log (devices)
              //Homey.log (device_data)
              Homey.log(temp_old)
              Homey.log(temp_new)
              devices[ device_data.id ].data.temp = temp_new
              devices[ device_data.id ].state.measure_temperature = temp_new
              Homey.log(device_data)
              //Homey.log(devices)
              //evohomeDebugLog (device_data.data.name + ': new temperature: ' + temp_new)
              // During initial run, don't trigger update of temperature; it might not have changed
              if ( initial_run == 'false' ) {
                module.exports.realtime(device_data,'measure_temperature',temp_new)
              }

              //var device_data.temp = temp_new
              //Homey.log (device_data)
              //Homey.log (devices)
              //devices.push(device)
            }
            Homey.log ('////////////')
              // TODO: check of naam veranderd is, zo ja, in Homey aanpassen indien mogelijk
          }
          //Homey.log('----VOLGENDE----')
        })
      })
      Homey.log('---Einde updateState-----')
      //devices.push
      callback(null)
    })

  },


pair : function( socket ) {

var settings = Homey.manager('settings').get('evohomeaccount')
  if (settings) {
    var evohomesystem = new Evohomey({
      user: settings.user,
      password: settings.password,
      appid: settings.appid
    })
  }

  socket.on('start', function (data, callback) {
      Homey.log('pairing started')
      if (!settings) {
        Homey.log('no settings')
        return callback('errorNoSettings')
      }
      evohomesystem.validateAccount(function (error, userId) {
      if (error) return callback('errorInvalidSettings')
      Homey.log('pairing: validation complete')
      //Homey.emit('list_devices')
      callback(null)
    })
  }),

  socket.on('list_devices', function (data, callback) {
    Homey.log('list devices')
    var rawdata =[]
    evohomesystem.getAllInformation(function(rawdata) {
      //Homey.log('Pairing data:' + rawdata)
      //Homey.log('========')
      //Homey.log(Array.isArray(rawdata))
      //Homey.log(rawdata[0]["devices"])
      //Homey.log(allinformation[0]["devices"])
      var rawdevices = rawdata[0]["devices"]
      devices = []
      //Homey.log(devices)
      Homey.log('++++++++++')
      //Homey.log(rawdevices)
      rawdevices.forEach(function(entry){
        var device = {
          name: entry["name"],
          data: {
              id: entry["deviceID"],
              name: entry["name"],
              alive: entry["isAlive"],
              temp: Number(entry["thermostat"]["indoorTemperature"].toFixed(2))
          },
          state: {
              measure_temperature: Number(entry["thermostat"]["indoorTemperature"].toFixed(2)),
              target_temperature: Number(entry["thermostat"]["changeableValues"]["heatSetpoint"]["value"].toFixed(2))
          }
        }
        Homey.log('target temp:' + Number(entry["thermostat"]["changeableValues"]["heatSetpoint"]["value"].toFixed(2)))
        //Homey.log(device)
        Homey.log('--------------------------------')
        devices.push(device)
        })
        Homey.log('list devices resultaat: ' + devices)
        callback(null, devices)
    })
  })

  socket.on('add_device', function(device, callback) {
    //.log(devices)
    evohomeDebugLog('Added Evohome thermostat: ', device)
    //evohomesystem.updateState(devices,devices,function(callback){
      Homey.log('added device: ' + device)
    //})
      devices.push(device)
      callback(null)
  })

  socket.on('disconnect', function(){
    Homey.log("User aborted pairing, or pairing is finished");
  })
},

capabilities : {

    reset_temperature: {
        set: function (device_data, callback){
          if( typeof callback == 'function' ) {
              Homey.log ('reset capability: ' + device_data)
              callback( null )
          }
        }
    },
    measure_temperature: {

        // this function is called by Homey when it wants to GET the dim state, e.g. when the user loads the smartphone interface
        // `device_data` is the object as saved during pairing
        // `callback` should return the current value in the format callback( err, value )
        get: function( device_data, callback ){
            // currently, it will not actively retrieve the data, but use the stored data
            var device = devices [ device_data.id ]
            evohomeDebugLog ('measure temperature: ' + device_data.id + ' : ' + device_data.name + " : " + device.state.measure_temperature)
            // send the dim value to Homey
            if( typeof callback == 'function' ) {
                callback( null, device.state.measure_temperature );
            }
        }
        // this function is called by Homey when it wants to SET the dim state, e.g. when the user says 'red lights'
        // `device_data` is the object as saved during pairing
        // `dim` is the new value
        // `callback` should return the new value in the format callback( err, value )
      },
    target_temperature: {

      get: function( device_data, callback ) {
          Homey.log ('get target temperature')
          Homey.log (device_data)
          var device = devices [ device_data.id ]
          //Homey.log ('get target_temperature: ' + device_data.state.target_temperature)
          //var bulb = getBulb( device_data.id );
          //if( bulb instanceof Error ) return callback( bulb );

          //if( bulb.state.dim != dim ) {
          //    bulb.state.dim = dim;
          //    module.exports.realtime( device_data, 'dim', dim);
          //    updateBulb( device_data.id );
          //}

          // send the new dim value to Homey
          if( typeof callback == 'function' ) {
              callback( null, device.state.target_temperature);
          }
      },
        set: function( device_data, target_temperature, callback ) {
          var settings = Homey.manager('settings').get('evohomeaccount')
            if (settings) {
              var evohomesystem = new Evohomey({
                user: settings.user,
                password: settings.password,
                appid: settings.appid
              })
            }
            var device = devices [ device_data.id ]
            evohomeDebugLog ('set temperature: ' + device_data.id + ' ' + target_temperature)
            // round to nearest 0.5 degrees (slider sometimes gives values not rounded to 0.5)
            var new_target = Number(Math.round(target_temperature * 2) / 2).toFixed(1)
            Homey.log (new_target)
            if( typeof callback == 'function' ) {
              evohomesystem.setDeviceTemperature(device_data.id,new_target,function(callback) {
                  //module.exports.realtime(device_data,'target_temperature',temp_new)
                  evohomeDebugLog(device_data.id + ': new target temperature set: ' + new_target)
                  device.state.target_temperature = new_target
                  callback( null, new_target);
              })

            }
        }
    }
}

}
