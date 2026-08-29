@echo off
set "PATH=C:\Users\jagan\AppData\Local\Programs\Git\cmd;%PATH%"
cd /d "C:\Users\jagan\Downloads\academic-booking-portal\academic-booking-portal"

echo ========================================================
echo  Pushing Academic Booking Portal to GitHub...
echo ========================================================

git config http.sslVerify false
git config http.schannelCheckRevoke false
git remote set-url origin https://github.com/keerthanaaruvi2008-source/academic-booking-portal.git
git branch -M main

echo.
echo Pushing commits to https://github.com/keerthanaaruvi2008-source/academic-booking-portal ...
git push -u origin main

echo.
echo ========================================================
echo  Done! Press any key to exit.
echo ========================================================
pause
