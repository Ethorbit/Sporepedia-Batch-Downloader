#!/bin/python3
import os
import argparse
import requests
import re
import json
import time

parser = argparse.ArgumentParser(description='Downloads random creations from Sporepedia over and over until you are satisfied.')
parser.add_argument('-d', '--dir', type=str, help='Directory path to where you want to save the downloaded creations at.')
parser.add_argument('-a', '--amount', type=int, default=10000000, help='Amount of creations to download before stopping.')
args = parser.parse_args()

if (not isinstance(args.dir, str)):
    print("Please specify the directory you want images to save to (-d)")
    exit()
else:
    if (not os.path.exists(args.dir)):
        print("The specified directory (-d) doesn't exist.")
        exit()

print(f'Program will stop when interrupted or after {args.amount} random creations have downloaded.')

api_url           = 'http://www.spore.com/jsserv/call/plaincall/assetService.listAssets.dwr'
static_img_url    = 'http://static.spore.com/static/thumb'
cookie_jar        = requests.cookies.RequestsCookieJar()
batch_size        = 1000
timeout_secs      = 5
downloads         = 0
http_session_id   = None
script_session_id = None

while True:
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
    
    try:
        response = requests.post(
            api_url, 
            data = request_data, 
            headers = { 'Content-Type': 'text/javascript;charset=utf-8' },
            cookies = cookie_jar
        )

        cookie_jar = response.cookies
        
        # Extract keys and values from the API's DWR response and assemble it into an easily parseable array:
        dwr_response_segments = response.text.split(';')
        dwr_data              = {}
        dwr_last_element_data = {}
        dwr_last_element_id   = None
        for i in range(0, len(dwr_response_segments), 1):
            key_value_pairs = dwr_response_segments[i].split('=')
            if (len(key_value_pairs) >= 2):
                key   = key_value_pairs[0]
                value = key_value_pairs[1]
                element_id_match = re.search('([a-z][0-9]*\.)', key)
                if (element_id_match):
                    element_id = element_id_match.group()
                    key = key.replace(element_id_match.group(), '')
                    
                    # Check if we've iterated to a new item and act accordingly
                    if (element_id != dwr_last_element_id):
                        if ('id' in dwr_last_element_data):
                            dwr_data[dwr_last_element_data['id']] = dwr_last_element_data
                        
                        dwr_last_element_id = element_id
                        dwr_last_element_data = {}
                    else:
                        dwr_last_element_data[key] = value
    
        # Print and download each creation:
        for id, data in dwr_data.items():
            if ('avatarImage' in data):
                image_pattern = re.compile(r'(thumb)')
                image_match = image_pattern.search(data['avatarImage'])
                if (image_match):
                    # Format avatarImage into a valid downloadable image
                    image = data['avatarImage'].replace(image_match.group(), '').replace('\\', '').replace('\"', '')
                    image_extension_match = re.search(r'(\.[A-z]*)$', image)
                    if (image_extension_match):
                        image_extension = image_extension_match.group()
                        #image = image.replace(image_extension, f'_lrg{image_extension}')
                        image_url = static_img_url + image
                        print(json.dumps(data, indent=4))
                        print(f'Downloading {image_url}')
                        if (downloads >= args.amount):
                            print(f'Finished downloading {args.amount} creations.')
                            exit()

                        image_destination = f'{args.dir}/{id}{image_extension}'
                        if (not os.path.exists(image_destination)):
                            try:
                                image_response = requests.get(image_url)
                                if (image_response.ok):
                                    with open(image_destination, 'wb') as fd:
                                        for chunk in image_response.iter_content(chunk_size=128):
                                            fd.write(chunk)
                            
                                downloads += 1
                                time.sleep(0.5)
                            except Exception as err:
                                print(f'There was an error downloading that. - {err}')
                                time.sleep(0.5)
                        else:
                            print(f'{image_destination} already exists.')
    except Exception as err:
        print(f'Error trying to fetch creations from the Sporepedia API. - {err}')
  
    time.sleep(timeout_secs)
