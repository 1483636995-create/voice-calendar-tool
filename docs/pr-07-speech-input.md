# PR 7: Speech Input

## Scope

- Add browser speech recognition hook based on Web Speech API.
- Add speech synthesis hook for assistant replies.
- Connect the voice panel microphone button to live recognition state.
- Keep text input as a fallback command path.
- Reuse the intent parser to preview recognized command type and missing fields.

## Manual Test Notes

- `npm run lint` should pass.
- `npm run build` should pass.
- In Chrome or Edge, clicking the microphone should request microphone permission and show recognized Chinese text.
- Clicking quick commands or submitting text should update the assistant reply.
- The volume button should speak the current assistant reply when speech synthesis is available.
