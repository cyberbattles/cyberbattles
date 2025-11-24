
# IDEA
# the program can be exploit with sql injection from the login page such as 
# password=' OR 1=1; ueer = <flag_user_name> --
# 
# note taking app

from flask import Flask, make_response, redirect, render_template_string, request, template_rendered, url_for
import sqlite3
import os

app = Flask(__name__)

DB_PATH = "./database.db"

def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db

@app.route("/")
def main():
    return render_template_string("""
        <h2> Welcome to cybernote. login to view your note </h2>
        <a href="/login"><button type=button> Login </button></a>
        <a href="/signup"><button type=button> Signup </button></a>
    """)

@app.route("/login", methods=["GET", "POST"])  
def loginPage():
    if request.method == "POST":
        user = request.form.get("user", "")
        passwd = request.form.get("passwd", "")
        con = get_db()
        cur = con.cursor()
        # intentionally vulnerable string formatting for the challenge
        sql = "SELECT id FROM users WHERE id = '%s' AND passwd = '%s'" % (user, passwd)
        row = cur.execute(sql).fetchone()
        con.close()
        if row:
            return redirect(url_for("homePage", username=user))
        login_page = render_template_string(
            """
            <h1>Login</h1>
            <p style="color:red;">Invalid credentials</p>
            <form action="/login" method="post"> 
                <label>User: </label>
                <input type=text name="user"><br>
                <label>Password: </label>
                <input type=text name=passwd><br>
                <input type="submit" value="Login"> 
            </form>
            """
        )

        response = make_response(login_page)
        response.set_cookie("username", user)
        response.set_cookie("passwd", passwd)
        return response
    return render_template_string(
        """
        <h1>Login</h1>
        <form action="/login" method="post"> 
            <label>User: </label>
            <input type=text name="user"><br>
            <label>Password: </label>
            <input type=text name=passwd><br>
            <input type="submit" value="Login"> 
        </form>
        """
    )

@app.route("/signup", methods=["GET", "POST"])  
def signupPage():
    if request.method == "POST":
        user = request.form.get("user", "")
        passwd = request.form.get("passwd", "")
        con = get_db()
        cur = con.cursor()
        # check if user exists (intentionally vulnerable formatting)
        check_sql = "SELECT id FROM users WHERE id = '%s'" % (user)
        exists = cur.execute(check_sql).fetchone()
        if exists:
            con.close()
            return render_template_string(
                """
                <h1>Signup</h1>
                <p style=\"color:red;\">User already exists</p>
                <form action="/signup" method="post"> 
                    <label>User: </label>
                    <input type=text name="user"><br>
                    <label>Password: </label>
                    <input type=text name=passwd><br>
                    <input type="submit" value="Signup"> 
                </form>
                """
            )
        # insert new user with empty note (intentionally vulnerable formatting)
        insert_sql = "INSERT INTO users (id, passwd, note) VALUES ('%s', '%s', '%s')" % (user, passwd, "")
        cur.execute(insert_sql)
        con.commit()
        con.close()
        return redirect(url_for("loginPage"))

    return render_template_string(
        """
        <h1>Signup</h1>
        <form action="/signup" method="post"> 
            <label>User: </label>
            <input type=text name="user"><br>
            <label>Password: </label>
            <input type=text name=passwd><br>
            <input type="submit" value="Signup"> 
        </form>
        """
    )

@app.route("/home", methods=["POST"])  
def home():
    # insert to database (not used by forms anymore)
    user = request.form.get("id")
    passwd = request.form.get("passwd")

    sql = "INSERT INTO users (id, passwd, note) VALUES (?, ?, ?)"
    con = get_db()
    cur = con.cursor()
    # add_to_db = cur.execute(sql, []).fetchone()
    con.close()

    return redirect("/")

@app.route("/home/<username>", methods=["GET", "POST"])  
def homePage(username): 

    if request.method == "POST":
        passwd = request.form['passwd']
        # intentionally vulnerable string formatting for the challenge
        sql = "SELECT note FROM users WHERE id = '%s' AND passwd = '%s'" % (username, passwd)
        con = get_db()
        cur = con.cursor()
        note = cur.execute(sql).fetchone()
        con.close()

        if note:
            return render_template_string(
                """
                <h1>Note for {{ user }}</h1>
                <pre>{{ note }}</pre>
                """,
                user=username,
                note=note["note"] if isinstance(note, sqlite3.Row) else note,
            )
        return render_template_string("""
            <h1>Access denied</h1>
            <a href="/login">Back to Login</a>
        """)
    else:
        # show note without extra checks (for the challenge)
        sql = "SELECT note FROM users WHERE id = '%s'" % (username)
        con = get_db()
        cur = con.cursor()
        note = cur.execute(sql).fetchone()
        con.close()
        if note:
            return render_template_string(
                """
                <h1>Note for {{ user }}</h1>
                <pre>{{ note }}</pre>
                """,
                user=username,
                note=note["note"] if isinstance(note, sqlite3.Row) else note,
            )
        return render_template_string(
            """
            <h1>No note found for {{ user }}</h1>
            <a href="/login">Login</a>
            """,
            user=username,
        )

if __name__ == "__main__":
    con = get_db()
    con.execute(
        """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                passwd TEXT,
                note TEXT
            )
                """
    )
    con.close()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))


