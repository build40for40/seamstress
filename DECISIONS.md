# Decisions

Made on Day 14 (19 November 2026) while building the onboarding. The newest decision wins if two conflict.

## Scope
- **Onboarding first.** The owner (CEO of an atelier) describes the business and Claude sets up Superthread. Invoicing, monthly timesheets and payroll come later.
- **Atelier and seamstress first.** When unsure, default to the atelier. Other milestone-and-evidence businesses (film production, design agencies) are a stretch goal, not a design input.
- **No per-industry templates.** Claude designs the board from the owner's description instead.
- **Simplicity and clarity override any rule**, including the ones below.

## Superthread as the brain
- **One company, one workspace.** The customer brings their own workspace; the MCP cannot create one.
- **A dedicated space per atelier**, holding the board and the conventions page. A space is also the boundary for a client view later, since clients can only see one board or page.
- **One board per atelier, one card per garment or order.** Client details lead the card description; several garments for one client means several cards.
- **Description = client and billing details.** Superthread has no custom fields.
- **Comments = time logs and photo evidence.**

## Lists
- **No fixed number.** A list stays only if a card there needs a different action or person than in the neighbouring list.
- **Cancelled does not count**; it sits outside the flow. Most ateliers land on 5 to 8 working stages.
- **Assignment is not a list**: use the card's assignee (the description's Assigned line covers seamstresses who are not workspace members).
- **Deposits and part payments are comments**, not lists. Invoiced and Paid stay separate lists because they mean different actions.
- **Default atelier board:** Inquiry, Quoted, Accepted, In Progress, Client Review, Ready for Pickup, Invoiced, Paid, plus Cancelled.

## Claude's role
- **Claude is the owner's main interface**: they ask Claude instead of reading the board.
- **Conventions page = the contract.** Claude reads it before writing anything to a card.
- **Translator:** Claude normalises messy input to the convention format (`⏱ 2.5h · Maria · 2026-11-19 · hem`) and asks rather than guesses.
- **Propose before creating.** Nothing is created without the owner's approval. Re-runs update the existing setup instead of duplicating it.

## Constraints found by testing (19 November 2026)
- The MCP cannot upload files. Photos come in by Superthread email-in or as image URLs in comments; invoices will be a linked page or comment, not an attachment.
- A list's status type is fixed once it holds cards. Several lists can share `completed` (Invoiced and Paid).
- Single line breaks collapse in card descriptions; use bullets.
- `page_get` returns HTML but `page_update` takes markdown and replaces the whole page.
- Not verified yet: where email-in lives in Superthread and whether an emailed photo lands on the right card; the MCP setup path for a brand-new customer.
