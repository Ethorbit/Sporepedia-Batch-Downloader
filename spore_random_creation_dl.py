#!/bin/python3
import argparse
import requests
import time

parser = argparse.ArgumentParser(description='Downloads random creations from Sporepedia over and over until you are satisfied.')
parser.add_argument('-a', '--amount', type=int, default=10000000, help='Amount of creations to download before stopping.')
args = parser.parse_args()

print(f'Program will stop when interrupted or after {args.amount} random creations have downloaded.')

api_url           = 'http://www.spore.com/jsserv/call/plaincall/assetService.listAssets.dwr'
cookie_jar        = requests.cookies.RequestsCookieJar()
batch_size        = 20
timeout_secs      = 4
downloads         = 0
http_session_id   = None
script_session_id = None

def download_batch():
    global cookie_jar
    global http_session_id
    global script_session_id
    
    request_data = {
        'callCount': 1,
        'c0-scriptName': 'assetService',
        'c0-methodName': 'listAssets',
        'c0-id': 0,
        'c0-e1': 'string:RANDOM',
        'c0-e2': 'number:0',
        'c0-e3': f'number:{batch_size}',
        'c0-param0': 'Object_Object:{view:reference:c0-e1, index:reference:c0-e2, count:reference:c0-e3}',
        'batchId': 6
    }

    cookie_list = list(cookie_jar.items())
    if (len(cookie_list) >= 2):
        http_session_id = cookie_list[0][1]
        script_session_id = cookie_list[0][1]
  
    request_data['httpSessionId'] = http_session_id
    request_data['scriptSessionId'] = script_session_id
  
    request = requests.post(
        api_url, 
        data = request_data, 
        headers = { 'Content-Type': 'text/javascript;charset=utf-8' },
        cookies = cookie_jar
    )

    cookie_jar = request.cookies
    
    print(request.content)

    # TODO: add check for downloads exceeding args.amount during thumbnail download loop

    time.sleep(timeout_secs)
    download_batch()
download_batch()

