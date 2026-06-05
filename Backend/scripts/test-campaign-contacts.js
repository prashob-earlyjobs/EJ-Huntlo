/**
 * Smoke test for CampaignContact collection.
 * Run: node scripts/test-campaign-contacts.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Campaign = require("../src/models/Campaign");
const CampaignContact = require("../src/models/CampaignContact");
const {
  addContactsToCampaignCollection,
  countContactsForCampaign,
  listCampaignContactsPaginated,
  loadAllContactsForCampaign,
  deleteAllContactsForCampaign,
  ensureContactsMigrated,
} = require("../src/services/campaignContactService");

function makeContact(i) {
  return {
    candidateKey: `test-key-${i}`,
    candidateId: `cid-${i}`,
    name: `Test Candidate ${i}`,
    email: `test${i}@example.com`,
    phone: "",
    role: "Engineer",
    company: "Acme",
    location: "NYC",
    linkedinUrl: `https://linkedin.com/in/test-${i}`,
    sourcingSessionId: "sess-test",
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const userId = new mongoose.Types.ObjectId();
  const campaign = await Campaign.create({
    userId,
    name: `Contact collection test ${Date.now()}`,
    contacts: [],
    contactCount: 0,
  });
  const campaignId = String(campaign._id);
  console.log("Created test campaign:", campaignId);

  try {
    const batch1 = Array.from({ length: 50 }, (_, i) => makeContact(i));
    const add1 = await addContactsToCampaignCollection(campaignId, userId, batch1);
    console.log("Add 50:", add1);
    if (add1.addedCount !== 50) throw new Error(`Expected 50 added, got ${add1.addedCount}`);

    const batch2 = Array.from({ length: 50 }, (_, i) => makeContact(i + 50));
    const add2 = await addContactsToCampaignCollection(campaignId, userId, batch2);
    console.log("Add 50 more:", add2);
    if (add2.addedCount !== 50) throw new Error(`Expected 50 added, got ${add2.addedCount}`);

    const dup = await addContactsToCampaignCollection(campaignId, userId, batch1.slice(0, 5));
    console.log("Add duplicates:", dup);
    if (dup.addedCount !== 0 || dup.skippedCount !== 5) {
      throw new Error("Duplicate add should skip 5");
    }

    const total = await countContactsForCampaign(campaignId);
    console.log("Total count:", total);
    if (total !== 100) throw new Error(`Expected 100 contacts, got ${total}`);

    const page1 = await listCampaignContactsPaginated(campaignId, { page: 1, limit: 25 });
    console.log("Page 1:", page1.pagination);
    if (page1.contacts.length !== 25) throw new Error("Page 1 should have 25 rows");

    const all = await loadAllContactsForCampaign(campaignId);
    if (all.length !== 100) throw new Error(`loadAll expected 100, got ${all.length}`);

    // Legacy migration: embed 3 contacts on campaign doc and migrate
    await CampaignContact.deleteMany({ campaignId: campaign._id });
    await Campaign.updateOne(
      { _id: campaign._id },
      {
        $set: {
          contactCount: 0,
          contacts: [makeContact(900), makeContact(901), makeContact(902)],
        },
      }
    );
    await ensureContactsMigrated(campaignId);
    const migrated = await countContactsForCampaign(campaignId);
    console.log("Migrated embedded count:", migrated);
    if (migrated !== 3) throw new Error(`Expected 3 migrated, got ${migrated}`);

    const campaignAfter = await Campaign.findById(campaignId).lean();
    if ((campaignAfter.contacts || []).length !== 0) {
      throw new Error("Embedded contacts should be cleared after migration");
    }

    console.log("All CampaignContact tests passed.");
  } finally {
    await deleteAllContactsForCampaign(campaignId);
    await Campaign.deleteOne({ _id: campaign._id });
    await mongoose.disconnect();
    console.log("Cleaned up test data.");
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  mongoose.disconnect().finally(() => process.exit(1));
});
