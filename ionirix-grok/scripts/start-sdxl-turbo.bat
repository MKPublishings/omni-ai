@echo off
setlocal
set "ION_Ion_WARMUP_ENABLED=0"
cd /d "%~dp0..\ion"
python main.py --listen --port 8188 --precision fp16
