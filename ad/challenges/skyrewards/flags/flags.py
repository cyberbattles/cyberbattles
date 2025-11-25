import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# Utilise a token from docker env for auth
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")

def inject_flag(target_host, port, flag):
    """
    sends a POST request to the SkyRewards admin endpoint 
    to update the flag.
    """
    url = f"http://{target_host}:{port}/admin/update_flag"
    headers = {"X-API-KEY": ADMIN_TOKEN}
    payload = {"flag": flag}

    try:
        # Send request
        response = requests.post(url, data=payload, headers=headers, timeout=5)
        
        # Check if it worked
        if response.status_code == 200:
            return "SUCCESS"
        else:
            return "FAILURE"

    except requests.exceptions.RequestException as e:
        return f"Error: {e}"

@app.route("/inject", methods=["POST"])
def inject():
    """
    This is the API endpoint. It expects a POST request with a JSON body
    containing 'ip', 'port', and 'flag'.
    """
    data = request.get_json()
    if not data or "ip" not in data or "port" not in data or "flag" not in data:
        return (
            jsonify({"status": "error", "message": "Missing required parameters"}),
            400,
        )

    ip = data["ip"]
    port = data["port"]
    flag = data["flag"]

    result = inject_flag(ip, port, flag)

    if result == "SUCCESS":
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "failure", "message": result})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)