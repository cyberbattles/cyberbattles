import os
import threading
import time
from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_key')
# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/skyrewards.db'
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'instance', 'skyrewards.db')

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- MODELS ---

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    # All users start with 10,000 points
    points = db.Column(db.Integer, default=10000) 

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    is_flag = db.Column(db.Boolean, default=False)

# --- BACKGROUND FRAUD DAEMON (Method 1) ---
# In a real CTF, this would be an external script or cron job.
# For this standalone service, we run it as a background thread.
def fraud_daemon():
    """
    Runs every 60 seconds.
    Checks for users with suspicious balances (over 500,000)
    and resets them to 10,000 to prevent hoarding.
    """
    while True:
        time.sleep(60)
        with app.app_context():
            try:
                # Anyone with enough to buy the flag halfway gets wiped
                suspicious_users = User.query.filter(User.points > 500000).all()
                if suspicious_users:
                    print(f"[FRAUD DAEMON] Detected {len(suspicious_users)} suspicious accounts. Resetting...")
                    for user in suspicious_users:
                        user.points = 10000
                    db.session.commit()
            except Exception as e:
                print(f"[FRAUD DAEMON ERROR] {e}")

# Start the daemon
daemon_thread = threading.Thread(target=fraud_daemon, daemon=True)
daemon_thread.start()

# --- ROUTES ---

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        action = request.form['action']

        if action == 'register':
            if User.query.filter_by(username=username).first():
                flash('Username already exists.')
            else:
                new_user = User(username=username, password=generate_password_hash(password))
                db.session.add(new_user)
                db.session.commit()
                flash('Account created! Please login.')
        
        elif action == 'login':
            user = User.query.filter_by(username=username).first()
            if user and check_password_hash(user.password, password):
                session['user_id'] = user.id
                session['username'] = user.username
                return redirect(url_for('dashboard'))
            else:
                flash('Invalid credentials.')

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user = User.query.get(session['user_id'])
    return render_template('dashboard.html', user=user)

@app.route('/faq')
def faq():
    return render_template('faq.html')

@app.route('/transfer', methods=['POST'])
def transfer():
    """
    VULNERABLE ENDPOINT
    Vulnerability: Logic Error / Integer Underflow intent.
    The code does not check if 'amount' is positive.
    Sending -1,000,000 results in:
    Sender = Sender - (-1M) = Sender + 1M
    Receiver = Receiver + (-1M) = Receiver - 1M
    """
    if 'user_id' not in session:
        return redirect(url_for('login'))

    try:
        recipient_name = request.form['recipient']
        amount = int(request.form['amount'])
        
        sender = User.query.get(session['user_id'])
        recipient = User.query.filter_by(username=recipient_name).first()

        if not recipient:
            flash('Recipient not found.')
            return redirect(url_for('dashboard'))
        
        if sender.id == recipient.id:
            flash('Cannot transfer to yourself.')
            return redirect(url_for('dashboard'))

        # --- VULNERABILITY IS HERE ---
        # MISSING: if amount < 0: return error
        
        # Basic check for positive balance flow, but flawed math for negatives
        if sender.points < amount: 
            flash('Insufficient points.')
            return redirect(url_for('dashboard'))

        # Perform Transfer
        sender.points -= amount
        recipient.points += amount
        
        db.session.commit()
        flash(f'Successfully transferred {amount} points to {recipient_name}.')
        
    except ValueError:
        flash('Invalid amount.')

    return redirect(url_for('dashboard'))

@app.route('/store')
def store():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user = User.query.get(session['user_id'])
    products = Product.query.all()
    return render_template('store.html', products=products, user=user)

@app.route('/buy/<int:product_id>', methods=['POST'])
def buy(product_id):
    """
    ANTI-HOARDING MECHANIC (Method 2)
    If the user buys the flag, they are bankrupted to 0 points.
    """
    if 'user_id' not in session:
        return redirect(url_for('login'))

    user = User.query.get(session['user_id'])
    product = Product.query.get(product_id)

    if not product:
        return "Product not found", 404

    if user.points >= product.price:
        msg = ""
        if product.is_flag:
            # REVEAL FLAG
            flag_content = os.environ.get('FLAG', 'CTF{test_flag}')
            msg = f"ACCESS GRANTED. SECRET CODE: {flag_content}"
            
            # METHOD 2: BANKRUPTCY
            # Reset points to 0 to prevent hoarding
            user.points = 0
            flash("VIP Purchase Complete. Your loyalty balance has been reset to 0.")
        else:
            user.points -= product.price
            msg = f"You purchased {product.name}!"
            flash(msg)
            
        db.session.commit()
        return render_template('store_success.html', message=msg)
    else:
        flash("Insufficient Points! You need more loyalty points.")
        return redirect(url_for('store'))

# --- INITIALIZATION ---
def init_db():
    with app.app_context():
        db.create_all()
        if not Product.query.first():
            # Seed Items
            items = [
                Product(name="Economy Comfort Upgrade", description="Legroom is a luxury.", price=5000),
                Product(name="Lounge Access (Day Pass)", description="Free pretzels and Wi-Fi.", price=15000),
                Product(name="Priority Boarding", description="Get on the plane first.", price=20000),
                Product(name="PLATINUM VIP ACCESS", description="Contains the Flag.", price=1000000, is_flag=True)
            ]
            db.session.add_all(items)
            # Seed a dummy target for transfer testing
            db.session.add(User(username="admin", password=generate_password_hash("admin"), points=100))
            db.session.commit()

if __name__ == '__main__':
    if not os.path.exists('instance'):
        os.makedirs('instance')
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False)