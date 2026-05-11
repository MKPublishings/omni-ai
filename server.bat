@echo off
set COMFYUI_HOST=%COMFYUI_HOST%
set COMFYUI_WS=%COMFYUI_WS%
set COMFYUI_MOCK=%COMFYUI_MOCK%

python main.py --listen --port 8188 --enable-cors
