import os
import sys
import json
import requests
from dotenv import load_dotenv

def check_env():
  script_dir = os.path.dirname(os.path.realpath(__file__))
  print("Script directory:", script_dir)
  
  env_file_path = os.path.join(script_dir, ".env")
  print("Env file path:", env_file_path)
  
  if not os.path.exists(env_file_path):
    print("No .env file found: ensure root directory contains a .env file")
    sys.exit(1)

def main():
  check_env()
  load_dotenv()  # Load environment variables from .env file
  
  SITE_URL = "http://18.188.200.155/"
  BASE_URL = 'http://dl-berlin.ecn.purdue.edu:8000'
  register_body = {
    "group": 8,
    "github": "https://github.com/FA2024-ECE-461-Project/Phase2-Code/",
    "names": [
        "Jimmy Ho", "Gaurav Vermani", "Ryan Lin", "Nick Ko"
    ],
    "gh_token": os.getenv("GITHUB_TOKEN"),
    "endpoint": f"{SITE_URL}/api",
    "fe_endpoint": SITE_URL
  }

  # Convert the dictionary to a JSON string
  register_body_json = json.dumps(register_body)

  # register
  print("registering...")
  print("Register body JSON:", register_body_json)
  response = requests.post(f"{BASE_URL}/register", headers={'Content-Type': 'application/json'}, data=register_body_json)
  print("Response status code:", response.status_code)
  print("Response body:", response.text)
  print("end registering")

  # schedule a run
  print("scheduling a run...")
  schedule_body = {k: v for k, v in register_body.items() if k == 'group' or k == 'gh_token'}
  schedule_body_json = json.dumps(schedule_body)
  response = requests.post(f"{BASE_URL}/schedule", headers={'Content-Type': 'application/json'}, data=schedule_body_json)
  print("Response status code:", response.status_code)
  print("Response body:", response.text)
  print("end scheduling a run")

  # get the latest score
  print("getting the results...")
  response = requests.get(f"{BASE_URL}/last_run", 
                          headers={'Content-Type': 'application/json'},
                          data=schedule_body_json)
  print("Response status code:", response.status_code)
  # write response payload to a file as formatted json
  with open("autograder_log.txt", "w") as file:
    file.write(json.dumps(json.loads(response.text), indent=4))
  print("end getting latest score")

  # get best score
  # print("getting the results...")
  # response = requests.get(f"{BASE_URL}/best_run", 
  #                         headers={'Content-Type': 'application/json'},
  #                         data=schedule_body_json)
  # print("Response status code:", response.status_code)
  # print("Response body:", response.text)
  # print("end getting latest score")

  print("download autgrader_run_log.txt...")
  schedule_body["log"] = json.loads(response.text)["autgrader_run_log"]

  response = requests.get(f"{BASE_URL}/log/download", 
                          headers={'Content-Type': 'application/json'},
                          data=json.dumps(schedule_body))

  print("Response status code:", response.status_code)

  with open("autograder_run_log.txt", "wb") as file:
    file.write(response.content)

  print("end download autgrader_run_log.txt")


if __name__ == "__main__":
  main()