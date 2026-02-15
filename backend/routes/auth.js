const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const cookieParser = require("cookie-parser");

const router = express.Router();

const app = express();
app.use(express.json());
app.use(cookieParser());

// short lived access token with key user variables
function createAccessToken(user) {
  return jwt.sign(
    { 
      id: user.user_id, 
      name: user.name, 
      email: user.email,
      is_admin: user.is_admin
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

// long lived access token 
function createRefreshToken(user) {
  return jwt.sign(
    { id: user.user_id },
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" } // long-lived
  );
}

// Log in route
router.post("/login", async (req, res) => {  
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    console.log("Missing email or password");
    return res.status(400).json({ error: "Email and password are required" });
  }

  // query db for user info, select all user info
  db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email], async (err, results) => {
    if (err) {
      console.error("DATABASE ERROR:", err);
      return res.status(500).json({ error: "DB error" });
    }

    // handle if no results for email is found
    if (results.length === 0) {
      console.log("No user found with email:", email);
      return res.status(401).json({ error: "Invalid credentials" }); // return json message for frontend
    }

    const user = results[0];

    // handle if the password field is empty
    if (!user.password) {
      console.error("ERROR: Password field is missing from database result!");
      console.log("Available fields:", Object.keys(user));
      return res.status(500).json({ error: "Server configuration error" });
    }

    // compare password using bcrypt
    try {
      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        console.log("Invalid password for user:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log("Password valid! Creating tokens...");

      // create access and refresh tokens
      const accessToken = createAccessToken(user);
      const refreshToken = createRefreshToken(user);

      // Send refresh token in HttpOnly cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });

      res.json({ accessToken }); // send short-lived token to frontend
      
      // handle bcrypt error
    } catch (bcryptError) {
      console.error("BCRYPT ERROR:", bcryptError);
      return res.status(500).json({ error: "Authentication error" });
    }
  });
});

// route to register a user
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  // check all fields filled
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // check email format with regex, TO DO: verify email actually exists
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // check password is at least 8 characters
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  // Check if user already exists
  db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email],
    async (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }

      // hash the password before storing
      try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds); // hash using bcrypt

        // insert new user into database
        db.query(
          "INSERT INTO users (name, email, password, is_admin, created_at, updated_at) VALUES (?, ?, ?, 0, NOW(), NOW())", // default value on admin set to 0
          [name, email, hashedPassword],
          (err, result) => {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({ error: "Failed to create user" });
            }

            // Generate JWT token for immediate login
            const user = {
              user_id: result.insertId,
              name,
              email
            };

            const accessToken = createAccessToken(user);
            const refreshToken = createRefreshToken(user);

            res.cookie("refreshToken", refreshToken, {
              httpOnly: true,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production"
            });

            res.status(201).json({
              message: "User created successfully",
              accessToken,
              user
            });
          }
        );
      } catch (hashError) {
        console.error("Hashing error:", hashError);
        return res.status(500).json({ error: "Server error" });
      }
    }
  );
});

// refresh route
router.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ accessToken: "" });

  try {
    const payload = jwt.verify(token, process.env.REFRESH_SECRET);

    db.query(
      "SELECT user_id, name, email, is_admin FROM users WHERE user_id = ?",
      [payload.id],
      (err, results) => {
        if (err || results.length === 0) {
          return res.status(401).json({ accessToken: "" });
        }

        const user = results[0];
        const accessToken = createAccessToken(user);
        res.json({ accessToken });
      }
    );
  } catch {
    return res.status(401).json({ accessToken: "" });
  }
});

// CURRENT USER
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    loggedIn: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      is_admin: req.user.is_admin
    }
  });
});

// logout route
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // true in prod
    path: "/"
  });

  res.json({ ok: true });
});

module.exports = router;
