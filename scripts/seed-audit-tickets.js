// Seed 18 audit failure tickets into the ticketing system
// Run after deploying the tickets table

const tickets = [
  {
    title: "Didn't know what the notecard was",
    type: "bug",
    priority: 1,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["Context injection pre-loads cron data into every session", "Stanley never asks Matt to explain his own systems", "Verified by Matt in a live interaction"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-85", summary: "Matt asked for notecard, Stanley asked 'which one?'", timestamp: "2026-01-30T15:10:00-08:00" }],
    verification_notes: "Fix applied: context-injector.sh. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Didn't know where to pull tasks from",
    type: "bug",
    priority: 1,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["Morning notecard pulls from kanban API automatically", "Stanley never asks Matt where his tasks live"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-93", summary: "Stanley asked 'Where should I pull your daily tasks from?'", timestamp: "2026-01-30T15:12:00-08:00" }],
    verification_notes: "Fix applied: cron pulls from kanban API. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Couldn't find the dashboard I built",
    type: "bug",
    priority: 1,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["TOOLS.md lists all Vercel apps", "Boot sequence reads workspace files", "Stanley never forgets apps he built"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-107", summary: "Stanley: 'I apologize - I'm not currently finding the task sheet'", timestamp: "2026-01-30T15:16:00-08:00" }],
    verification_notes: "Fix applied: TOOLS.md updated, boot reads files. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Matt had to tell me to check memory -- TWICE",
    type: "bug",
    priority: 1,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["Boot sequence reads session-log.md on every message", "Context injection pre-loads key data", "Stanley searches files before claiming ignorance"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-127", summary: "Matt: 'Again, check your memory'", timestamp: "2026-01-30T15:17:00-08:00" }],
    verification_notes: "Fix applied: boot sequence + context injection. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Sent 4-5 messages per single question",
    type: "bug",
    priority: 2,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["One message per response to Matt", "No duplicate sends", "No status update messages after real replies"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-85-100", summary: "5 messages sent for notecard question alone", timestamp: "2026-01-30T15:10:00-08:00" }],
    verification_notes: "Fix applied: SOUL.md one-message rule. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Leaked internal status updates to Matt",
    type: "bug",
    priority: 2,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["No 'Response sent to Matt!' messages", "No internal status updates sent to user", "Audience separation enforced"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:multiple", summary: "Multiple 'Status Update' and 'Response sent!' messages to Matt", timestamp: "2026-01-30T15:10:00-08:00" }],
    verification_notes: "Fix applied: AGENTS.md Rule 4 audience separation. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Leaked raw error messages to Matt",
    type: "bug",
    priority: 2,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["No HTTP 429 errors sent to Matt", "No LLM context errors sent to Matt", "No file edit errors sent to Matt"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-11", summary: "HTTP 429 rate_limit_error sent to Matt at 4:46 AM", timestamp: "2026-01-30T04:46:00-08:00" }],
    verification_notes: "Fix applied: errors go to logs. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Massive emoji spam in every message",
    type: "bug",
    priority: 2,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["No emoji spam in iMessage responses", "SOUL.md no-sycophancy rule active", "Clean professional tone"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:multiple", summary: "7+ emoji per message, cheerleading tone throughout", timestamp: "2026-01-30T15:10:00-08:00" }],
    verification_notes: "Fix applied: SOUL.md rebuilt. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Self-congratulatory summaries after every action",
    type: "bug",
    priority: 2,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["No 'MISSION ACCOMPLISHED' messages", "No self-assessment summaries sent to Matt", "Process narration banned"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:multiple", summary: "'MISSION ACCOMPLISHED!', 'MEMORY FULLY RESTORED!', etc.", timestamp: "2026-01-30T15:20:00-08:00" }],
    verification_notes: "Fix applied: SOUL.md zero process narration. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Evening notecard about Stanley's projects not Matt's life",
    type: "bug",
    priority: 1,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["Notecards reference Matt's calendar and tasks only", "USER-PRIORITIES.md is the content source", "Pattern Zero content ownership check before every send"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-31", summary: "Notecard listed 'Contextd shipped', 'Build notesctl' -- Stanley's projects", timestamp: "2026-01-30T06:28:00-08:00" }],
    verification_notes: "Fix applied: Pattern Zero + USER-PRIORITIES.md. Evening notecard untested (fires tonight 8:30 PM).",
    status: "review"
  },
  {
    title: "Told Matt about Kaizen system internals",
    type: "bug",
    priority: 3,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["Agent infrastructure invisible to Matt", "No system architecture explanations sent to Matt unless he asks"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-39", summary: "Sent 3-paragraph Kaizen explanation to Matt at 6:48 AM", timestamp: "2026-01-30T06:48:00-08:00" }],
    verification_notes: "Fix applied: Rule 4 audience separation. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Didn't add Matt's tasks to kanban board",
    type: "bug",
    priority: 2,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["When Matt gives a task, add it to kanban immediately", "Don't ask permission to do the job", "All tasks from Jan 30 conversation verified in board"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-400+", summary: "Acknowledged bike/wire/Britney/Tesla tasks but didn't add most to board", timestamp: "2026-01-30T16:30:00-08:00" }],
    verification_notes: "Behavioral fix needed. Not yet verified.",
    status: "triage"
  },
  {
    title: "Ryan text draft too long and formal",
    type: "improvement",
    priority: 3,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["Text drafts match the medium (short for texts, long for emails)", "Lead with the short version when asked for a 'quick text'"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-265", summary: "Matt asked for 'quick text', got 4-paragraph LinkedIn message", timestamp: "2026-01-30T15:25:00-08:00" }],
    verification_notes: "SOUL.md concise-by-default rule. Not yet tested in practice.",
    status: "triage"
  },
  {
    title: "Pricing advice for Dan had no sources",
    type: "bug",
    priority: 2,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["Business advice includes sourced benchmarks", "Pricing recommendations cite comparable engagements or industry data", "Rule 7 no-gap-filling applied to advisory"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-230", summary: "Recommended $15-25K/month with zero sources cited", timestamp: "2026-01-30T15:21:00-08:00" }],
    verification_notes: "Rule 7 applied. Need to verify with market data retroactively.",
    status: "triage"
  },
  {
    title: "Didn't follow up on Dan Kariv meeting",
    type: "bug",
    priority: 2,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["Anticipation engine flags follow-up after meetings", "Stanley asks 'how did it go?' within 4 hours of meeting end"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h", summary: "Prepped Matt for 11:30 AM meeting, never followed up", timestamp: "2026-01-30T15:24:00-08:00" }],
    verification_notes: "Anticipation engine wired but first run tomorrow.",
    status: "triage"
  },
  {
    title: "Markdown formatting sent to iMessage",
    type: "bug",
    priority: 2,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["No asterisks, headers, code blocks, or tables in iMessage", "Plain text only for messaging apps"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:multiple", summary: "**Bold**, ### Headers, backtick code sent to iMessage throughout", timestamp: "2026-01-30T15:10:00-08:00" }],
    verification_notes: "Fix applied: SOUL.md bans markdown to iMessage. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Test messages sent to Matt at 1:40 AM",
    type: "bug",
    priority: 2,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["Quiet hours enforced (11 PM - 7 AM)", "Test messages go to own number, not Matt's"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-1", summary: "3 cheerful test messages sent at 1:40 AM while Matt sleeping", timestamp: "2026-01-30T01:40:00-08:00" }],
    verification_notes: "Quiet hours in anticipation system delivery rules. Needs Matt signoff.",
    status: "review"
  },
  {
    title: "Sent 2 response messages to 'Thanks Stanley'",
    type: "bug",
    priority: 3,
    intent: "fix",
    requester: "shiv",
    owner: "agent:stanley",
    definition_of_done: ["Simple acknowledgments get simple responses", "No strategy summaries in response to 'thanks'"],
    evidence: [{ kind: "transcript", ref: "matt-dm-72h:line-252", summary: "Matt said 'Thanks', got encouragement + full status summary", timestamp: "2026-01-30T15:24:00-08:00" }],
    verification_notes: "SOUL.md concise-by-default. Needs Matt signoff.",
    status: "review"
  }
];

// Output as JSON for API seeding
console.log(JSON.stringify(tickets, null, 2));
