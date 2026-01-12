@echo off
REM Batch script to update version in HTML files
powershell -ExecutionPolicy Bypass -File "%~dp0update-version.ps1"
