#!/bin/bash

# Institutional Risk Analytics & Reporting Dashboard Deployment Script
# Automates updating dipayandey1244.github.io

echo "======= Starting Deployment to GitHub Pages ======="

# 1. Stage changes
echo "Staging files..."
git add .

# 2. Commit changes
COMMIT_MSG="Integrate premium Risk Analytics & Reporting Dashboard with academic methodology and portfolio link card"
echo "Committing changes with message: '$COMMIT_MSG'"
git commit -m "$COMMIT_MSG"

# 3. Push to GitHub
echo "Pushing changes to remote repository (main)..."
git push -u origin main

if [ $? -eq 0 ]; then
  echo "======= Deployment Successful! ======="
  echo "Your portfolio and dashboard will be live shortly at:"
  echo "https://dipayandey1244.github.io/"
  echo "https://dipayandey1244.github.io/risk-analytics-dashboard/"
else
  echo "======= Deployment Failed ======="
  echo "Please check your network connectivity, remote repository permissions, or SSH/token credentials."
fi
