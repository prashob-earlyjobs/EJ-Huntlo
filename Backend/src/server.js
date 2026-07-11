const http = require("http");
const dotenv = require("dotenv");

dotenv.config();

require("./config/performanceLogging");

const app = require("./app");
const connectDB = require("./config/db");
const { seedGlobalTemplates } = require("./services/outreachTemplateService");
const { startCampaignOutreachScheduler } = require("./services/campaignOutreachScheduler");
const { startGmailDailyUsageResetScheduler } = require("./services/gmailDailyUsageResetScheduler");
const { startScheduleReminderScheduler } = require("./services/scheduleReminderScheduler");
const { attachRealtimeServer } = require("./realtime/attach");

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();
    await seedGlobalTemplates();
    startCampaignOutreachScheduler();
    startGmailDailyUsageResetScheduler();
    startScheduleReminderScheduler();

    const httpServer = http.createServer(app);
    attachRealtimeServer(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error.message);
    process.exit(1);
  }
};

startServer();
