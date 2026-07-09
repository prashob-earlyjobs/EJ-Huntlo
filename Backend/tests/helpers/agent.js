require("../setup/loadEnv");

const request = require("supertest");
const app = require("../../src/app");

function getAgent() {
  return request(app);
}

module.exports = { getAgent };
