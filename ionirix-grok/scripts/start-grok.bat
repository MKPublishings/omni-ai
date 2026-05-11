@echo off
setlocal
cd /d "%~dp0..\ion"
python main.py --listen --port 8188 --precision fp16
