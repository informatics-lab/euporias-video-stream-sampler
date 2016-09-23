import sys
import flask
from flask_cors import CORS, cross_origin
import multiprocessing as mp
from PotStriker import Hat
from PotStriker import Servo

app = flask.Flask(__name__)
hats = []
servos = []

def trigger(servo):
    servo.triggerServo()

def set_up(servo):
    servo.initServo()

def test(i):
    print i

@app.route("/")
def hello():
    return "pot striking server is running"

@app.route("/strike", methods=['POST'])
def strike():
    app.logger.debug(flask.request.json)
    strikeArray = flask.request.json
    servosToStrike = [servos[i] for i in strikeArray]
    print str(servosToStrike)
    for servo in servosToStrike:
        p = mp.Process(target=trigger, args=(servo,))
        p.start()
    p.join()

    return "striker!!"

@app.route("/conf/hats")
def hat_conf():
    return "hat conf:"

@app.route("/conf/servos")
def servo_conf():
    return "servo conf:"

@app.errorhandler(404)
def page_not_found(error):
    return 'This page does not exist', 404

@app.errorhandler(500)
def application_exception_handler(error):
    return 'Internal error occurred', 500

def start():

    # init hats and servos here and populate servo list
    h0 = Hat()
    hats.append(h0)
    servos.append(Servo(h0))
    servos.append(Servo(h0, 2))

    for servo in servos:
        p = mp.Process(target=set_up, args=(servo,))
        p.start()
    p.join()

    CORS(app)
    app.debug = True
    app.run(host='0.0.0.0')