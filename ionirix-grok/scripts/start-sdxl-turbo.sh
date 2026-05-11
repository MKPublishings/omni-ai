#!/usr/bin/env bash
set -euo pipefail
export ION_COMFY_WARMUP_ENABLED=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/../comfy"
python main.py --listen --port 8188 --precision fp16
