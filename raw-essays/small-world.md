---
title: It's a Small World
serial: 5
---

Before transformers and attention[^attention] made large language models useful, the leaders in attention-grabbing "artificial intelligence" were Chess- and Go-playing systems. They began in the 20^th Century as attempts to encode human heuristics in relatively small programs, but programs written this way never grew particularly strong.

[^attention]: ["Attention is All You Need."](https://arxiv.org/abs/1706.03762) This paper is destined for the history books and is well worth reading if you are interested in LLMs---and if you aren't, why are you reading this?

It wasn't until the 1990s, with IBM's Deep Blue, that human grandmasters were finally surpassed. Garry Kasparov's famous 1997 match was widely publicized and discussed. The computational resources and techniques mustered to accomplish this feat were impressive: Deep Blue had 30 conventional cores and 480 custom-built "chess cores" that encoded its search algorithms in hardware.[^deepblue]

[^deepblue]: The [Wikipedia article](https://en.wikipedia.org/wiki/Deep_Blue_(chess_computer)) includes more detail.

Go took longer to crack. Until around 2010, the strongest programs were as strong as an advanced amateur human player. Because of its board size and the combinatorial explosion of its gamespace, it was not tractable to the same kinds of symbolic search that cracked chess. Alongside these programs, though, the application of a algorithm called Monte Carlo Tree Search (MCTS) was being developed.[^monte-carlo]

[^monte-carlo]: ["Monte-Carlo Go Developments."](https://link.springer.com/chapter/10.1007/978-0-387-35706-5_11)

The core idea of MCTS is that recursive simulation of games from each subsequent move allows the program to pick a move based on whether it leads to the highest probability of a win. In other words, it is maximizing a single metric: which move gets me closer to a win? This idea, along with learning algorithms that allowed researchers to compress previous experience into a neural network that guided decisions toward more promising branches, allowed programs to tame the combinatorial complexity of Go. Google DeepMind beat a top player, Lee Sedol, using an MCTS- and neural-network-based system called AlphaGo in 2016.

If you were following computer chess and go programs as a player, what happened next was surprising: since this approach was based on probabilities of a move's success, measured under a game's relatively simple rules, there was nothing limiting their strength to a single game. All perfect-information games could be attacked by the same strategy, and no human input was required to develop the program's strength: given enough chances to play _itself_, producing adjustments to its neural network weights.[^weights] There are freely available engines today for both chess[^chess] and go[^go] that were trained without any human input.

[^weights]: If this sounds like gibberish, I recommend ["But what is a Neural Network?"](https://www.3blue1brown.com/lessons/neural-networks/) from 3blue1brown.
[^chess]: [Leela Chess Zero (Lc0)](https://lczero.org/).
[^go]: [KataGo](https://katagotraining.org/).

This is wonderful if your goal is to have the strongest chess- or go-playing program possible, but their approach leaves a lot to be desired if you want to build new insights into the games, because their approach is too alien. They use massive computational power (over a long period, distilled into weights) to maximize that single metric:

$$
a^*_{\text{engine}} = \arg\max_{a \in A(s)} P(\text{win} \mid s, a)
$$

Humans use heuristics that serve as proxies for win probabilities:

$$
a^*_{\text{human}} \approx \arg\max_{a \in A(s)} H(\text{initiative}, \text{influence}, \text{territory} \mid s, a)
$$

We can learn that a given move is "good" because it gains the initiative while giving up only a small amount of territory, or that it's "bad" despite looking strong and unassailable because we lose too much influence over the rest of the board. The engine might concur with our choice, or it may not---but in either case, it doesn't understand the concepts of  _initiative_, _influence_, and _territory_ in the way that a human does.

We might represent the human process of insight and judgment as conscious balancing of factors that, in turn, are balanced as factors leading to a win.

```tikz
\begin{tikzpicture}[
  node distance=10mm,
  >=Stealth
]
  \node (A) {Move};
  \coordinate[right=10mm of A] (split);

  \node[right=of split] (I) {Influence};
  \node[above=of I] (S) {Initiative};
  \node[below=of I] (T) {Territory};

  \coordinate[right=10mm of I] (merge);
  \node[right=10mm of merge] (V) {$P(\text{win})$};

  \draw (A.east) -- (split);

  \draw[decorate, decoration={snake, amplitude=1pt}]
    (split) -- (S.west);
  \draw[decorate, decoration={snake, amplitude=1pt}]
    (split) -- (I.west);
  \draw[decorate, decoration={snake, amplitude=1pt}]
    (split) -- (T.west);

  \draw[decorate, densely dashed, decoration={snake, amplitude=1pt, segment length=3mm}]
    (S.east) -- (merge);
  \draw[decorate, densely dashed, decoration={snake, amplitude=1pt, segment length=3mm}]
    (I.east) -- (merge);
  \draw[decorate, densely dashed, decoration={snake, amplitude=1pt, segment length=3mm}]
    (T.east) -- (merge);

  \draw[densely dashed, ->] (merge) -- (V.west);
\end{tikzpicture}
```

The machine's process is slightly different.

```tikz
\begin{tikzpicture}
  \node (A) {Move};
  \node[right=of A] (V) {$P(\text{win})$};
  \draw[-{Stealth}]
	(A.east) -- (V.west);
\end{tikzpicture}
```

For humans, perfect-information games are a subset of an important class of problems: problems too large for perfect evaluation that are tractable for our general strategy of insight and heuristics. For machines, they are tractable because input is predictable and they can be provided an evaluation score that boils the desired outcome down to a single measure.

In other words, games form a **small world**: their state is tiny and governed by simple rules, and the world's "time" is moving toward a similarly limited future state. Each player is making decisions to bend the graph of future states toward his own ends, and the game is a competition between **evaluation functions**.

From our standpoint, that isn't intuitively relevant to all of the other things that we can see clankers "thinking" about. In late 2026, for example, there have been a lot of high-profile mathematical proofs published. Surely _those_ reveal that they have achieved superintelligence?!

Well, no. Mathematical proof is also a small world, because it is composed of many sub-proofs that are strung together to build a path from a core set of axioms to the desired outcome. The evaluation function is a score based on automated proof evaluation of the incomplete construction and whether the current attempt seems "closer" to a complete path, similar to AlphaGo.[^alpha-proof]

[^alpha-proof]: This is a drastically simplified explanation, but Google DeepMind has published a paper called ["Olympiad-level formal mathematical reasoning with reinforcement learning"](https://www.nature.com/articles/s41586-025-09833-y) that presents _AlphaProof_.

In fact, all tasks that clankers perform _well_ rely on the encoding of evaluation processes, and the concept of "alignment" is really the struggle of AI researchers to ensure that the general evaluation function they are building into their next model is aligned with their goals. This isn't an easy problem; references to $P(\text{doom})$ within that community are, at least in part, based on worries that the next model may be maximizing for paperclips produced in a way that isn't consistent with human thriving.[^paperclips]

[^paperclips]: You may be interested in Nick Bostrom's essay, ["Ethical Issues in Advanced Artificial Intelligence."](https://nickbostrom.com/papers/ethical-issues-in-advanced-ai/) For a more immediate illustration instead, play the browser game [Universal Paperclips](https://www.decisionproblem.com/paperclips/).

Existential risks aside, software engineers have an advantage over other people who are using AI because almost all of our problems can be decomposed into smaller problems that are tractable to tests and formal verification. As ["Proof or Consequences"][poc] discusses, this doesn't mean that test driven development is the correct approach, but it does mean that we benefit from deterministic, executable assertions about our products.

[poc]: {{ "/essays/proof-or-consequences" | url }}

In other words, the core _task_ of the human half of the co-programming dyad is to shrink the scope of the problems that the clanker is asked to solve until they have the characteristics of a small world. If you use clankers to help derive solutions to the larger questions of design, then the output of that work should be decomposed problems that independent agents can understand and verify with as little context as possible.

Your business problem should be choosing the best move on a chessboard, not solving the "gray cats on a dark road" problem.[^musk]

[^musk]: ["Elon Musk says Tesla is trying to prevent robotaxis from runnig over cats at night."](https://www.businessinsider.com/elon-musk-tesla-trying-to-stop-robotaxis-from-hitting-cats-2026-10) Obviously a very specific reference, but this is a _large-world_ problem: emergent inputs that are breaking a system whose world-evaluation function is inadequate to them.
