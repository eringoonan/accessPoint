function adminMiddleware(req, res, next) {
  // verify user is an admin through the token
  if (!req.user || req.user.is_admin !== 1) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = adminMiddleware;
