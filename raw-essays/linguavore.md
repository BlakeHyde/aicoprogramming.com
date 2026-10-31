---
title: The Linguavore
serial: 2
---

The first time anyone with programming or design experience works with a clanker, they are amazed at what they can accomplish. A few words evoke interfaces that would've taken months of painstaking work. Rewrites are easy. Every feature is the work of moments.

It doesn't stay like that, though, does it? Vibe coding falls after a few revisions. Something---a business rule, a UX design requirement, a performance characteristic---falls by the wayside because of the tool's flat attention. You angrily correct it, and the model dutifully adds rules around that mistake. Now that requirement is occupying ten or a hundred times its previous contextual weight, though, and exerts pressure on other requirements because it has been more recently and more explicitly reinforced.

The spiral has begun.

The problem is that vibe coding is the reliance on stream-of-consciousness as a software design principle, and that has never worked in the long term for humans, so why would it work for these tools? The naive sense, upon first contact, that it _should_ is entirely based on the misconception that this is a homogeneously superhuman intelligence with infinite memory and the ability to learn.

None of those premises are true.

Instead, clankers excel in sheer doggedness and are above average in conceptual manipulation, but have very limited fluid memory compared to humans and _can't_ learn because their weights are a different class of information for them than their prompts and are inherently frozen in time. All of that said, we're lucky that tools developed to make software tractable for humans _also help the machine._

The insight necessary to understand how to keep a co-programmed codebase from turning into slop is to recognize that these systems are _linguavores:_ they consume language, process them as inscrutable algebraic values, and emit language again. If we develop our systems as languages, we gradually provide more and more concise ways to express complex ideas, and the clanker can extend and modify these systems without fear.

To put it a different way, we want to be able to limit the scope of a given problem to a piece of the system with known boundaries. The structure of the left sidebar of our primary UX should not be in context when we are developing a new report, for example.

Consider a standard web service that handles database operations for a business application. If you simply instruct an LLM to add support for a new model to that system, there is no meaningful constraint around the implementation, and you will end up with variation depending on the models used and other things that happen to be in context when performing the implementation. However, if you specify different layers of the system carefully, you can use separate agents with empty session contexts other than the layers that are relevant to them.

This separation (in the small) produces coherence (in the large) because each linguavore has been given a language to consume and to produce.
