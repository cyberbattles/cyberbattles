from typing import Required
from flask import Flask, redirect, render_template_string, request, template_rendered, url_for, make_response, jsonify
import sqlite3
import os

app = Flask(__name__)

DB_PATH = "./database.db"

def getDb():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db

def checkUserCookie():
    username = request.cookies.get("username")

    if not username:
        return False
    
    sql = "SELECT id FROM users WHERE id = ?"
    con = getDb()
    cur = con.cursor()
    result = cur.execute(sql, [username]).fetchone()
    con.close()
    
    return result is not None

@app.route("/")
def main():
    if checkUserCookie():
        return redirect(url_for('home'))

    return render_template_string("""
        <h2> Welcome to cybernote. login to view your note </h2>
        <a href="/login"><button type=button> Login </button></a>
        <a href="/signup"><button type=button> Signup </button></a>
    """)

@app.route("/login")
def loginPage():
    return render_template_string("""
        <h1>Login</h1>

        <form action="/home" method="post"> 
            <label>User: <label>
            <input type=text name="user"><br>
            <label>Password: </lable>
            <input type=text name=passwd><br>
            <input type="submit" name="login" value="Login"> 
            <a href="/">back</a>
        </form>
    """)

@app.route("/signup", methods=["POST", "GET"])
def signupPage():
    if request.method == "POST":
        user = request.form.get("user")
        passwd = request.form.get("passwd")

        sql = "SELECT id FROM users WHERE id = ?"
        con = getDb()
        cur = con.cursor()
        existing_user = cur.execute(sql, [user]).fetchone()
        
        if existing_user:
            con.close()
            return """
                <p>User already exists.</p>
                <a href="/signup"><button type="button">back</button></a>
            """

        # TODO check valid character 
        whitelist = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_"
        
        if not all(c in whitelist for c in user):
            con.close()
            return """
                <p>Username must be letters, ('-' and '_' are allowed)</p>
                <a href="/signup"><button type="button">back</button></a>
            """

        sql = "insert into users (id, passwd, note) values (?, ?, ?)"
        cur.execute(sql, [user, passwd, ""])
        con.commit()
        con.close()

        response = make_response(redirect(url_for('home')))
        response.set_cookie("username", user)
        response.set_cookie("password", passwd)

        return response
    return """
        <h1>Signup</h1>
        <form action="/signup" method="post"> 
            <label>User: <label>
            <input type=text name="user"><br>
            <label>Password: </lable>
            <input type=text name=passwd><br>
            <input type="submit" name="signup" value="Signup"> 
            <a href="/">back</a>
        </form>
    """

@app.route("/home", methods=["POST", "GET"])
def home():
    if request.method == "POST":
        username = request.form.get("user")
        passwd = request.form.get("passwd")

        sql = "SELECT note FROM users WHERE id = '%s' AND passwd = '%s'" % (username, passwd)

        con = getDb()
        cur = con.cursor()
        result = cur.execute(sql).fetchone()
        con.close()
        
        if result is None:
            return """
                <p>Invalid username or password.</p>
                <a href="/login"><button type="button">Back</button></a>
            """
        
        note = result['note']

        page = f"""
            <h1> {username}'s note </h1>
            <form action="/note" method="post"> 
                <textarea id="message" name="note" rows="5" cols="40" placeholder="Write some notes">{note}</textarea>

                <br><br>
            
                <input type="submit" name="save" value="Save"> 
            </form>
        """

        response = make_response(page)
        response.set_cookie("username", username)
        response.set_cookie("password", passwd)
        return response
    else:
        if (not checkUserCookie()):
            return redirect("/")

        username = request.cookies.get("username")
        # password = request.cookies.get("password")

        # sql = "SELECT note FROM users WHERE id = ? AND passwd = ?"
        sql = "SELECT note FROM users WHERE id = ?"
        con = getDb()
        cur = con.cursor()
        result = cur.execute(sql, [username]).fetchone()
        con.close()
        note = result['note'] if result is not None else ""

        page = f"""
            <h1> {username}'s note </h1>
            <form action="/note" method="post"> 
                <textarea id="message" name="note" rows="5" cols="40" placeholder="Write some notes">{note}</textarea>

                <br><br>
            
                <input type="submit" name="save" value="Save"> 
            </form>
        """
        response = make_response(page)
        return response

@app.route("/note", methods=["POST"])
def insertNote():
    if not checkUserCookie():
        return redirect("/")
    
    username = request.cookies.get("username")
    note_content = request.form.get("note")
    
    sql = "UPDATE users SET note = ? WHERE id = ?"
    con = getDb()
    cur = con.cursor()
    cur.execute(sql, [note_content, username])
    con.commit()
    con.close()
    
    return redirect(url_for('home'))

if __name__ == "__main__":
    con = getDb()
    con.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                passwd TEXT,
                note TEXT
            )
                """)
    con.close()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
