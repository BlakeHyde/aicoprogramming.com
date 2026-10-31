---
title: "The Premises of Co-Programming"
serial: 1
---

Clankers are tireless workers. They don't get demoralized when their ideas aren't used, they don't question your authority to give them direction, they don't start to think about the weekend on Thursday afternoon.

In fact, clankers don't "think" at all.

This can be a challenging concept to hold on to as you see them become capable of more and more demanding "knowledge work," replacing even complex tasks with a few prompts or a tool call.

The reality is that these systems are functions of input to output, with a large hidden parameter that we might think of as an immutable "world model"---their weights. It turns out that this is enough to enable complex systematic work, even at a conceptual level, without the further requirement of consciousness. That's a disconcerting concept on its face, particularly in fields where even the "rote" work has served as a large barrier to entry like computer science and mathematics.

It also comes with significant limitations, though.

The clanker is not capable of judgment. If you ask it directly to assess a design, it can do so with some heuristics that exist as part of its training data, and this output can be useful. However, it can't fully be trusted: it's possible to argue them out of _any_ judgment with minimal effort, demonstrating how paper-thin the assessments are.

Worse, judgment is a prerequisite for understanding what matters and what doesn't. A clanker-written story might start with "I ate an egg salad sandwich for lunch, got a haircut, and later cut off my leg with a chainsaw," whereas a human knows that one of those events is more meaningful than the other and deserves pride of place. The peculiar flatness of AI writing reveals that it never fully commits itself to an idea.

This is disastrous for programming as codebases grow beyond the context window and accumulate warts that accommodate edge cases. Every `if-else` represents a chance to drop an important requirement because a trivial UX decision requires more context and the model can't distinguish between vital choices and trivial matters. As the slop grows, harnesses become paranoid about allowing models to remove anything, and the chaotic decay of the project accelerates recursively.

**Co-Programming** is my philosophy of using these tools to their greatest potential without falling into their traps.

I hope you'll come along with me as I develop it.
