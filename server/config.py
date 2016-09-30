import sys
sys.path.append('./src')

import json
import httplib


def make_request(conn, method, url, headers, body):
    conn.request(method, url, json.dumps(body), headers)
    response = connection.getresponse()
    if not str(response.status)[0] == 2:
        print >> sys.stderr, "{} error making request:\nHeaders:\n{}\nBody:\n{}\n\nError message:\n{}\n"\
            .format(response.status, headers, body, response.reason)

if __name__ == '__main__':
    confFile = "./configuration.json"
    print "configuring pot striking server with {}".format(confFile)
    with open(confFile, 'r') as cf:
        conf = json.load(cf)
        connection = httplib.HTTPConnection("localhost:5000")
        for req in conf['configuration']:
            make_request(connection, req['method'], req['url'], req['headers'], req['body'])
        connection.close()
    print "finished configuration - have a nice day!"
