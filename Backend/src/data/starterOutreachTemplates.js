/** Default starter templates — seeded with isGlobal: true */
module.exports = [
  {
    starterKey: "focused",
    name: "Focused outreach",
    description: "3 touchpoints · 6 days in outreach",
    planName: "Focused outreach",
    touchpoints: [
      {
        order: 1,
        label: "Introduction",
        subject: "Opportunity that may fit your background",
        body: "Hi {{name}},\n\nI came across your profile and thought you might be a strong fit for a role we are hiring for. Would you be open to a quick chat this week?\n\nBest regards",
        waitDays: 0,
      },
      {
        order: 2,
        label: "Follow-up 1",
        subject: "Following up — quick question",
        body: "Hi {{name}},\n\nJust wanted to follow up on my note below. Happy to share more detail on the role and team if helpful.\n\nThanks",
        waitDays: 3,
      },
      {
        order: 3,
        label: "Follow-up 2",
        subject: "Last note from me",
        body: "Hi {{name}},\n\nI will keep this brief — if now is not the right time, no worries at all. If you would like to explore the opportunity, reply here and we can set up a short call.\n\nBest",
        waitDays: 3,
      },
    ],
  },
  {
    starterKey: "multichannel",
    name: "Multi-channel outreach",
    description: "4 touchpoints · 8 days in outreach",
    planName: "Multi-channel outreach",
    touchpoints: [
      {
        order: 1,
        label: "Introduction",
        subject: "Reaching out from {{company}}",
        body: "Hi {{name}},\n\nI am reaching out regarding an opening on our team. Your experience stood out — would you have 15 minutes to connect?\n\nThank you",
        waitDays: 0,
      },
      {
        order: 2,
        label: "Value add",
        subject: "More context on the role",
        body: "Hi {{name}},\n\nSharing a bit more about the position and why we think you could be a great match. Let me know if you would like the full job description.\n\nBest",
        waitDays: 2,
      },
      {
        order: 3,
        label: "Follow-up",
        subject: "Checking in",
        body: "Hi {{name}},\n\nWanted to check whether you had a chance to review my earlier messages. Happy to answer any questions.\n\nRegards",
        waitDays: 3,
      },
      {
        order: 4,
        label: "Close loop",
        subject: "Closing the loop",
        body: "Hi {{name}},\n\nI do not want to crowd your inbox — this will be my last email unless you would like to continue the conversation.\n\nAll the best",
        waitDays: 3,
      },
    ],
  },
];
