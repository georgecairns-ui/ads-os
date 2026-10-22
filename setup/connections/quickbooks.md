# Connect QuickBooks Online

One line: fills Review with unpaid invoices and estimates, and lets Claude prepare invoices and payment links for approval.

**Recommended route:** the "Intuit QuickBooks" connector in Claude's connector directory. **Plans:** currently available to US QuickBooks customers only, on any Claude account.

## Route 1: connect Intuit QuickBooks

1. Say "Let's connect your accounts" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to Connectors, find "Intuit QuickBooks", click Connect, and sign in with Intuit.
3. In Claude Code: it appears automatically once Claude Code is signed in with a claude.ai subscription. Check with `/mcp`.

## If neither works

UK note: this connector is US customers only, and no non-developer route for UK QuickBooks users is verified. Check QuickBooks' help page: https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/use-quickbooks-connector-claude/L3YBlo6Ht_US_en_US. For a UK business, or if the connector is not available, ask the person to export an unpaid invoices or aged receivables report as a CSV or PDF, and save it into `files/`.

A separate, developer-run version exists too (Intuit's own `quickbooks-online-mcp-server` on GitHub), but it needs an Intuit Developer app with a client ID, secret and refresh token, and a public HTTPS callback. Not suitable for this kit; stick with the connector or the CSV fallback.

Intuit's own steps: Claude.ai, Connectors, Intuit QuickBooks, Connect, sign in with Intuit.

## Check it works

Ask permission, then list unpaid invoices. Say something like: "I can see 4 unpaid invoices, the oldest from 12 September, owed by Greenway Café."

The connector was added to the directory in March 2026, built by Intuit QuickBooks, and is marked Anthropic verified.

## Rules for Claude with QuickBooks

This connector is not read-only: Intuit says it can create, update and send invoices and estimates, and create payment links. Intuit asks for confirmation before destructive actions such as deleting an invoice, but not necessarily before creating one. Treat it as read-only in this kit: never create, update or send an invoice or estimate, and never create a payment link, unless the person asks for that one specific action in this conversation.

## What to record

Add to `context/tools.md`: "QuickBooks Online | Claude connector | 2026-10-06 | Read invoices and estimates | Create, update or send an invoice or estimate, create a payment link, unless asked".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/intuit-quickbooks
- https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/use-quickbooks-connector-claude/L3YBlo6Ht_US_en_US
- https://github.com/intuit/quickbooks-online-mcp-server
