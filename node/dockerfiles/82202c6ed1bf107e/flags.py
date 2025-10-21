# This is a flag injection script for the CyberNote challenge.
# It now runs as a Flask web server to handle API requests.

import requests
import sys
import hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)


def inject_flag(ip, port, flag):
    """
    This function contains the original flag injection logic.
    It takes ip, port, and flag as arguments and returns the result.
    """
    base_url = f"http://{ip}:{port}"
    flagHash = hashlib.md5(flag.encode()).hexdigest()[:10]
    credentials = {"user": flagHash, "passwd": flagHash}

    with requests.Session() as s:
        try:
            # Sign up
            signupResp = s.post(f"{base_url}/signup", data=credentials, timeout=5)
            signupResp.raise_for_status()

            # Post the note
            noteResp = s.post(f"{base_url}/note", data={"note": flag}, timeout=5)
            noteResp.raise_for_status()

            # Verify note
            homeResp = s.get(f"{base_url}/home", timeout=5)
            homeResp.raise_for_status()

            if flag in homeResp.text:
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
    # This will run the Flask development server.
    app.run(host="0.0.0.0", port=8080)

