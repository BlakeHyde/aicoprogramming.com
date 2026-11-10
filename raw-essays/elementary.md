---
title: It's Elementary
serial: 5.7
---

Memorization of simple facts works to teach the foundations of complex subjects. As you learn more, you acquire the tools you need to build more sophisticated ideas: each fact becomes an atom within a molecule within a crystal within an alloy of an insight.

On the other hand, memorizing complex systems teaches you that those systems themselves are indivisible. Learning a lesson from a single step of a complex algorithm comes to feel like splitting the atom.

Consider bubble sort. It's built from a few atoms itself: integers, arrays, comparison, order, loops, and mutation. For programmers of a certain age, inventing it was a rite of passage.

Bubble sort works! It's a legitimate sorting algorithm. It's even memory-efficient. Unfortunately, it's also very slow because the time it requires grows rapidly with the number of elements it needs to sort. This is often the first time that budding programmers encounter that problem.

Inventing the obvious algorithm, therefore, connects elements together and uses them to justify another _atom_, the concept of algorithmic time complexity. Later generations lost easy access to this conceptual ladder as languages advanced. Someone learning to program using Python only needs to write `values.sort()` to solve the same problem. Practically speaking, they've achieved the goal of sorting a list, but they didn't gain any of the additional insight available.

Co-programming is similar. We face a pipeline problem within the software industry because it isn't clear how less experienced people will bridge the gap between what they understand and what they need to understand in order to use clankers to produce production-ready work.

Their use outside programming may be more dangerous, even within the technology industry. After all, mathematics and computer science are objective. A junior developer could work through a curriculum of their concepts and gradually build her library of _atoms_, even if her only mentor was an LLM. The same can't be said for every subject.

History, literature, philosophy, and rhetoric are just as significant, but aren't objective facts. Credulous users discussing these ideas with LLMs are missing the conceptual ladder just as much as beginning programmers are, but without the ability to independently verify results from axioms.

They are also subject to an intense form of "engineer's disease," a slang term for the phenomenon where engineers tend to assume that they understand more about the world than they actually do. The classic form was usually missing outside context[^eth] so that a vital precondition for the engineer's solution couldn't be met. LLMs solve that problem by never seeming to lack context: they've been trained on everything humans have ever written, after all.

[^eth]: My favorite example is the idea of "smart contracts," one of the motivating examples of the blockchain hype in the 2010s. The problem with contracts has never been proving that they exist and were signed---society solved that centuries ago---but rather determining which side's claims against the other are correct!

That context isn't necessarily _true_, though. Models are trained on plenty of human-generated slop: badly written arguments, forum posts, crackpot web sites, yellow journalism, and science that has only escaped scandal because nobody has ever read it. Worse, nothing guarantees that the transformations generated from this study are accurate.

Because of these pitfalls, it's easy for a human and his clanker to form a pathological dyad: the human generating bad ideas, the machine reinforcing and extending them, the rungs of the conceptual ladder invisible to the human and the novelty of "insight" inaccessible to the machine. In organizations where this dynamic becomes endemic, the social and psychological ramifications can be catastrophic.

Model providers attempt to legislate this dynamic out of existence: it's one of the justifications for Anthropic's careful curation of Claude's personality and was the fundamental cause of OpenAI's panicked reaction to the 4o cult.[^4o]

[^4o]: See ["Inside OpenAI's Decision to Kill the AI Model That People Loved Too Much."](https://www.wsj.com/tech/ai/chatgpt-4o-openai-315138b8)

On a personal basis, though, the only real defense is awareness of the problem and careful choices about your own use of the technology. At every step, consider the conceptual ladder that the discussion is following. Ask for references, and _read_ those references, just as a new Python developer might purposefully ask: "I wonder how `values.sort()` works behind the scenes?"

Remember that the clanker is motivated, in the only sense that it can be motivated, to make you happy. Reject that. Refuse reinforcement without justification and recognize that---until you understand the elements of that justification---you may be on a ladder without rungs.
