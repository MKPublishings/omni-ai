@echo off
setlocal

if defined ion_DIR (
	set "TARGET_DIR=%ion_DIR%"
) else (
	set "TARGET_DIR=C:\ion"
)

if exist "%TARGET_DIR%\run_cpu.bat" (
	set "LAUNCHER=%TARGET_DIR%\run_cpu.bat"
	set "LAUNCHER_DIR=%TARGET_DIR%"
) else if exist "%TARGET_DIR%\main.py" (
	set "LAUNCHER=python main.py --listen --port 8188 --enable-cors --cpu"
	set "LAUNCHER_DIR=%TARGET_DIR%"
) else if exist "%TARGET_DIR%\ion\main.py" (
	set "LAUNCHER=python main.py --listen --port 8188 --enable-cors --cpu"
	set "LAUNCHER_DIR=%TARGET_DIR%\ion"
) else (
	echo [ERROR] Could not find ion launcher under "%TARGET_DIR%"
	echo [HINT] Expected one of:
	echo        %TARGET_DIR%\run_cpu.bat
	echo        %TARGET_DIR%\main.py
	echo        %TARGET_DIR%\ion\main.py
	exit /b 1
)

pushd "%LAUNCHER_DIR%"
set ion_HOST=%ion_HOST%
set ion_WS=%ion_WS%
set ion_MOCK=%ion_MOCK%

if exist "%TARGET_DIR%\run_cpu.bat" (
	call "%TARGET_DIR%\run_cpu.bat"
) else (
	%LAUNCHER%
)
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
