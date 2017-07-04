# homebridge-dyson360eye
Homebridge plugin for the Dyson 360 Eye Robot Vacuum

Requires Homebridge installed first, refer to https://github.com/nfarina/homebridge

The config requires a username and password, which you obtain from sticker in your manual or on the device label behind the bin.
The password has to be SHA-512 encrypted and then base64 encoded before inserting into the config.  This can be done via a tool at https://caligatio.github.io/jsSHA/ (client side javascript only).  Put password into 'Input text', input type 'TEXT', SHA Variant 'SHA-512', Number of Rounds "1", Output Type "Base64".  The output hash should be copied and placed into the config.  The example below is 'password' encoded correctly.

Ensure you set your 360 eye robot up to have a static IP in line with the config, this can be done through your router DHCP settings.

Configuration Accessories Section Sample for Homebridge config.json:

```
"accessories": [
        {
        "accessory": "Dyson360EyeRobotVacuum",
        "name": "Robot",
        "host": "192.168.1.111",
        "port": 1883,
        "username": "JJ5-UK-HKA9999Z",
        "password": "sQnzu7wkTrgkQZF+0G1hi5AI3Qmzvv0bXgc5THBqi7mAsdd4Xll27ASbRt9fEyavWi6m0QP9B8lThf+rDKy8hg==",
        "refresh": 0
        }
  ]​
```

Once set up you can do commands like;
Hey siri
..set <NAME> max on = set robot to max power
..set <NAME> quiet on = set robot to quiet power
..set <NAME> clean on = start cleaning
..set <NAME> clean off = pause
..set <NAME> go to dock on = stop cleaning, return to dock

Where name is the configured robot name in the configuration (above it is 'Robot')

I have scenes set up in Home app, which set the switches appropriately, so the following siri commands/scenes work:
"Start cleaning" (turn on clean switch)
"Pause cleaning" (turn off clean switch)
"Stop Cleaning" (turn on go to dock switch)
"Resume Cleaning" (turn on clean switch)

This can be considered alpha but still may be of use.
