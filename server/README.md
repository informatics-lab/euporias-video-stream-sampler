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
 * POST `/strike` : accepts JSON array of integers indicating which pots should be struck.  
 
###strike request
To strike a pot, `POST` a JSON array object containing the servo id (as an integer) to the `/strike` resource :  
 * strike via servo (currently striking method supported) :  
```
 [ 0,1,2,3, ... ]  
```  

