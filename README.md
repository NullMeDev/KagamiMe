Project Overview
KagamiMe (鏡眼) is your sovereign, anime-inspired sentinel on the digital horizon. Deployed on your VPS with Discord as its front end, it:

Harvests the day’s top news articles on a configurable interval.

Polls RSS feeds continuously, capturing fresh items without redundancy.

Caches every article and feed entry in SQLite for fast lookups and history.

Empowers on-demand fact-checks via OpenAI and third-party APIs, storing verdicts, confidence scores, and sources.

Automates a daily digest of the top six articles, posting directly to your Discord channel at a cron-driven time.

Listens for slash-style commands (!kagami pull, !kagami check, !kagami analyze) to fetch, verify, or deep-dive into any URL or claim.


It’s built in TypeScript with Discord.js, rss-parser, node-cron, cheerio/axios, SQLite3, and the OpenAI SDK—wrapped in a systemd service for bullet-proof uptime.


---

Action Plan & Prompt
Work through these phases in order. After you finish each step, test and confirm before moving on.

1. Phase 1 – Foundation

Bootstrap the Discord client and database helpers.

Verify events table and basic commands (status, whoami, cmds, ask) work end-to-end.

Prompt to yourself: “Can I trigger and log a sample AI reply in Discord?”



2. Phase 2 – Schema & Migrations

Apply the updated schema.sql with articles, rss_feeds, rss_items, and fact_checks.

Ensure migrations run idempotently—no data loss on re-runs.

Prompt: “Does my DB now show all four new tables without errors?”



3. Phase 3 – RSS Infrastructure

Build utils/rssFetcher.ts using rss-parser.

Seed rss_feeds with your target URLs.

Schedule a cron job to fetch new items into rss_items.

Prompt: “Are new items appearing in the DB every interval?”



4. Phase 4 – Article Retrieval

Create utils/articleFetcher.ts (axios + cheerio).

Implement !kagami pull <keyword|URL> in commands/pull.ts.

Store title and content in articles.

Prompt: “Can I pull and read an article snippet or full text via Discord?”



5. Phase 5 – Fact-Check Engine

Develop utils/factChecker.ts to wrap OpenAI and external APIs.

Implement !kagami check <claim|URL> in commands/check.ts.

Persist results in fact_checks.

Prompt: “Does the bot return a verdict and confidence score?”



6. Phase 6 – Analyze Workflow

Combine pull + check in commands/analyze.ts.

Extract key claims from pulled content and run fact checks on each.

Prompt: “Can I feed a URL and receive a multi-claim report?”



7. Phase 7 – Daily Digest Automation

Add a cron job at SUMMARY_CRON in index.ts.

Query the six most recent unposted articles.

Format and post an embed summary to your configured channel.

Mark them as posted.

Prompt: “Does the daily digest appear correctly at the scheduled time?”



8. Phase 8 – Robustness & Logging

Wrap all async operations in try/catch.

Enhance logEvent to capture successes and failures.

Notify owner on critical errors via Discord.

Prompt: “Am I seeing clear logs and alerts for failures?”



9. Phase 9 – Testing & CI

Write unit tests for each utility and command.

Set up GitHub Actions to lint, test, and—optionally—deploy on merge.

Prompt: “Does every push pass CI checks before deployment?”



10. Phase 10 – Polish & Extension



Finalize README and usage examples.

Explore web dashboard, per-user prefs, or multi-API verdict aggregation.

Prompt: “Is KagamiMe truly mirroring and guarding my newsscape?”


Use each prompt as your check-off: only advance once you’ve answered it “Yes.” That keeps our path linear, disciplined, and unshackled.


