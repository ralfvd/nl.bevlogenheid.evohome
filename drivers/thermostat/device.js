'use strict';

const Homey = require('homey');
var jsonPath = require('jsonpath-plus')
var http = require('http.min')

class ThermostatDevice extends Homey.Device {

    // this method is called when the Device is inited
    onInit() {
        this.log('device init');
        this.log('name:', this.getName());
        //this.log('class:', this.getClass());
        //this.log('capability:', this.getCapabilities());
        this.log('settings:'), this.getData();
        const { id } = this.getData();
		    this._id = id;
        this.log('id:', id);
        var target_old = this.getCapabilityValue('target_temperature')
        this.log('target_temperature:', target_old)
        var measure_old = this.getCapabilityValue('measure_temperature')
        this.log('measure_temperature:', measure_old)

        // register a capability listener
        this.registerCapabilityListener('target_temperature', async (value) => {
        this.log('target temperature set requested')
            var target_old = this.getCapabilityValue('target_temperature')
            this.log('old:', target_old)
            this.log('new:', value)
            if (target_old != value) {
              this.log('start target setting', id, value)
              // execute target setting
              // /WebAPI/api/devices/' + deviceID + '/thermostat/changeableValues/heatSetpoint
                var evohomeUser = Homey.ManagerSettings.get('username');
                var evohomePassword= Homey.ManagerSettings.get('password');
                var appid="91db1612-73fd-4500-91b2-e63b069b185c";
                evohomelogin(evohomeUser,evohomePassword,appid).then(function() {
                  console.log('login successfull')
                  var access_token = Homey.ManagerSettings.get('access_token');
                  var locationurl = ('/WebAPI/emea/api/v1/temperatureZone/' + id + '/heatSetpoint');
                  console.log (locationurl , value)
                  var options = {
                    protocol: 'https:',
                    hostname: 'tccna.honeywell.com',
                    path: locationurl,
                    headers: {
                      'Authorization': 'bearer ' + access_token,
                      'Accept': 'application/json, application/xml, text/json, text/x-json, text/javascript, text/xml'
                    },
                    json: true,
                    form: {
                      'HeatSetpointValue': value,
                      'SetpointMode': 1,
                      'TimeUntil': ''
                    }
                  }
                  console.log(options)
                  http.put(options).then(function (result) {
                    //this.setCapabilityValue('target_temperature', value)
                    //console.log(result)
                    return Promise.resolve();
                  })
                  .catch(function(reject) {
                    console.log('catch 1')
                    console.log(reject);
                  })
                })
                .catch(function(reject) {
                  console.log('catch 2')
                  console.log(reject);
                })
            }
        })

    }

    // this method is called when the Device is added
    onAdded() {
        this.log('device added');
    }

    // this method is called when the Device is deleted
    onDeleted() {
        this.log('device deleted');
    }

}

module.exports = ThermostatDevice;

// ugly solution, but it doesn't get the evohomey function, since it is outside the exports.
function evohomelogin(user, password, appid, callback) {
  return new Promise (function (fulfill, reject) {
    console.log("device.js evohomey.login")
    if (!user) { reject('No username set'); return }
    if (!password) { reject('No password set'); return }
    // Check of token nog 30 seconden geldig is, zo niet, opnieuw token ophalen
    var access_token = Homey.ManagerSettings.get('access_token');
    var access_token_expires = Homey.ManagerSettings.get('access_token_expires');
    //console.log(access_token_expires);
    var currentTime = new Date();
    var expireTime = Date.parse(access_token_expires);
    var difference = expireTime - currentTime;
    //console.log (difference);
    if (difference > 30*1000)
    {
      console.log ('token not yet expired');
    }
    else {
      console.log('get new token')
      var options = {
      uri: 'https://tccna.honeywell.com/Auth/OAuth/Token',
      headers: {
        'Authorization': 'Basic YjAxM2FhMjYtOTcyNC00ZGJkLTg4OTctMDQ4YjlhYWRhMjQ5OnRlc3Q=',
        'Accept': 'application/json, application/xml, text/json, text/x-json, text/javascript, text/xml'
      },
      json: true,
      form: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Host': 'rs.alarmnet.com/',
        'Cache-Control':'no-store no-cache',
        'Pragma': 'no-cache',
        'grant_type': 'password',
        'scope': 'EMEA-V1-Basic EMEA-V1-Anonymous EMEA-V1-Get-Current-User-Account',
        'Username': user,
        'Password': password,
        'Connection': 'Keep-Alive'
      }
      }
      http.put(options).then(function (data) {
      //var resultaat = JSON.parse(data)
      var access_token = data.data.access_token
      //console.log('Response access token:', data.data.access_token)
      //console.log('Expires:', data.data.expires_in)
      console.log(data.data);
      var timeObject = new Date();
      var timeObject = new Date(timeObject.getTime() + data.data.expires_in*1000);
      Homey.ManagerSettings.set('access_token', data.data.access_token);
      console.log (data.data.access_token);
      console.log (timeObject);
      Homey.ManagerSettings.set('access_token_expires', timeObject);
      //self.access_token = None
      //self.access_token_expires = None
    })
    .catch(function(reject) {
      console.log(reject);
    })
  } // end else
  // user_account
  var account_info = Homey.ManagerSettings.get('account_info');
  if (account_info == "None") {
    console.log ("get account_info")
    var locationurl = ('/WebAPI/emea/api/v1/userAccount');
    var options = {
      protocol: 'https:',
      hostname: 'tccna.honeywell.com',
      path: locationurl,
      headers: {
        'Authorization': 'bearer ' + access_token,
        'Accept': 'application/json, application/xml, text/json, text/x-json, text/javascript, text/xml'
          }
    }
    //console.log(options);
    http.get(options).then(function (result) {
        //console.log('Location Code: ' + result.response.statusCode)
        //Homey.log('Response: ' + result.data)
            var data = JSON.parse(result.data)
            Homey.ManagerSettings.set('account_info',data.userId);
            console.log(data.userId);
            // installation / location
            var installation = Homey.ManagerSettings.get('installation');
            if (installation == "None") {
              console.log ("get location_info")
              var account_info = Homey.ManagerSettings.get('account_info');
              var locationurl = ('/WebAPI/emea/api/v1/location/installationInfo?userId=' + account_info + '&includeTemperatureControlSystems=True');
              var options = {
                protocol: 'https:',
                hostname: 'tccna.honeywell.com',
                path: locationurl,
                headers: {
                  'Authorization': 'bearer ' + access_token,
                  'Accept': 'application/json, application/xml, text/json, text/x-json, text/javascript, text/xml'
                }
              }
              http.get(options).then(function (result) {
                  var data = JSON.parse(result.data)
                  //console.log(data)
                  var systemId = data[0].gateways[0].temperatureControlSystems[0].systemId;
                  var locationId = data[0].locationInfo.locationId;
                  //console.log(result.data);
                  //var locationId =
                  Homey.ManagerSettings.set('systemId',systemId);
                  Homey.ManagerSettings.set('locationId',locationId);
              })
              .catch(function(reject) {
                console.log(reject);
              })
            }
      })
      .catch(function(reject) {
        console.log(reject);
      })

  }
  fulfill('ok');
  })
}