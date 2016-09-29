# euporias-pot-striking-server
JSON Web Server application, interfaces with RPi hardware to strike the pots.

##installation
see https://github.com/adafruit/Adafruit_Python_PCA9685
`sudo pip install Flask` 
`sudo pip install adafruit-pca9685`
`sudo pip install flask-cors`

##running
`python server.py`  

##API
Available route resources:  
 * GET `/` : returns message if service is running.  
 
 * POST `/strike` : accepts JSON array of integer (id's) indicating which pots should be struck:  
    - Sample request body `[0]`  
 
 * GET `/conf/hats` : returns a JSON object detailing the currently configured servo hats.
 * POST `/conf/hat` : adds a hat to the current config :  
    - Sample request body `{ "id", 1, "address" : 0x40 }`    
 * DELETE `/conf/hat/{id}` : removes the specified hat from the current config.  
 * GET `/conf/hat/{id}` : gets the specified hat from the current config.
    
 * GET `/conf/servos` : returns a JSON object detailing the currently configured servos.
 * POST `/conf/servo` : adds a servo to the current config :  
     - Sample request body `{ "id" : 1, "hat" : 1, "channel" : 1, "init_deg" : -45, "rotate_to_deg" : 50 }`    
 * DELETE `/conf/servo/{id}` : removes a servo from the current config.
 * GET `/conf/servo/{id}` : gets the specified servo from the current config.
 
 * GET `/records` : lists all the records on the server.  
 * POST `/record` : initiates a new recording with the filename specified:
    - Sample request body: `{ "record_filename" : "record-1" }`  
 * GET `/record/{record_filename}` : gets the specified recording.
 * GET `/record/{record_filename}/play` : plays-back the specified recording.