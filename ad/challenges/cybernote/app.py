# a note taking app

from flask import Flask, redirect, render_template_string, request, template_rendered, url_for
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

# @app.route("/login", methods=["POST", "GET"])
@app.route("/login")
def loginPage():
    # if request.method == "POST":
    #
    #
    #     return """
    #         login post
    #     """

    return render_template_string("""
        <h1>Login</h1>

        <form action="/home" method="post"> 
            <label>User: <label>
            <input type=text name="user"><br>
            <label>Password: </lable>
            <input type=text name=passwd><br>
            <input type="submit" name="Login"> 
        </form>
    """)

@app.route("/signup", methods=["POST", "GET"])
def signupPage():
    if request.method == "POST":
        user = request.form.get("id")
        passwd = request.form.get("passwd")

        sql = "insert into users (id, passwd, note) values (?, ?, ?)"
        con = get_db()
        cur = con.cursor()
        add_to_db = cur.execute(sql, [user, passwd, ""]).fetchone()
        con.close()
        return """
                success
        """

    return """
        <h1>Signup</h1>

        <form action="/signup" method="post"> 
            <label>User: <label>
            <input type=text name="user"><br>
            <label>Password: </lable>
            <input type=text name=passwd><br>
            <input type="submit" name="signup"> 
        </form>
    """


@app.route("/home", methods=["POST", "GET"])
def home():

    # this is redirected from the login request. should check if the post request parameter value is correct if yes than redirect to /home/<id>
    # this is where the sql injection happen
    if request.method == "POST":
        user = request.form.get("id")
        passwd = request.form.get("passwd")

        # sql = "SELECT note "

        return """
            display note here and update note here. post request to note
    """
    
    # read cookie and login, if no cookie then redirect to "/"
    # login by redirecting 
    return """
        get request home
    """

@app.route("/note", methods=["GET", "POST"])
def insert_note():
    return """
        insert note
    """

# @app.route("/home/<username>", methods=["GET", "POST"])
# def homePage(username): 
#
#     if request.method == "POST":
#         passwd = request.form['passwd']
#
#         sql = "SELECT note FROM users WHERE id = '%s' AND password = '%s'" % (username, passwd)
#         con = get_db()
#         cur = con.cursor()
#         note= cur.execute(sql).fetchone()
#         con.close()
#         print(note)
#
#         # redirect to home
#         return """
#
#             asd
#         """
#     else:
#         return  "hi"


if __name__ == "__main__":
    con = get_db()
    con.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                passwd TEXT,
                note TEXT
            )
                """)
    con.close()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))


