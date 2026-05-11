@echo off
setlocal
cd /d "%~dp0..\comfy"
python main.py --listen --port 8188 --precision fp16
