import Adafruit_PCA9685
import time

class Servo(object):

    SERVO_MIN_DEG = -90     # max CCW rotation of servo in degrees
    SERVO_MAX_DEG = 90      # max CW rotation of servo in degrees
    SERVO_MIN_PULSE = 150   # pulse width that sets the servo to +90 degrees
    SERVO_MAX_PULSE = 600   # pulse width that sets the servo to -90 degrees
    SERVO_T = 0.73/180      # time taken for servo to rotate 1 degree

    def __init__(self, hat, channel=0, init_deg=-45, rotate_to_deg=80):
        """
        Constructor for a single servo object

        args:
            * hat: Hat object where servo is connected
            * channel: Channel on hat that servo is connected to
            * init_deg: degrees at which servo init position lies
            * rotate_to_deg: degrees to which servo should rotate to when triggered
        """
        self.channel = channel
        self.initPosPulseWidth = self.degToPulseWidth(init_deg)
        self.rotateToPosPulseWidth = self.degToPulseWidth(rotate_to_deg)
        self.rotateTime = self.timeToRotate(init_deg, rotate_to_deg)
        self.hat = hat

    def degToPulseWidth(self, deg):
        if (deg >= self.SERVO_MIN_DEG and deg <= self.SERVO_MAX_DEG):
            return (deg - self.SERVO_MIN_DEG) * (self.SERVO_MIN_PULSE - self.SERVO_MAX_PULSE) / (self.SERVO_MAX_DEG - self.SERVO_MIN_DEG) + self.SERVO_MAX_PULSE

    def timeToRotate(self, degOldPos, degNewPos):
        diff = abs(degOldPos - degNewPos)
        return diff * self.SERVO_T

    def initServo(self):
        self.hat.pwm.set_pwm(self.channel, 0, self.initPosPulseWidth)
        time.sleep(1)

    def triggerServo(self):
        self.hat.pwm.set_pwm(self.channel, 0, self.rotateToPosPulseWidth)
        time.sleep(self.rotateTime)
        self.hat.pwm.set_pwm(self.channel, 0, self.initPosPulseWidth)


class Hat(object):

    PWM_FREQ = 50           # default servo hat freq (Hz)

    def __init__(self, address=0x40):
        """
        Constructor for a single servo hat object

        args:
            * address: Hat binary address (0x40 : default address)
        """
        # Initialise the PWM device using the address
        self.pwm = Adafruit_PCA9685.PCA9685(address)
        # Note if you'd like more debug output you can instead run:
        #pwm = PWM(address, debug=True)
        self.pwm.set_pwm_freq(self.PWM_FREQ)