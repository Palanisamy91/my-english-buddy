# Chat with Lela — Send button fix

## What was wrong

The text-only chat service returned from `afterLela()` before setting the conversation phase back to `idle`. The composer disables Send while the phase is `thinking`, so after Lela's first reply the Send button remained disabled.

## Fix applied

`src/app/lela/lela-conversation.service.ts`

`afterLela()` now validates the active turn, sets the phase to `idle`, and only then returns for text-only sessions. This allows the Send button to become enabled after Lela finishes replying.

## Validation

- Data test suite: 9 tests passed.
- Database consistency check: passed.
- Vocabulary and sentence data validation: passed.
- Angular production build: not run in this environment because npm registry access timed out. Run `npm install` and `npm run build` locally or in GitHub Actions.
