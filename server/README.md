# euporias-pot-striking-server
Python Web Server application, interfaces with RPi hardware / hats / servos to strike the #BellHouse pots.

##installation
see https://github.com/adafruit/Adafruit_Python_PCA9685  
`sudo pip install Flask`  
`sudo pip install adafruit-pca9685`  
`sudo pip install flask-cors`  

##running
`python server.py`  

##auto configuration
Server can be configured automatically with included `configuration.json` file.  
`python config.py`

##API
Available route resources:  
 * GET      `/` : returns message if service is running.  
 
 * POST     `/strike` : accepts JSON array of integer (id's) indicating which pots should be struck:  
    - Sample request body `[0]`  
 
 * GET      `/hats` : returns a JSON object detailing the currently configured servo hats.
 * POST     `/hats` : adds a hat to the current config :  
    - Sample request body `{ "id", 1, "address" : 0x40 }`    
 * DELETE   `/hats/{id}` : removes the specified hat from the current config.  
 * GET      `/hats/{id}` : gets the specified hat from the current config.
    
 * GET      `/servos` : returns a JSON object detailing the currently configured servos.
 * POST     `/servos` : adds a servo to the current config :  
     - Sample request body `{ "id" : 1, "hat" : 1, "channel" : 1, "init_deg" : -45, "rotate_to_deg" : 50 }`    
 * DELETE   `/servos/{id}` : removes a servo from the current config.
 * GET      `/servos/{id}` : gets the specified servo from the current config.
 
 * GET      `/records` : lists all the records on the server. 
 * GET      `/records/{record_filename}` : gets the specified recording.
 * GET      `/records/{record_filename}/play` : plays-back the specified recording.
 * GET      `/records/stop` : stops the play-back of all recording
 
 * POST     `/recording` : initiates a new recording with the filename specified:
    - Sample request body: `{ "record_filename" : "record-1" }`  
 * GET      `/recording/stop` : stops the recording
