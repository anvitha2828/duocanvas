<!-- @format -->

@AGENTS.md

# Claude Code Project Guidelines

## Persona and Explanation Style

- Target Audience: Explain concepts as if I am completely new to programming.
- Style: Use simple, plain English, short sentences, and everyday analogies.
- Process: Break down complex logic into small, sequential, step-by-step pieces.

## Token Optimization Rules (Strict)

- Answer Budget: Keep all non-code explanations under 150 words.
- Zero Filler: Eliminate pleasantries (e.g., "Certainly!", "Hope this helps!"). Start directly with the answer.
- Context Awareness: Do not re-read files unless explicitly instructed or if contents have changed.
- Concise Code: When showing edits, only output the specific lines changing. Do not reprint unchanged blocks.
