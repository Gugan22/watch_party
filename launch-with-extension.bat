@echo off
echo Starting Google Chrome with WatchParty Extension loaded...
start chrome.exe --load-extension="%~dp0apps\extension" "http://localhost:3000/room/stage-ott-verify?host=true"
exit
