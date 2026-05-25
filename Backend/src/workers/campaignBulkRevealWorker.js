const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const connectDB = require("../config/db");
const { runCampaignRevealJob } = require("../services/campaignRevealJobRunner");

const jobId = process.argv[2];

if (!jobId) {
  console.error("campaignBulkRevealWorker: missing jobId argument");
  process.exit(1);
}

connectDB()
  .then(() => runCampaignRevealJob(jobId))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[campaignBulkRevealWorker]", err);
    process.exit(1);
  });
