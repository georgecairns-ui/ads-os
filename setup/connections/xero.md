# Connect Xero

One line: fills Review with unpaid invoices to chase and bills due, and answers money questions (cash position, profit and loss) directly.

**Recommended route:** the Xero connector in Claude's connector directory, read-only by design. **Plans:** needs an active Xero subscription; works with a free or paid Claude account.

## Route 1: connect Xero

1. Say "Let's connect your accounts" to the person. Say "connect" and "a connection", never MCP, API, JSON or repo.
2. In the Claude app or on claude.ai, go to the connectors area (ask the person what they see), find "Xero", click Connect, sign in with the business Xero login, and choose the organisation.
3. In Claude Code: it appears automatically once Claude Code is signed in with a claude.ai subscription. Check with `/mcp`.

## If neither works

Ask the person to export an aged receivables or unpaid invoices report from Xero as a CSV or PDF, and save it into `files/`. Note that this means Claude only sees what was exported, when it was exported, rather than live figures.

A separate, developer-run version of the Xero connector exists (an open-source local server that can create invoices and post transactions), but it needs a Xero Custom Connection and is not suitable for this kit. Not part of this guide.

Xero's own wording: "Claude connects with read-only access" and it "can't edit invoices, post transactions, or change anything in your books."

## Check it works

Ask permission, then list unpaid invoices. Say something like: "I can see 4 unpaid invoices, the oldest from 12 September, owed by Greenway Café."

The connector was added to the directory in April 2026, built by Xero Limited, and is marked Anthropic verified.

## Rules for Claude with Xero

Read only, by Xero's own design: "Claude connects with read-only access" and "can't edit invoices, post transactions, or change anything in your books." Tools include `get_invoices`, `show_invoices_summary`, `get_aged_receivables`, `get_aged_payables`, `get_bills`, `get_contacts`, `get_profit_and_loss`, `get_cash_position`, `get_bank_account_transactions`. There is nothing to restrict beyond this; the connector cannot write.

## What to record

Add to `context/tools.md`: "Xero | Claude connector | 2026-10-06 | Read invoices, bills, contacts and reports | Nothing; the connector is read-only".

## Sources

Verified on 2026-10-06.
- https://claude.com/connectors/xero
- https://www.xero.com/uk/ai-in-accounting/claude/
- https://www.xero.com/us/ai-in-accounting/claude/
- https://github.com/xeroapi/xero-mcp-server
