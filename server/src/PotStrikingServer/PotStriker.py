import Adafruit_PCA9685
import time
import json

class Servo(object):

    SERVO_MIN_DEG = -90     # max CCW rotation of servo in degrees
    SERVO_MAX_DEG = 90      # max CW rotation of servo in degrees
    SERVO_MIN_PULSE = 150   # pulse width that sets the servo to +90 degrees
    SERVO_MAX_PULSE = 600   # pulse width that sets the servo to -90 degrees
    SERVO_T = 0.73/180      # time taken for servo to rotate 1 degree

    def __init__(self, id, hat, channel=0, init_deg=-45, rotate_to_deg=50):
        """
        Constructor for a single servo object

        args:
            * id: Unique id for this servo
            * hat: Hat object where servo is connected
            * channel: Channel on hat that servo is connected to (0 - 15)
            * init_deg: degrees at which servo init position lies
            * rotate_to_deg: degrees to which servo should rotate to when triggered
        """
        self.id = id
        self.hat = hat
        self.channel = channel
        self.init_deg=init_deg
        self.rotate_to_deg=rotate_to_deg
        self.initPosPulseWidth = self.degToPulseWidth(init_deg)
        self.deflectToPosPulseWidth = self.degToPulseWidth(rotate_to_deg - 20)
        self.rotateToPosPulseWidth = self.degToPulseWidth(rotate_to_deg)
        self.rotateTime = self.timeToRotate(init_deg, rotate_to_deg)


    def degToPulseWidth(self, deg):
        if (deg >= self.SERVO_MIN_DEG and deg <= self.SERVO_MAX_DEG):
            return (deg - self.SERVO_MIN_DEG) * (self.SERVO_MIN_PULSE - self.SERVO_MAX_PULSE) / (self.SERVO_MAX_DEG - self.SERVO_MIN_DEG) + self.SERVO_MAX_PULSE

    def timeToRotate(self, degOldPos, degNewPos):
        diff = abs(degOldPos - degNewPos)
        return diff * self.SERVO_T

    def initServo(self):
        print "hat.id " + str(self.hat.id)
        print "init " + str(self.channel)
        self.hat.pwm.set_pwm(self.channel, 0, self.initPosPulseWidth)
        time.sleep(1)

    def triggerServo(self):
        print "Chan " + str(self.channel)
        print "RTW " + str (self.rotateToPosPulseWidth)
        self.hat.pwm.set_pwm(self.channel, 0, self.rotateToPosPulseWidth)
        time.sleep(self.rotateTime)
        self.hat.pwm.set_pwm(self.channel, 0, self.deflectToPosPulseWidth)
        time.sleep(1)
        self.hat.pwm.set_pwm(self.channel, 0, self.initPosPulseWidth)

    def to_dict(self):
        return {
            "id": self.id,
            "hat": self.hat.to_dict(),
            "channel": self.channel,
            "init_deg": self.init_deg,
            "rotate_to_deg": self.rotate_to_deg
        }

    def to_JSON(self):
        return json.dumps(self.to_dict())

    def __repr__(self):
        return self.to_dict()

class Hat(object):

    PWM_FREQ = 50           # default servo hat freq (Hz)

    def __init__(self, id=0, address=0x40):
        """
        Constructor for a single servo hat object

        args:
            * address: Hat binary address (0x40 : default address)
        """
        self.id = id
        self.addressStr = '0x%02X' % address
        # Initialise the PWM device using the address
        self.pwm = Adafruit_PCA9685.PCA9685(address)
        # Note if you'd like more debug output you can instead run:
        #pwm = PWM(address, debug=True)
        self.pwm.set_pwm_freq(self.PWM_FREQ)

    def to_dict(self):
        return {
            'id' : self.id,
            'address': self.addressStr
        }

    def to_JSON(self):
        return json.dumps(self.to_dict())

    def __repr__(self):
        return self.to_dict()
