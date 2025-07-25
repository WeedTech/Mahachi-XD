#!/bin/bash

clear

cat <<"EOF"
  __  __           _     _  _  __  __ 
 |  \/  | __ _ ___| |__ | || ||  \/  |
 | |\/| |/ _` / __| '_ \| || || |\/| |
 | |  | | (_| \__ \ | | |__   _| |  | |
 |_|  |_|\__,_|___/_| |_|  |_||_|  |_|
                                     
           MAHACHI-XD Bot Setup
EOF

echo ""
echo "Welcome to MAHACHI-XD setup for Termux!"
echo "This script will install necessary tools and start your bot."
echo ""

# Check Node.js and git
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found! Installing nodejs and git..."
  pkg update -y && pkg upgrade -y
  pkg install nodejs git -y
else
  echo "Node.js detected."
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Git not found! Installing git..."
  pkg install git -y
else
  echo "Git detected."
fi

# Clone or update repo
if [ ! -d "MAHACHI-XD" ]; then
  echo "Cloning MAHACHI-XD repo..."
  git clone https://github.com/WeedTech/Mahachi-XD.git 
else
  echo "MAHACHI-XD directory exists, updating..."
  cd MAHACHI-XD && git pull origin main && cd ..
fi

cd MAHACHI-XD

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Ask user for their WhatsApp number inline
read -p "Enter your WhatsApp number with country code (no + or spaces, e.g. 2637xxxxxxx): " BOT_NUMBER

echo ""
echo "Starting the bot with your number: ${BOT_NUMBER:0:3}xxxxxxx"
echo ""

# Start the bot with inline environment variable
NUMBER=$BOT_NUMBER node index.js