import sys
import os
import time
import sched
import json

import flask
from flask_cors import CORS, cross_origin
import multiprocessing as mp
import os

from PotStriker import Hat
from PotStriker import Servo

configFile='./config.json'

app = flask.Flask(__name__)
hats = []
servos = []
recordDict = None
scheduler = None
started = False

# methods required for multiprocessing behaviour
def trigger(servo):
    servo.triggerServo()


def set_up(servo):
    servo.initServo()


# status method
@app.route("/", methods=['GET'])
def hello():
    global started
    #return "pot striking server is running....."
    return flask.Response(json.dumps({"started": started}), content_type='application/json')


# STRIKING RESOURCES
def strike_servos(servo_ids):
    global started
    if not started:
        app.logger.debug ("Attempt to strike pots (in strike())when stoped")
        return
    servosToStrike = [servo for servo in servos if servo.id in servo_ids]
    for servo in servosToStrike:
        p = mp.Process(target=trigger, args=(servo,))
        p.start()
    if len(servosToStrike) != 0:
        p.join()
    else:
        app.logger.debug("Attempt to strike servos when none defined")


# strikes the pots
@app.route("/strike", methods=['POST'])
def strike():
    global started
    if not started:
        app.logger.debug ("Attempt to strike pots (in strike())when stoped")
        return "Attempt to strike pots when stoped"
    app.logger.debug("/strike :\n{}".format(flask.request.json))
    strikeArray = flask.request.json
    global recordDict
    if recordDict is not None:
        strikeRecord = {"time": time.time(), "strike": strikeArray}
        app.logger.debug("recording : {}".format(strikeRecord))
        recordDict["recording"].append(strikeRecord)
    strike_servos(strikeArray)
    return "striking pots..."

## Recording
#Are we recording?	
@app.route("/isrecording", methods=['GET'])
def is_recording():
    global recordDict
    if recordDict is None:
        isRec = False
    else:
        isRec = True
    app.logger.debug("isRec >" + str(isRec))
    return flask.Response(json.dumps({"recording": isRec}), content_type='application/json')


# initialises a new log file where all future '/strike' requests will be logged
@app.route("/recording", methods=['POST'])
def recording_start():
    app.logger.debug("/recording :\n{}".format(flask.request.json))
    global recordDict
    recordRequest = flask.request.json
    recordFilename = "./records/" + recordRequest['record_filename'] + ".json"
    if recordDict is None:
        recordDict = {"link": "/record/{}".format(recordRequest['record_filename']),
                      "filename": recordFilename,
                      "time": time.time(),
                      "recording": []}
        return flask.Response("pot striking server is now recording to [{}]...".format(recordFilename), 201)
    else:
        return flask.Response("pot striking server is already recording", 400)


# stops the current recording
@app.route("/recording/stop", methods=['GET'])
def recording_stop():
    global recordDict
    app.logger.debug("/recording/stop ")
    if recordDict is not None:
        recording_stop(recordDict)
        return flask.Response("stopped recording")
    else:
        return flask.Response("no record file currently instantiated", 400)


# RECORDING RESOURCES
def recording_stop(recDict):
    global recordDict
    with open(recordDict["filename"], "w") as recordFile:
	    recordFile.write(json.dumps(recordDict))
    recordDict = None
    
def get_records():
    # strip .json from filenames
    records = [r[:-5] for r in os.listdir("./records")]
    recordResponse = {"records": records}
    return recordResponse


# lists all existing records
@app.route("/records", methods=['GET'])
def record_list():
    app.logger.debug("/records")
    return flask.Response(json.dumps(get_records()), content_type='application/json')


# gets a record
@app.route("/records/<record_filename>", methods=['GET'])
def get_record(record_filename):
    app.logger.debug("/records/{}".format(record_filename))
    records = os.listdir("./records")
    fname = str(record_filename + ".json")
    for record in records:
        if fname == record:
            with open("./records/"+record, 'r') as recording:
                return flask.Response(recording.read(), content_type='application/json')
    err = "no record found with the filename [{}.json]".format(record_filename)
    app.logger.debug(err)
    return page_not_found(err)


# replays a record - Depreciated now played from client
@app.route("/records/<record_filename>/play", methods=['GET'])
def play_record(record_filename):
    app.logger.debug("/records/{}/play".format(record_filename))
    global scheduler
    if scheduler is None:
        with open("./records/"+record_filename + ".json", 'r') as recording :
            record = json.load(recording)
            scheduler = sched.scheduler(time.time, time.sleep)
            for strikeRequest in record["recording"]:
                timeOffset = strikeRequest["time"] - record["time"]
                scheduler.enter(timeOffset, 1, strike_servos, (strikeRequest["strike"],))
            scheduler.run()
            scheduler = None
        return "play-back of {} completed...".format(record_filename)
    else:
        return flask.Response("record play-back already in process", 400)


# stops playback of recordings - Depreciated now played from client
@app.route("/records/stop", methods=['GET'])
def stop_record():
    app.logger.debug("/records/stop")
    global scheduler
    if scheduler is not None:
        for event in scheduler.queue():
            scheduler.cancel(event)
        scheduler = None
        return "playback stopped"
    else:
        return flask.Response("there was no record to stop", 400)
    


# CONFIG RESOURCES
#####
#Hats
#####
def get_hats():
    global hats
    h = [hat.to_dict() for hat in hats]
    return {"hats": h}


# returns list of currently configured servo hats
@app.route("/hats", methods=['GET'])
def hat_list():
    app.logger.debug("/hats")
    return flask.Response(json.dumps(get_hats()), content_type='application/json')

#Hats are now detected by hardware (hats_detect())
'''
# adds a new servo hat
@app.route("/hats", methods=['POST'])
def hat_add():
    app.logger.debug("/hats :\n{}".format(flask.request.json))
    global hats
    hatRequest = flask.request.json
    hatId = hatRequest['id']
    hatAddr = hatRequest['address']
    if hat_add(hatId,hatAddr):
        return flask.Response(json.dumps(get_hats()), 201, content_type='application/json')
    else:
        return flask.Response(json.dumps(get_hats()), 400, content_type='application/json')
'''
def hat_add(hatId, hatAddr):
    global hats
    for hat in hats:
        if hat.id == hatId or hat.addressStr == hatAddr:
            app.logger.debug('Failed to add hat addr :' + str(hatAddr) + ' Hat already exists' )
            return False
    try:
        h = Hat(hatId, int(hatAddr,16))
        hats.append(h)
        app.logger.debug('Added hat with id ' + str(hatId) + ' and address ' + str(hatAddr))
        return True
    except IOError:
        #app.logger.debug('Failed to add hat addr :' + str(hatAddr) )
        return False



# gets an individual servo hat
@app.route("/hats/<hat_id>", methods=['GET'])
def get_hat(hat_id):
    app.logger.debug("/hats/{}".format(hat_id))
    global hats
    for hat in hats:
        if hat.id == int(hat_id):
            return flask.Response(hat.to_JSON(), content_type='application/json')
    err = "no hat found with the id [{}]".format(hat_id)
    app.logger.debug(err)
    return page_not_found(err)


# removes a servo hat
### Only called internally @app.route("/hats/<hat_id>", methods=['DELETE'])
def hat_remove(hat_id):
    app.logger.debug("hat_remove ".format(hat_id))
    global hats
    for i,hat in enumerate(hats):
        if hat.id == int(hat_id):
            del hats[i]
            return flask.Response(json.dumps(get_hats()), content_type='application/json')
    return flask.Response(json.dumps(get_hats()), 400, content_type='application/json')

def config_delete_hats():
    for hat in hats:
        hat_remove(hat.id)

def hat_exists_id(hat_id):
    for hat in hats:
        if hat.id == int(hat_id):
            return True
    return False

 
def hat_exists_addr(hat_addr):
    for hat in hats:
        if hat.addr == hat_addr:
            return True
    return False

#Delete Current hats and find out what hardware is attached 
def hats_detect():
    app.logger.debug('hats_detect()')
    config_delete_hats()
#    for i in range(0,len(hats)):
#        del hats[i]

    id = 0
    #Max Hat address before wrap is 0x6F (despite what docs say!)
    for i in range (0x40,0x6F):
        #hat_add expects a string 
        if (hat_add(id,''.join('0x{:2X}'.format(i))) == True):
            id += 1

		
######
#Servos
#####

# returns current servo count
@app.route("/servocount", methods=['GET'])
def servo_count():
    app.logger.debug("/servocount")
    #return flask.Response(str(len(servos)),200)
    return flask.Response(json.dumps({"servocount": str(len(servos))}), content_type='application/json')

def get_servos():
    global servos
    s = [servo.to_dict() for servo in servos]
    return {"servos": s}



# returns current servo configuration
@app.route("/servos", methods=['GET'])
def servo_list():
    app.logger.debug("/servos")
    return flask.Response(json.dumps(get_servos()), content_type='application/json')


# adds a new servo to the current configuration
@app.route("/servos", methods=['POST'])
def servo_add_flask():
    app.logger.debug("/servos :\n{}".format(flask.request.json))
    global servos
    global hats
    servoRequest = flask.request.json
    servoId = servoRequest['id']
    hatId = servoRequest['hat']
    channel = servoRequest['channel']
    initDeg = servoRequest['init_deg']
    rotateToDeg = servoRequest['rotate_to_deg']

    if servo_add(servoId, hatId, channel, initDeg, rotateToDeg): 
        return flask.Response(json.dumps(get_servos()), 201, content_type='application/json')
    else:
        return flask.Response(json.dumps(get_hats()), 400, content_type='application/json')
    
def servo_add(servoId, hatId, channel, initDeg, rotateToDeg):
    global servos
    global hats

    for servo in servos:
        if servo.id == servoId or (hatId == servo.hat.id and channel == servo.channel):
            return False

    for hat in hats:
        if hatId == hat.id:
            s = Servo(servoId, hat, channel, initDeg, rotateToDeg)
            s.initServo()
            servos.append(s)
            config_save()
            return True

    return False


# gets an individual servo
@app.route("/servos/<servo_id>", methods=['GET'])
def get_servo(servo_id):
    app.logger.debug("/servos/{}".format(servo_id))
    global servos
    for servo in servos:
        if servo.id == int(servo_id):
            return flask.Response(servo.to_JSON(), content_type='application/json')
    err = "no servo found with the id [{}]".format(servo_id)
    app.logger.debug(err)
    return page_not_found(err)


# removes a servo
@app.route("/servos/<servo_id>", methods=['DELETE'])
def servo_remove(servo_id):
    app.logger.debug("/servos/{}".format(servo_id))
    global servos
    for i, servo in enumerate(servos):
        if servo.id == int(servo_id):
            del servos[i]
            config_save()
            return flask.Response(json.dumps(get_servos()), content_type='application/json')
    return flask.Response(json.dumps(get_servos()), 400, content_type='application/json')

#####
#Config
#####

#Config Dump
@app.route("/dump", methods=['GET'])
def config_dump():
    app.logger.debug("/dump")
    global servos
    global hats


    s = [servo.to_dict() for servo in servos]
    h = [hat.to_dict() for hat in hats]

    jdump=json.dumps( { "config" : {"servos": s , "hats": h} } )
    app.logger.debug(jdump)
    return flask.Response(jdump, 200, content_type='application/json')

#Config Save   
@app.route("/saveconf", methods=['GET'])
def config_save():
#    app.logger.debug("/saveconf")
    global servos


    s = [servo.to_dict() for servo in servos]
    #h = [hat.to_dict() for hat in hats]

#    app.logger.debug(json.dumps( { "config" : {"servos": s , "hats": h} } ))
    app.logger.debug("config Save")
#    app.logger.debug(s)
    with open(configFile,'w') as outFile:
        #json.dump( { "config" : {"servos": s , "hats": h} }, outFile )
        json.dump( s, outFile )
    outFile.close()
    return flask.Response(json.dumps( 'Configuration Saved' ))
   
#Config Load
@app.route("/loadconf", methods=['GET'])
def config_load_flask():
#    confRequest = flask.request.json
#    ts = confRequest['ts']
#    app.logger.debug('Config Load Request ' + str(ts))
    app.logger.debug('Config Load Request ' )
    if config_load():
        return flask.Response( 'Loaded',status=200 )
    else:
        return flask.Response( 'Load Failed or Hardware Config Changes',status=500 )
        	
def config_load():
    global servos
    global hats

    config_delete_servos()
    #config_delete_hats()
    hats_detect()
    if not hat_exists_id(0):
        return flask.Response( 'No Hats found on Pi',status=500 )
    else:
        if os.path.exists(configFile):
            jdata = json.load( open(configFile)  )
            #app.logger.debug(jdata)
            for servo in jdata:
                #app.logger.debug(servo)
                #Check hat id in each actually servo exists
                if not hat_exists_id(servo["hat"]["id"]):
                    #Saved config has a hat that doesn't exit in real life
                    config_delete_servos()
                    return False
                else:
                    servo_add(servo["id"], servo["hat"]["id"], servo["channel"], servo["init_deg"], servo["rotate_to_deg"])
            return True
        else:
            return True
    

#Config Delete - Delete IN MEMORY config - not any saved config
@app.route("/delconf", methods=['GET'])
def config_delete():  
    config_delete_hats()
    config_delete_servos()
    app.logger.debug('In Memory Config Deleted')

def config_delete_servos():
#    for servo in servos:
#        servo_remove(servo.id)
    for i, servo in enumerate(servos):
         del servos[i]

def config_file_delete():        
    if os.path.exists(configFile):
        os.remove(configFile)
    app.logger.debug('Config File Deleted')
                           
# ERROR HANDLING
@app.errorhandler(404)
def page_not_found(error):
    return 'This page does not exist', 404


@app.errorhandler(500)
def application_exception_handler(error):
    return 'Internal error occurred', 500


# starts the app
def init():
    CORS(app)
    app.debug = True
    app.run(host='0.0.0.0')

@app.route("/start", methods=['GET'])
def start():
    global started
    app.logger.debug('Starting Up....' )
    #config_delete()
    #hats_detect()
    started=True
    return flask.Response( 'Started OK',status=200 )


@app.route("/stop", methods=['GET'])
def stop():
    app.logger.debug('Stopping... ' )
    global started
    config_delete()
    started=False
    return flask.Response( 'Stoped OK',status=200 )
	
@app.route("/shutdown", methods=['GET'])
def shutdown():
    app.logger.debug('Shutdown... ' )
    global started
    config_delete()
    started=False
    os.system("sudo shutdown now systemstopping")
    return flask.Response( 'Stoped OK',status=200 )

