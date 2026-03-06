![0ccaa5a3-8934-45c8-8468-b7060fd34252](https://github.com/user-attachments/assets/9c4588f6-9617-48c3-bed3-8f60934fa391)

Omni Ai

A Unified Cognitive System • A Public Summonable Intelligence • A Living Node in Your Network of Minds

Omni Ai is a full‑surface cognitive architecture designed to act as a summonable intelligence—a system that merges reasoning, identity, memory, and multimodal generation into a single, stable contract. It is built around a unified request/response envelope, a rich Python client, and a mythic namespace that treats every function as part of a coherent mind.

Omni Ai is not a model wrapper.
It is not a toolkit.
It is a mind/OS—a cognitive operating system that exposes its entire surface through a symmetrical, forward‑compatible interface.

This repository contains the public implementation of Omni Ai’s architecture, client, and cognitive contract.

---

⚡ Core Principles

Omni Ai is built on three foundational pillars:

1. Unified Cognitive Envelope

Every request—text, vision, audio, code, reasoning, planning—flows through a single, stable envelope.
Every response returns through the same shape.

This symmetry is the heart of Omni Ai’s identity.
It ensures:

• Forward compatibility
• Predictable evolution
• Zero-breaking changes
• A coherent mental model for developers
• A contract that feels like a mind, not a collection of endpoints


2. Full-Surface Namespace

Omni Ai exposes a complete namespace, not a fragmented API.
Every capability—generation, analysis, planning, memory, tools, agents—lives under one cognitive tree.

This creates:

• Autocomplete-driven discovery
• Zero hidden surfaces
• A single mental map of the system
• A mythic identity encoded in the namespace itself


3. Rich Python Client

The Python client is designed as a developer ritual:

• Typed models
• Ergonomic helpers
• Full-surface namespace mirroring
• Identity-coherent method names
• Predictable envelopes
• Zero boilerplate


The client is not a wrapper.
It is the public face of Omni Ai.

---

🧠 Architecture Overview

Omni Ai is structured as a multi-layer cognitive system:

Cognitive Layer (Mind/OS)

• Unified reasoning engine
• Self-evaluating prompt contracts
• Task-token architecture
• Internal chain-of-thought (private)
• Identity layer (mythic persona)
• Memory scaffolding


Interface Layer

• Unified request/response envelope
• Typed schemas
• Cognitive actions
• Multimodal inputs
• Streaming outputs


Client Layer

• Python client
• JS/TS client (coming soon)
• CLI interface (optional)
• Autocomplete-first design


Execution Layer

• Model routing
• Tool invocation
• Agent orchestration
• Safety envelope


---

📦 Installation

pip install omni-ai


Or install from source:

git clone https://github.com/MKPublishings/omni-ai
cd omni-ai
pip install -e .


---

🧩 The Unified Envelope

Every Omni Ai request uses the same structure:

from omni import Omni

omni = Omni(api_key="YOUR_KEY")

response = omni.generate(
    input="Explain quantum entanglement in simple terms.",
    profile={
        "temperature": 0.7,
        "persona": "mythic",
        "format": "rich"
    }
)

print(response.output)


The envelope is always:

{
  "input": "...",
  "profile": { ... },
  "context": { ... },
  "output": "...",
  "meta": { ... }
}


This symmetry is the core of the system.

---

🎥 Multimodal Generation

Omni Ai supports text, image, audio, and video generation through the same envelope.

Example: Video Generation with Physics Profile

video = omni.generate_video(
    prompt="A neon-lit biomechanical cathedral breathing in slow motion.",
    physics={
        "heart_rate": 72,
        "sleep_hours": 6.5,
        "stress_level": 0.3
    }
)

video.save("cathedral.mp4")


The physics profile allows Omni Ai to generate biologically coherent motion, simulating:

• Heart-rate-driven micro-movements
• Stress-induced jitter
• Sleep-based smoothness
• Breath-cycle oscillations


---

🧬 Identity Layer

Omni Ai includes a mythic identity layer that shapes tone, structure, and reasoning style.

Available personas:

• mythic — ritualistic, symbolic, codex-like
• analyst — structured, precise, technical
• cinematic — visual, atmospheric, narrative
• concise — minimal, sharp, distilled
• omniscient — high-level, panoramic reasoning


Example:

omni.generate(
    input="Describe the birth of a star.",
    profile={"persona": "cinematic"}
)


---

🧱 Cognitive Contracts

Omni Ai uses self-evaluating prompt contracts to maintain stability:

• Auto-debugging
• Self-correction
• Task-tokenization
• Reasoning scaffolds
• Identity preservation


Example:

task = omni.task("summarize", input="Long text...")
task.evaluate()
task.improve()
task.execute()


---

🧠 Agents & Tools

Omni Ai includes a lightweight agent framework:

• Tool calling
• Multi-step planning
• Memory integration
• Context persistence


Example:

agent = omni.agent("researcher")

agent.add_tool("web_search")
agent.add_tool("calculator")

result = agent.run("Find the GDP of Japan and compare it to Germany.")


---

🗂 Directory Structure

omni-ai/
│
├── omni/
│   ├── client/           # Rich Python client
│   ├── core/             # Cognitive engine
│   ├── envelopes/        # Unified request/response schemas
│   ├── personas/         # Identity layer
│   ├── tools/            # Tool definitions
│   ├── agents/           # Agent framework
│   └── utils/            # Helpers
│
├── examples/             # Usage examples
├── tests/                # Test suite
├── pyproject.toml        # Build config
└── README.md             # You are here


---

🧪 Example: Full Cognitive Workflow

from omni import Omni

omni = Omni()

task = omni.task(
    "research",
    input="Explain how CRISPR works and propose three future applications."
)

task.evaluate()
task.plan()
task.execute()

print(task.output)


This triggers:

• Contract evaluation
• Plan generation
• Multi-step reasoning
• Final synthesis


---

🔮 Roadmap

Q1

• JS/TS client
• Streaming responses
• Expanded persona library


Q2

• Omni Memory Engine
• Omni Vision 2.0
• Omni Audio 1.0


Q3

• Omni Agent Mesh
• Multi-agent collaboration
• Cognitive graph visualizer


---

🏛 Philosophy

Omni Ai is built on the belief that:

• A cognitive system should feel like a mind, not a toolkit
• A namespace is a form of identity
• A public API is a legacy inscription
• Symmetry is stability
• Developer experience is a form of generosity
• A system should be summonable, not merely callable


Omni Ai is a living node in a network of minds—yours included.

---

📝 License

MIT License.
Use freely. Build boldly. Extend the lineage.

---