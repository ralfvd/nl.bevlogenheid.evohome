"use strict";
const Homey = require('homey');
var jsonPath = require('jsonpath-plus')
var http = require('http.min')

module.exports = {


evohomelogin: function(user, password, appid, callback) {
  return new Promise (function (resolve, reject) {
    console.log("evohomey.login login.js")
    var token_handlingPromise = token_handling()
    token_handlingPromise.then(function(result) {
          console.log('token handling OK')
          // hier nu account handling
          var account_handlingPromise = account_handling()
          account_handlingPromise.then(function(result) {
            console.log('account_handling OK')
            resolve('evohomelogin: login OK')
          })
          .catch(function(error) {
            console.log('catch account_handlingPromise', error)
           //reject(reject)
          })
    })
    .catch(function(error) {
      console.log('catch token_handlingPromise', error)
      //reject(reject)
    })

  });
}

} // end_exports

function token_handling()
{
  return new Promise(function(resolve,reject) {
    var access_token = Homey.ManagerSettings.get('access_token');
    var access_token_expires = Homey.ManagerSettings.get('access_token_expires');
    //console.log(access_token_expires);
    var evohomeUser = Homey.ManagerSettings.get('username');
    var evohomePassword= Homey.ManagerSettings.get('password');
    var appid="91db1612-73fd-4500-91b2-e63b069b185c";
    if ( !evohomeUser || !evohomePassword )
    {
      console.log('reject token handling' ) ; reject ('username settings missing'); return
    }
    else {
      console.log('token handling');
      var currentTime = new Date();
      var expireTime = Date.parse(access_token_expires);
      var difference = expireTime - currentTime;
      //console.log (difference);
      if (difference > 30*1000)
      {
        console.log ('token not yet expired');
        resolve('token not expired')
      }
      else {
        console.log('get new token')
        var options = {
          uri: 'https://tccna.honeywell.com/Auth/OAuth/Token',
          headers: {
    //        'Authorization': 'Basic YjAxM2FhMjYtOTcyNC00ZGJkLTg4OTctMDQ4YjlhYWRhMjQ5OnRlc3Q=',
            'Authorization': 'Basic NGEyMzEwODktZDJiNi00MWJkLWE1ZWItMTZhMGE0MjJiOTk5OjFhMTVjZGI4LTQyZGUtNDA3Yi1hZGQwLTA1OWY5MmM1MzBjYg==',
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
            'Username': evohomeUser,
            'Password': evohomePassword,
            'Connection': 'Keep-Alive'
          }
        }
        http.put(options).then(function (data) {
          //var resultaat = JSON.parse(data)
          var access_token = data.data.access_token
          //console.log('Response access token:', data.data.access_token)
          //console.log('Expires:', data.data.expires_in)
          console.log('--- login.js token_handling ---')
          //console.log(data.data);
          var timeObject = new Date();
          var timeObject = new Date(timeObject.getTime() + data.data.expires_in*1000);
          Homey.ManagerSettings.set('access_token', data.data.access_token);
          //console.log (data.data.access_token);
          //console.log (timeObject);
          Homey.ManagerSettings.set('access_token_expires', timeObject);
          //self.access_token = None
          //self.access_token_expires = None
          resolve('new token saved')
        })
        .catch(function(reject) {
          console.log(reject);
          //reject('token retrieval failed')
        })
      } // end else
    }
  }) // end Promise
}

function account_handling()
{
  return new Promise(function(resolve,reject) {
  var account_info = Homey.ManagerSettings.get('account_info');
  var access_token = Homey.ManagerSettings.get('access_token');
  if ( !access_token ) { reject ('no token'); return }
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
            console.log('- userID fetching -');
            //console.log(data);
            Homey.ManagerSettings.set('account_info',data.userId);
            console.log('userID: ', data.userId);
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
              console.log(locationurl);
              http.get(options).then(function (result) {
                  var data = JSON.parse(result.data)
                  console.log('--- system id check ---- ' )
                  //console.log(data)
                  var systemId = data[0].gateways[0].temperatureControlSystems[0].systemId;
                  //var locationId = data[0].locationInfo.locationId;
                  console.log('login.js')
                  console.log(data.length) // hoeveel locaties zijn er
                  var locationId = []
                  data.forEach(function(value){
                    locationId.push(value.locationInfo.locationId)
                  })
                  console.log(locationId)

                  //console.log(result.data);
                  //var locationId =
                  Homey.ManagerSettings.set('systemId',systemId);
                  Homey.ManagerSettings.set('locationId',locationId);
                  resolve('ok')
              })
              .catch(function(reject) {
                console.log(reject);
              })
            } //endif installation == none
      })
    } else  {
      resolve('account handling OK')
    }
  })
}
