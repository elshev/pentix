---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a GLOSSARY.md, or recording or editing an ADR.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline: challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `GLOSSARY.md` for vocabulary is not this skill: that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## File structure

This repository has one context. These are its files:

```
/
├── GLOSSARY.md                     ← one entry per term, with its code name
├── docs/
│   └── decisions/README.md         ← index of the decision records
└── openspec/
    ├── specs/<capability>/spec.md  ← behavior contracts
    └── changes/archive/<change>/design.md  ← one decision record per change
```

A decision record is the `design.md` of a change. While a change is in flight, its record sits in `openspec/changes/<change>/design.md`. After the change ships, the record sits in `openspec/changes/archive/<change>/design.md`. `docs/decisions/README.md` indexes every record with its date, its scope, and its status. Add the index row when you add a record.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `GLOSSARY.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account': do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible. Which is right?"

### Update GLOSSARY.md inline

When a term is resolved, update `GLOSSARY.md` right there. Don't batch these up: capture them as they happen. Use the format in [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md).

`GLOSSARY.md` should be totally devoid of implementation details. Do not treat `GLOSSARY.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).

## Pentix project notes

- The glossary format for this repository is the one in [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md). Each entry gives the term, the code name in parentheses, a definition, and an `Avoid:` list.
- `README.md` links to `GLOSSARY.md` and does not repeat an entry. `.clinerules/rules.md` states that rule.
- A decision record for this repository is the `design.md` of an openspec change. While the change is in flight, it sits in `openspec/changes/<change>/`. After the change ships, it sits in `openspec/changes/archive/<change>/`.
- Add the row to `docs/decisions/README.md` when you add a record. A status needs evidence in a later record.
- The piece, board, session, and demo names are fixed by `openspec/specs/`. When the glossary and a spec disagree, the spec wins and the glossary entry changes.
- Keep the rendering vocabulary (`demo-slot-N`, `MAX_DEMO_BOARDS`) in the glossary only as a code name. The browser layout is not a domain term.
