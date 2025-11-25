import socket
import re
from time import sleep
from random import randint
from flask import Flask, request, jsonify


app = Flask(__name__)


def inject_flag(ip, flag, password):
    """
    Connects to a raw TCP service to inject and then verify a flag.
    Flow: Connect -> Consume Banner -> Login -> Send -> Disconnect...
    """
    BUFFER_SIZE = 4096
    SERVER_ADDR = (ip, 9999)

    try:
        note_id = None

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(5)
            s.connect(SERVER_ADDR)

            # Consume the Welcome Banner
            banner = s.recv(BUFFER_SIZE).decode()
            if "220" not in banner:
                print(f"Warning: Unexpected banner: {banner}")

            # Login
            login_cmd = f"LOGIN admin {password}\n"
            s.sendall(login_cmd.encode())

            # Check Login Response
            login_resp = s.recv(BUFFER_SIZE).decode()
            if "200" not in login_resp:
                return f"FAILURE: Login rejected. Got: {login_resp.strip()}"

            # Send Flag
            send_cmd = f"SEND admin {flag}\n"
            s.sendall(send_cmd.encode())

            # Receive Response and Extract ID
            response = s.recv(BUFFER_SIZE).decode()
            match = re.search(r"\(ID: (.*?)\)", response)
            if match:
                note_id = match.group(1)
            else:
                return f"FAILURE: Could not extract ID. Server said: {response.strip()}"

        # Sleep for a random duration to prevent fingerprinting
        sleep(randint(1, 10))

        # Verify flag by reading the email back
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(5)
            s.connect(SERVER_ADDR)

            # Consume Banner again for the new connection
            s.recv(BUFFER_SIZE)

            # Login again
            login_cmd = f"LOGIN admin {password}\n"
            s.sendall(login_cmd.encode())

            if "200" not in s.recv(BUFFER_SIZE).decode():
                return "FAILURE: Login rejected during verification."

            # Read and verify
            read_cmd = f"READ {note_id}\n"
            s.sendall(read_cmd.encode())
            read_response = s.recv(BUFFER_SIZE).decode()

            if flag in read_response:
                return "SUCCESS"
            else:
                return f"FAILURE: Flag not found. Got: {read_response.strip()}"

    except socket.timeout:
        return "Error: Connection timed out."
    except ConnectionRefusedError:
        return "Error: Connection refused. Check IP/Port."
    except Exception as e:
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
    app.run(host="0.0.0.0", port=8080)
