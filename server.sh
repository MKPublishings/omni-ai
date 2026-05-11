#!/bin/bash
export ion_HOST=$ion_HOST
export ion_WS=$ion_WS
export ion_MOCK=$ion_MOCK

python main.py --listen --port 8188 --enable-cors
