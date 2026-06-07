# Agent Instructions

## Plain-language product copy

This app must stay understandable to non-technical users. Be strict: avoid unnecessary user-facing jargon in pages, components, metadata, alt text, labels, buttons, toasts, modals, empty states, validation errors, or API error messages that can reach the UI.

Payment and donation flows are an exception where precise terms are expected. It is okay to use clear payment vocabulary such as `wallet`, `wallet address`, `USDC`, `Base`, `transaction hash`, `signature`, and `authorization` when those terms help users understand or complete the payment.

### Banned user-facing terms

Do not show terms like:

- `did:plc`, `DID`, `rkey`, `URI`, `CID`, `repo`, `record`, `schema`, `collection`
- `AT Protocol`, `ATProto`, `atproto`, `PDS`, `indexer`, `Hyperindex`, `GraphQL`, `API`, `endpoint`, `JSON`
- `facilitator`, `attestation`, `on-chain`, `blockchain`, `crypto`
- `Darwin Core`, `GBIF`, `GeoJSON`, `Shapefile`, `CSV`, `TSV`, `Kobo`, `dataset`, `column mapping`
- `infrastructure`, `operational`, `uptime`, `incident`, `dashboard`, `analytics`

Internal code may still use protocol names, types, route params, comments, and constants when needed, but user-facing copy must translate them.

### Preferred plain-language replacements

Use replacements like:

- `profile`, `public profile`, `organization profile`
- `Bumicert`, `impact story`, `project story`, `checked certificate`
- `project place`, `project area`, `drawn map area`, `map location`
- `nature sighting`, `tree information`, `field sound recording`
- In general copy: `payment details`, `completed gift`, `public donation note`
- In donation and wallet flows: use exact terms like `wallet`, `wallet address`, `USDC`, `Base`, and `transaction hash` when they are accurate
- `site health`, `services running`, `working`, `slow`, `not working`
- `file`, `spreadsheet export`, `file heading`, `tree group`, `photo folder`

### Before finishing changes

Run a user-facing copy scan for banned words in `app/` and `components/` and manually inspect matches. Many matches will be internal code; every visible string should be plain language.

Also run:

```bash
pnpm build
```
