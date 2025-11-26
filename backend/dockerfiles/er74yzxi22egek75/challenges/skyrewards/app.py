import os
import secrets
import threading
import time
from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("ADMIN_PASS", "supersecretkey")
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, "instance", "skyrewards.db")

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + db_path
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

ADMIN_TOKEN = os.environ.get("ADMIN_PASS")
CURRENT_FLAG = os.environ.get("FLAG", "SKY{default_flag}")


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    # 10k Starting points
    points = db.Column(db.Integer, default=10000)


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    is_flag = db.Column(db.Boolean, default=False)


def fraud_daemon():
    """
    Runs every 60 seconds.
    Checks for balances over 2m and resets them to 10k.
    """
    while True:
        time.sleep(60)
        with app.app_context():
            try:
                suspicious_users = User.query.filter(
                    User.points > 2000000, User.points < 0
                ).all()
                if suspicious_users:
                    print(f"Fraud daemon found suspicious accounts. Resetting points.")
                    for user in suspicious_users:
                        user.points = 10000
                    db.session.commit()
            except Exception as e:
                print(f"Fraud daemon error: {e}")


daemon_thread = threading.Thread(target=fraud_daemon, daemon=True)
daemon_thread.start()


@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        action = request.form["action"]

        if action == "register":
            if User.query.filter_by(username=username).first():
                flash("Username already exists.")
            else:
                new_user = User(
                    username=username, password=generate_password_hash(password)
                )
                db.session.add(new_user)
                db.session.commit()
                flash("Account created! Please login.")

        elif action == "login":
            user = User.query.filter_by(username=username).first()
            if user and check_password_hash(user.password, password):
                session["user_id"] = user.id
                session["username"] = user.username
                return redirect(url_for("dashboard"))
            else:
                flash("Invalid credentials.")

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.pop("user_id", None)
    session.pop("username", None)
    return redirect(url_for("login"))


@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("login"))

    user = db.session.get(User, session["user_id"])

    if not user:
        session.clear()
        return redirect(url_for("login"))

    return render_template("dashboard.html", user=user)


@app.route("/faq")
def faq():
    return render_template("faq.html")


@app.route("/transfer", methods=["POST"])
def transfer():
    """
    Transfer points to another user.
    """
    if "user_id" not in session:
        return redirect(url_for("login"))

    try:
        recipient_name = request.form["recipient"]
        amount = int(request.form["amount"])

        sender = User.query.get(session["user_id"])
        recipient = User.query.filter_by(username=recipient_name).first()

        MAX_TRANSFER = 1_000_000_000_000
        MIN_TRANSFER = -1_000_000_000_000

        if amount > MAX_TRANSFER:
            flash(f"Transfer amount exceeds maximum limit of {MAX_TRANSFER} points.")
            return redirect(url_for("dashboard"))

        if amount < MIN_TRANSFER:
            flash(f"Transfer amount must be at least {MIN_TRANSFER} points.")
            return redirect(url_for("dashboard"))

        if not recipient:
            sender.points -= amount

        elif sender.id == recipient.id:
            flash("Cannot transfer to yourself.")
            return redirect(url_for("dashboard"))
        else:
            recipient.points += amount
            sender.points -= amount

        db.session.commit()
        flash(f"Successfully transferred {amount} points to {recipient_name}.")

    except ValueError:
        flash("Invalid amount.")

    return redirect(url_for("dashboard"))


@app.route("/store")
def store():
    if "user_id" not in session:
        return redirect(url_for("login"))

    user = User.query.get(session["user_id"])
    products = Product.query.all()
    return render_template("store.html", products=products, user=user)


@app.route("/buy/<int:product_id>", methods=["POST"])
def buy(product_id):
    """
    Doubly makes sure users can't hoard points
    to buy the flag multiple times.
    Simply resets balance on flag purchase.
    """
    if "user_id" not in session:
        return redirect(url_for("login"))

    user = User.query.get(session["user_id"])
    if not user:
        flash("User not found. Please login.")
        session.pop("user_id", None)
        session.pop("username", None)
        return redirect(url_for("login"))

    product = Product.query.get(product_id)

    if not product:
        return "Product not found", 404

    if user.points >= product.price:
        if product.is_flag:
            # Reveal flag and reset balance to prevent repeat purchases
            msg = f"ACCESS GRANTED. SECRET CODE: {CURRENT_FLAG}"
            user.points = 10000
            flash("VIP Purchase Complete. Your balance has been reset to 10,000.")
            db.session.commit()
            return render_template("success_platinum.html", flag=CURRENT_FLAG)
        else:
            user.points -= product.price
            db.session.commit()
            flash(f"You purchased {product.name}!")
            return redirect(url_for("success", product_name=product.name))
    else:
        return "Insufficient SkyPoints", 403


@app.route("/admin/update_flag", methods=["POST"])
def admin_update_flag():
    """
    Updates flag, requires ADMIN_TOKEN in X-API-KEY header.
    """
    global CURRENT_FLAG

    # Check auth
    request_key = request.headers.get("X-API-KEY")
    if (
        not request_key
        or not ADMIN_TOKEN
        or not secrets.compare_digest(request_key, ADMIN_TOKEN)
    ):
        return "UNAUTHORISED", 401

    new_flag = request.form.get("flag")
    if not new_flag:
        return "No flag", 400

    # Update current flag
    CURRENT_FLAG = new_flag

    return "SUCCESS", 200


def init_db():
    with app.app_context():
        db.create_all()
        if not Product.query.first():
            items = [
                Product(
                    name="Business Class Upgrade",
                    description="Fly in luxury.",
                    price=5000,
                ),
                Product(
                    name="Lounge Access (Day Pass)",
                    description="Treat yourself to refreshments on us.",
                    price=15000,
                ),
                Product(
                    name="Priority Boarding",
                    description="Get on the plane first.",
                    price=20000,
                ),
                Product(
                    name="PLATINUM VIP ACCESS",
                    description="Get your exclusive access token to our VIP memebership",
                    price=1000000,
                    is_flag=True,
                ),
            ]
            db.session.add_all(items)
            # Create default root user
            db.session.add(
                User(username="root", password=generate_password_hash("root"), points=1)
            )
            db.session.commit()


@app.route("/success/<path:product_name>")
def success(product_name):
    """
    Redirects to success pages after purchase.
    """
    product = Product.query.filter_by(name=product_name).first()
    if not product:
        return redirect(url_for("store"))

    if product.is_flag:
        return render_template("success_platinum.html", flag=CURRENT_FLAG)

    message = (
        f"Thank you for your purchase of {product.name}. "
        "Please see one of our friendly staff at the airport to complete pickup."
    )
    return render_template("success.html", message=message)


if __name__ == "__main__":
    if not os.path.exists("instance"):
        os.makedirs("instance")
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=False)
