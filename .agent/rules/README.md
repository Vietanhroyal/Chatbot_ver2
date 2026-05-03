---
trigger: always_on
---

````md
# Coding Rules

## General
- Use TypeScript with strict typing.
- Avoid `any`.
- Use clear names for variables, functions, classes, and files.
- Keep functions small and focused.
- Do not put all logic in one file.
- Separate `controller`, `service`, `repository`, `dto/types`, and `prompt` logic.

## Comments
- Do not comment obvious code.
- Add comments only for business rules, AI reasoning, or complex logic.
- Every `TODO` must explain what needs to be done.

```ts
// If the answer is not grounded in retrieved documents,
// regenerate it with validation feedback.
if (!validation.isGrounded) {
  return answerGenerator.regenerateWithFeedback(input);
}
````

## AI Pipeline

Always follow this flow:

```txt
Safety Check
→ Intent Classification
→ Skill Selection
→ RAG Retrieval
→ Answer Generation
→ Answer Validation
→ Final Response
```

## RAG

* Do not answer unsupported facts.
* Every answer should be grounded in retrieved documents.
* If context is not enough, ask for clarification or say the system does not have enough information.

## Prompt

* Do not hard-code long prompts in services.
* Store prompts in a `prompts/` folder.
* Load only the required skill prompt, not all skills.

## API

* Use RESTful names.

```txt
POST /api/chat/messages
GET /api/conversations/:id
POST /api/knowledge/documents
```

* Use consistent response format.

```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

## Error Handling

* Do not expose internal errors to users.
* Use application-level error classes.
* Log technical details internally.

## Logging

Log important steps:

* user message received
* intent result
* selected skill
* retrieved chunks
* generated answer
* validation result
* final response

## Git

Use clear commit messages:

```txt
feat(chat): add intent classification
fix(rag): handle empty retrieval result
refactor(ai): separate answer validator
```

## Formatting

* 2 spaces indentation
* single quotes
* semicolons
* max line length: 100
* use ESLint and Prettier

```
```
