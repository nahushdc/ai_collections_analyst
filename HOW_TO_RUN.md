# How to Run Collection Whisperer on Your Local Machine

## Simple Steps (Just Copy & Paste These Commands)

### Step 1: Open Terminal
- Press `Command + Space` on your Mac
- Type "Terminal" and press Enter

### Step 2: Go to the Project Folder
Copy and paste this command into Terminal, then press Enter:
```bash
cd /Users/nahushdc/Documents/DPDzero/collection-whisperer-main
```

### Step 3: Start the Backend Server
Copy and paste this command and press Enter:
```bash
source .venv/bin/activate && cd backend && python3 -m uvicorn main:app --reload --port 8000
```

You should see a message saying the server is running on `http://127.0.0.1:8000`

**Keep this Terminal window open!**

### Step 4: Open a NEW Terminal Window
- Press `Command + N` in Terminal to open a new window
- Or go to Terminal menu → New Window

### Step 5: Start the Frontend
In the NEW Terminal window, copy and paste these commands:
```bash
cd /Users/nahushdc/Documents/DPDzero/collection-whisperer-main/frontend
npm run dev
```

You should see a message with a URL like `http://localhost:5173`

### Step 6: Open in Your Browser
- Click on the URL shown (usually `http://localhost:5173`)
- Or open your web browser and type: `http://localhost:5173`

## You're Done! 🎉

You should now see the Collection Whisperer interface in your browser.

## To Stop the Application
- In each Terminal window, press `Control + C`
- This will stop the servers

## Troubleshooting

**If you get an error about Python packages:**
```bash
cd /Users/nahushdc/Documents/DPDzero/collection-whisperer-main
source .venv/bin/activate
pip3 install -r requirements.txt
```

**If you get an error about npm:**
```bash
cd /Users/nahushdc/Documents/DPDzero/collection-whisperer-main/frontend
npm install
```
