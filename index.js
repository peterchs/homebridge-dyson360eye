'use strict';
var 
	Service,
	Characteristic,
	vacuumRobotCleanService,
	vacuumRobotGoToDockService,
	vacuumRobotDockStateService,
	vacuumRobotMaxPowerService,
	vacuumRobotBatteryService,
	refresh,
	timer;
const mqtt = require('mqtt');
const EventEmitter = require('events');
 
module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-dyson360eye", "Dyson360EyeRobotVacuum", Dyson360EyeRobotVacuum);
}

function Dyson360EyeRobotVacuum(log, config) {
	this.log = log;
	this.name = config['name'];
	this.serial = "1-9-2-8";
	this.host = config['host'];
        this.port = config['port'];
        this.username = config['username'];
	this.password = config['password'];
	this.refresh = config['refresh'];

	this.vacuumRobotCleanService = new Service.Switch(this.name + " Clean", "clean");
	this.vacuumRobotGoToDockService = new Service.Switch(this.name + " Go to Dock", "goToDock");
	this.vacuumRobotDockStateService = new Service.OccupancySensor(this.name + " Dock", "dockState");
	this.vacuumRobotMaxPowerService = new Service.Switch(this.name + " Max", "maxPower");
        this.vacuumRobotQuietPowerService = new Service.Switch(this.name + " Quiet", "quietPower");
	this.vacuumRobotBatteryService = new Service.BatteryService("Battery", "battery");

        this.gettingState = false;
        this.state = null;
        this.initConnection();
}

Dyson360EyeRobotVacuum.prototype = {
        initConnection: function() {
          this.log('initConnection');
          this.url = 'mqtt://' + this.host + ':' + this.port;
          this.log(this.url);
          this.options = {
          keepalive: 10,
          clientId: 'homebridge-dyson_' + Math.random().toString(16),
          protocolId: 'MQIsdp',
          protocolVersion: 3,
          clean: true,
          reconnectPeriod: 1000,
          connectTimeout: 30 * 1000,
          username: this.username,
          password: this.password,
          rejectUnauthorized: false
        };
        this.json_emitter = new EventEmitter();
        var that = this;
        this.mqtt_client = mqtt.connect(this.url, this.options);
        this.mqtt_client.on('connect', function() {
          that.log('connected');
          that.mqtt_client.subscribe("N223/" + that.username + "/status");
          that.log('subscribed to ' + "N223/" + that.username + "/status");
          that.getState();
        })
        this.mqtt_client.on('message', function(topic, message) {
          var json = JSON.parse(message);
          that.log(JSON.stringify(json));
          if (json !== null) {
              if (json.msg === "CURRENT-STATE") {
                  that.gettingState = false;
		  that.state = json; 
 		  that.json_emitter.emit('state', that.state.state);
                  that.log('state is ' + that.state.state);
              } else
	      {
		that.log('NOT PROCESSED: ' + json);
		}
          }
         });
        },

	identify: function (callback) {
		this.log("Identify requested");
		callback();
	},

	getServices: function () {
		this.informationService = new Service.AccessoryInformation();
		this.informationService
		.setCharacteristic(Characteristic.Manufacturer, "Dyson")
		.setCharacteristic(Characteristic.Model, this.name)
		.setCharacteristic(Characteristic.SerialNumber, this.serial);

		this.vacuumRobotCleanService.getCharacteristic(Characteristic.On).on('set', this.setClean.bind(this));
		this.vacuumRobotCleanService.getCharacteristic(Characteristic.On).on('get', this.getClean.bind(this));

		this.vacuumRobotGoToDockService.getCharacteristic(Characteristic.On).on('set', this.setGoToDock.bind(this));
		this.vacuumRobotGoToDockService.getCharacteristic(Characteristic.On).on('get', this.getGoToDock.bind(this));

		this.vacuumRobotDockStateService.getCharacteristic(Characteristic.OccupancyDetected).on('get', this.getDock.bind(this));

		this.vacuumRobotMaxPowerService.getCharacteristic(Characteristic.On).on('set', this.setMaxPower.bind(this));
		this.vacuumRobotMaxPowerService.getCharacteristic(Characteristic.On).on('get', this.getMaxPower.bind(this));

		this.vacuumRobotQuietPowerService.getCharacteristic(Characteristic.On).on('set', this.setQuietPower.bind(this));
		this.vacuumRobotQuietPowerService.getCharacteristic(Characteristic.On).on('get', this.getQuietPower.bind(this));

		this.vacuumRobotBatteryService.getCharacteristic(Characteristic.BatteryLevel).on('get', this.getBatteryLevel.bind(this));
		this.vacuumRobotBatteryService.getCharacteristic(Characteristic.ChargingState).on('get', this.getBatteryChargingState.bind(this));

		return [
     			this.informationService,
		 	this.vacuumRobotCleanService, 
			this.vacuumRobotGoToDockService, 
			this.vacuumRobotDockStateService, 
			this.vacuumRobotMaxPowerService,
			this.vacuumRobotQuietPowerService, 
			this.vacuumRobotBatteryService
			];
	},

	setClean: function (on, callback) {
		var that = this;
                this.log('setClean');	
		this.json_emitter.once('state', (json) => {
			var now = new Date();
			that.log('on ' + on);
			that.log('state ' + that.state.state);
			if (on && (that.state.state === 'INACTIVE_CHARGING' || that.state.state === 'INACTIVE_CHARGED'))
			{
				var message = '{"msg":"START","time":"' + now.toISOString() + '", "fullCleanType":"immediate"}';
			} else if (!on && that.state.state === 'FULL_CLEAN_RUNNING') {
				var message = '{"msg":"PAUSE","time":"' + now.toISOString() + '"}';
			} else if (on && that.state.state === 'FULL_CLEAN_PAUSED') {
				var message = '{"msg":"RESUME","time":"' + now.toISOString() + '"}';	
			}
  			that.log(message); 
			that.mqtt_client.publish(
        	                "N223/" + that.username + "/command",
                	        message
                	);
                	that.vacuumRobotCleanService.getCharacteristic(Characteristic.On).updateValue(false);
                	that.vacuumRobotGoToDockService.getCharacteristic(Characteristic.On).updateValue(false);
                	that.vacuumRobotDockStateService.getCharacteristic(Characteristic.OccupancyDetected).updateValue(false);
			that.getClean(callback);
		});
		this.getState();
        },

	setGoToDock: function (on, callback) {
		let that = this;
                this.log('setGoToDock');
                var now = new Date();
                if (on)
                {
                        var message = '{"msg":"ABORT","time":"' + now.toISOString() + '", "fullCleanType":"immediate"}';
                	this.mqtt_client.publish(
                        	"N223/" + that.username + "/command",
                        	message
                	);
		}
               	this.vacuumRobotGoToDockService.getCharacteristic(Characteristic.On).updateValue(false);
                this.vacuumRobotCleanService.getCharacteristic(Characteristic.On).updateValue(false);
                this.vacuumRobotDockStateService.getCharacteristic(Characteristic.OccupancyDetected).updateValue(false);
               	this.getGoToDock(callback);
        },

	setMaxPower: function (on, callback, fromQuiet) {
	     	this.log('setMaxPower to ' + on);	
                var that = this;
    		var now = new Date();
                if (on)
		{
			var powerMode = 'fullPower';
		} else {
			var powerMode = 'halfPower';
		}
    		var message = '{"msg":"STATE-SET","time":"' + now.toISOString() + '","data":{"currentVacuumPowerMode":"' + powerMode + '","defaultVacuumPowerMode":"' + powerMode + '"}}';
    		this.mqtt_client.publish(
        	        "N223/" + that.username + "/command",
        		message
    		);
		this.json_emitter.once('state', (json) => {
                        that.log('once in setMaxPower ' + (that.state.currentVacuumPowerMode === 'fullPower'));
			if (fromQuiet === true)
			{
				that.log('*** IN FROM QUIET');	
				callback(null, that.state.currentVacuumPowerMode === 'halfPower');
			} else
			{
				callback(null, that.state.currentVacuumPowerMode === 'fullPower');
			}
		});
                this.mqtt_client.publish(
                        "N223/" + that.username + "/command",
                        message
                );	
		//this.getState();
    		//this.vacuumRobotMaxPowerService.getCharacteristic(Characteristic.On).updateValue(false);
                //this.vacuumRobotQuietPowerService.getCharacteristic(Characteristic.On).updateValue(false);
                //this.getMaxPower(callback);
	},

        setQuietPower: function (on, callback) {
        	this.log('setQuietPower: ' + on);
		this.setMaxPower(!on, callback,true); 
        },

	getClean: function(callback) {
          this.log('getClean');
          callback(null, this.state.state === 'FULL_CLEAN_RUNNING'); 
	},

	getGoToDock: function(callback) {
		callback(null, this.state.state === 'FULL_CLEAN_ABORTED');	
	},

        getDock: function(callback) {
                callback(null, this.state.state === 'INACTIVE_CHARGING' || this.state.state === 'INACTIVE_CHARGED');
        },

	getMaxPower: function(callback) {
          this.log('getMaxPower ' + this.state.currentVacuumPowerMode === 'fullPower');
          callback(null, this.state.currentVacuumPowerMode === 'fullPower');  
	},

        getQuietPower: function(callback) {
           this.log('getQuietPower '+ this.state.currentVacuumPowerMode === 'halfPower');
           callback(null, this.state.currentVacuumPowerMode === 'halfPower');
        },

	getBatteryLevel: function(callback) {
		callback(false, this.state.batteryChargeLevel);
	},

	getBatteryChargingState: function(callback) {
		callback(false, this.state.state === 'INACTIVE_CHARGING');
	},

	getState: function(callback) {
		if (this.gettingState == true)
		{
			this.log('already getting state');
			return;
		}	
		this.gettingState = true;
		this.log("Get state (new)");
		let that = this;
		this.json_emitter.once('state', (json) => {
			that.log('in the once state for get state');
			that.vacuumRobotMaxPowerService.getCharacteristic(Characteristic.On).updateValue(that.state.currentVacuumPowerMode === 'fullPower',null);
                	that.vacuumRobotQuietPowerService.getCharacteristic(Characteristic.On).updateValue(that.state.currentVacuumPowerMode === 'halfPower',null);
			that.log('>>>>>>>>>>>>>> max is ' + (that.state.currentVacuumPowerMode === 'fullPower') + '  and quiet ' + (that.state.currentVacuumPowerMode === 'halfPower'));			
		});
	        this.mqtt_client.publish(
       		  'N223/' + that.username + '/command',
              	  '{"msg":"REQUEST-CURRENT-STATE"}'
        	);
	}
}

