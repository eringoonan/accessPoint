require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const controllersRoutes = require("./routes/controllers");
const authRoutes = require("./routes/auth");
const profileDetailsRouter = require('./routes/profileDetails');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies FIRST
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// CORS
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));

// Add a middleware to log ALL requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ---- ROUTES ----
app.use("/controllers", controllersRoutes);
app.use("/auth", authRoutes);
app.use('/profileDetails', profileDetailsRouter);

// ---- START SERVER ----
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
});
