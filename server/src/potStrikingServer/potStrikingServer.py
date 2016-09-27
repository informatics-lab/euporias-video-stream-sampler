import sys
import os
import flask
import time
import sched
from flask_cors import CORS, cross_origin
import multiprocessing as mp
from PotStriker import Hat
from PotStriker import Servo

app = flask.Flask(__name__)
hats = []
servos = []
recordFile = None


# methods required for multiprocessing behaviour
def trigger(servo):
    servo.triggerServo()

def set_up(servo):
    servo.initServo()


# basic healthcheck method
@app.route("/", methods=['GET'])
def hello():
    return "pot striking server is running..."


def strike_servos(servo_ids):
    servosToStrike = [servos[i] for i in servo_ids]
    for servo in servosToStrike:
        p = mp.Process(target=trigger, args=(servo,))
        p.start()
    p.join()

# strikes the pots
@app.route("/strike", methods=['POST'])
def strike():
    app.logger.debug("/strike :\n{}".format(flask.request.json))
    strikeArray = flask.request.json
    global recordFile
    if recordFile is not None:
        strikeRecord = { "time": time.time(), "strike": strikeArray }
        app.logger.debug("recording : {}".format(strikeRecord))
        recordFile.write("\n\t{},".format(strikeRecord))
    strike_servos(strikeArray)
    return "striking pots..."



# RECORDING RESOURCES

def get_records():
    records = os.listdir("./records")
    recordResponse = { "records" : records }
    return str(recordResponse)

# lists all existing records
@app.route("/records", methods=['GET'])
def record_list():
    return flask.Response(get_records(), content_type='application/json')

# initialises a new log file where all future '/strike' requests will be logged
@app.route("/record", methods=['POST'])
def record_start():
    global recordFile
    app.logger.debug("/record :\n{}".format(flask.request.json))
    recordRequest = flask.request.json
    recordFilename = "./records/" + recordRequest['record_filename'] + ".json"
    recordFile = open(recordFilename,'w')
    recordFile.write("{ 'time': "+str(time.time())+", 'recording': [")
    return flask.Response("pot striking server is now recording to file [{}]...".format(recordFilename), 201)

# stops the current recording
@app.route("/record/stop", methods=['GET'])
def record_stop():
    global recordFile
    if recordFile is not None:
        recordFile.seek(-1, os.SEEK_END)
        recordFile.truncate()
        recordFile.write("\n]}")
        recordFile.close()
        recordFile = None
        return flask.Response("stopped recording")
    else:
        return flask.Response("no record file currently instantiated", 400)

# gets a record
@app.route("/record/<record_filename>", methods=['GET'])
def get_record(record_filename):
    app.logger.debug("/record/{}".format(record_filename))
    records = os.listdir("./records")
    for record in records:
        if record_filename + ".json" == record:
            with open("./records/"+record, 'r') as recording:
                flask.Response(recording.read(), content_type='application/json')
    err = "no record found with the filename [{}]".format(record_filename)
    app.logger.debug(err)
    return page_not_found(err)

# replays a record
@app.route("/record/<record_filename>/play", methods=['GET'])
def play_record(record_filename):
    app.logger.debug("/record/{}/play".format(record_filename))
    with open("./records"+record_filename, 'r') as recording :
        record = json.load(recording)
        s = sched.scheduler(time.time, time.sleep)
        for strikeRequest in record.recording:
            timeOffset = strikeRequest.time - record.time
            s.enter(timeOffset, 1, strike_servos, strikeRequest.strike)
        s.run()
    return "playing back {} to strike pots...".format(record_filename)



#CONFIG RESOURCES

def get_hats():
    global hats
    hatsStr = '{"hats": ['
    for hat in hats:
        hatsStr += '\n\t' + hat.to_JSON()
        hatsStr += ','
    if hats:
        hatsStr = hatsStr[:-1]
    hatsStr += '\n] }'
    return hatsStr

# returns list of currently configured servo hats
@app.route("/conf/hats", methods=['GET'])
def hat_list():
    app.logger.debug("/conf/hats")
    return flask.Response(get_hats(), content_type='application/json')

# adds a new servo hat
@app.route("/conf/hat", methods=['POST'])
def hat_add():
    app.logger.debug("/conf/hat :\n{}".format(flask.request.json))
    global hats
    hatRequest = flask.request.json
    hatId = hatRequest['id']
    hatAddr = hatRequest['address']
    for hat in hats:
        if hat.id == hatId or hat.addressStr == hatAddr:
            return flask.Response(get_hats(), 400, content_type='application/json')

    h = Hat(hatRequest['id'], int(hatRequest['address'],16))
    hats.append(h)
    return flask.Response(get_hats(), 201, content_type='application/json')

# gets an individual servo hat
@app.route("/conf/hat/<hat_id>", methods=['GET'])
def get_hat(hat_id):
    app.logger.debug("/conf/hat/{}".format(hat_id))
    global hats
    for hat in hats:
        if hat.id == int(hat_id):
            return flask.Response(str(hat.to_JSON()), content_type='application/json')
    err = "no hat found with the id [{}]".format(hat_id)
    app.logger.debug(err)
    return page_not_found(err)

# removes a servo hat
@app.route("/conf/hat/<hat_id>", methods=['DELETE'])
def hat_remove(hat_id):
    app.logger.debug("/conf/hat/{}".format(hat_id))
    global hats
    for i,hat in enumerate(hats):
        if hat.id == int(hat_id):
            del hats[i]
            return flask.Response(get_hats(), content_type='application/json')
    return flask.Response(get_hats(), 400, content_type='application/json')

def get_servos():
    global servos
    servosStr = '{"servos": ['
    for servo in servos:
        servosStr += '\n\t' + servo.to_JSON()
        servosStr += ','
    if servos:
        servosStr = servosStr[:-1]
    servosStr += '\n] }'
    return servosStr

# returns current servo configuration
@app.route("/conf/servos", methods=['GET'])
def servo_list():
    app.logger.debug("/conf/servos")
    return flask.Response(get_servos(), content_type='application/json')

# adds a new servo to the current configuration
@app.route("/conf/servo", methods=['POST'])
def servo_add():
    app.logger.debug("/conf/servo :\n{}".format(flask.request.json))
    global servos
    global hats
    servoRequest = flask.request.json
    servoId = servoRequest['id']
    hatId = servoRequest['hat']
    channel = servoRequest['channel']
    initDeg = servoRequest['init_deg']
    rotateToDeg = servoRequest['rotate_to_deg']

    for servo in servos:
        if servo.id == servoId or (hatId == servo.hat.id and channel == servo.channel):
            return flask.Response(get_servos(), 400, content_type='application/json')

    for hat in hats:
        if hatId == hat.id:
            s = Servo(hatId, hat, channel, initDeg, rotateToDeg)
            s.initServo()
            servos.append(s)
            return flask.Response(get_servos(), 201, content_type='application/json')

    return flask.Response(get_hats(), 400, content_type='application/json')

# gets an individual servo
@app.route("/conf/servo/<servo_id>", methods=['GET'])
def get_servo(servo_id):
    app.logger.debug("/conf/servo/{}".format(servo_id))
    global servos
    for servo in servos:
        if servo.id == int(servo_id):
            return flask.Response(str(servo.to_JSON()), content_type='application/json')
    err = "no servo found with the id [{}]".format(servo_id)
    app.logger.debug(err)
    return page_not_found(err)

# removes a servo
@app.route("/conf/servo/<servo_id>", methods=['DELETE'])
def servo_remove(servo_id):
    app.logger.debug("/conf/servo/{}".format(servo_id))
    global servos
    for i,servo in enumerate(servos):
        if servo.id == int(servo_id):
            del servos[i]
            return flask.Response(get_servos(), content_type='application/json')
    return flask.Response(get_servos(), 400, content_type='application/json')


# ERROR HANDLING

@app.errorhandler(404)
def page_not_found(error):
    return 'This page does not exist', 404

@app.errorhandler(500)
def application_exception_handler(error):
    return 'Internal error occurred', 500


# starts the app
def start():

    CORS(app)
    app.debug = True
    app.run(host='0.0.0.0')