@echo off
start cmd /k "npm run dev"
timeout /t 3
start http://localhost:3000 