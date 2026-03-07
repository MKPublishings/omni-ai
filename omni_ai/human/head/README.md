# omni_ai.human.head

A structured, queryable model of the human head inside Omni Ai.

## Subsystems

- `brain` - cortical and subcortical regions
- `nerves` - cranial nerves and innervation
- `senses` - vision, hearing, smell, taste, somatosensory
- `skeletal` - skull and facial bones
- `muscles` - facial expression and mastication
- `vascular` - arteries, veins, dural sinuses
- `glands` - salivary and lacrimal glands
- `integration` - functional graphs (smile, chew, speak, etc.), search, trace

## Core API

```python
from omni_ai.human import head_api

# Explain a function
resp = head_api("integration", "explain_function", {"name": "smile"})

# Search structures
resp = head_api("integration", "search", {"query": "facial"})

# Get a muscle
resp = head_api("muscles", "get_muscle", {"id": "masseter"})
```

All operations use a unified `HeadRequest`/`HeadResponse` envelope.
