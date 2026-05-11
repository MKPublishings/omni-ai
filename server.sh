#!/bin/bash
export COMFYUI_HOST=$COMFYUI_HOST
export COMFYUI_WS=$COMFYUI_WS
export COMFYUI_MOCK=$COMFYUI_MOCK

python main.py --listen --port 8188 --enable-cors
