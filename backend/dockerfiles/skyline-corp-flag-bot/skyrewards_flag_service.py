import requests
from flask import Flask, request, jsonify

app = Flask(__name__)


def inject_flag(target_host, flag, password):
    """
    sends a POST request to the SkyRewards admin endpoint
    to update the flag.
    """
    url = f"http://{target_host}:5000/admin/update_flag"
    headers = {"X-API-KEY": password}
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
    API endpoint. Expects JSON:
    {"ip": "...", "flag": "...", "password": "..."}
    """
    data = request.get_json()

    # Check for all required fields including 'password'
    required_fields = ["ip", "flag", "password"]
    if not data or not all(field in data for field in required_fields):
        return (
            jsonify({"status": "error", "message": "Missing required parameters"}),
            400,
        )

    ip = data["ip"]
    flag = data["flag"]
    password = data["password"]

    result = inject_flag(ip, flag, password)

    if result == "SUCCESS":
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "failure", "message": result})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8082)
