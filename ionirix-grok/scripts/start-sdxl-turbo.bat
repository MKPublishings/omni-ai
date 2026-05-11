@echo off
setlocal
set "ION_COMFY_WARMUP_ENABLED=0"
cd /d "%~dp0..\comfy"
python main.py --listen --port 8188 --precision fp16
