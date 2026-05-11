#!/bin/bash
export ION_HOST=$ION_HOST
export ION_WS=$ION_WS
export ION_MOCK=$ION_MOCK

python main.py --listen --port 8188 --enable-cors
