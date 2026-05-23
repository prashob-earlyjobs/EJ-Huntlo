const jwt = require("jsonwebtoken");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};

const signToken = (payload, options = {}) => {
  const { jwtid, expiresIn } = options;
  const signOptions = { expiresIn: expiresIn || JWT_EXPIRES_IN };
  if (jwtid) signOptions.jwtid = jwtid;
  return jwt.sign(payload, getJwtSecret(), signOptions);
};

const verifyToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = { signToken, verifyToken };
