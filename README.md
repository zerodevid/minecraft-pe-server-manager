# Bedrock Server Panel

![Bedrock Panel](https://placehold.co/600x400?text=Bedrock+Panel)

Bedrock Server Panel is a web UI for the Minecraft Bedrock Dedicated Server (BDS). It wraps the BDS process, exposes a friendly dashboard for packs/worlds/settings, and integrates with Telegram so you can keep an eye on the server from anywhere.

---

## 🌟 Features

- **Server lifecycle** – start/stop/restart the BDS process, enable auto-restart after crashes, and view the live console stream.
- **World & pack manager** – import/export `.mcworld`, `.zip`, and `.mcpack` files, clean pack names, and sync `world_resource_packs.json` / `world_behavior_packs.json` automatically.
- **Real-time player view** – see players, XUIDs, and ping in real time; player join/leave diffing powers Telegram alerts.
- **Server settings editor** – edit `server.properties` via a validated form with descriptions for every field.
- **Telegram bot** – get notifications for start/stop/player activity/bans and hourly status reports that include RAM usage and your server IP.

---

## ✅ Requirements

1. **Node.js** v16 or later.
2. **Bedrock Dedicated Server** files downloaded from [minecraft.net](https://www.minecraft.net/en-us/download/server/bedrock).
3. Modern browser for the admin panel.
4. *(Optional)* Telegram bot token + chat ID if you want notifications or remote commands.

---

## 🚀 Getting Started

### 1. Clone and install

```bash
git clone https://github.com/zerodevid/minecraft-pe-server-manager.git
cd minecraft-pe-server-manager
npm install
```

### 2. Configure your `.env`

Create a `.env` (or edit the existing one) in the project root:

```dotenv
# Path to the folder that contains bedrock_server and server.properties
BDS_DIR=/absolute/path/to/bds

# Optional: overrides the IP announced in Telegram reports
SERVER_IP=play.example.com
```

If `BDS_DIR` is omitted, the bundled `./bds` directory is used. Place your Bedrock server files there or point the variable to another location. On macOS/Linux remember to `chmod +x bedrock_server`.

### 3. Run the panel

```bash
# Start the API + panel (builds Tailwind once)
npm run dev

# Optional: watch Tailwind while developing styles
npm run dev:css
```

The panel lives at [http://localhost:4000](http://localhost:4000).

For a production build you can precompile with `npm run build` and then use `npm start` (which re-builds CSS and launches the server via `ts-node`).

---

## 📨 Telegram Setup

1. Open **Settings → Telegram Notifications** inside the panel.
2. Talk to [@BotFather](https://t.me/BotFather) to create a bot and grab the **bot token**.
3. Send a message to the bot (or add it to a group) and find the **chat ID**.
4. Paste both values in the panel, toggle the events you want (Server Start/Stop, Player Join/Leave, Player Ban, Hourly Status), then click **Save**.
5. Use the **Test Message** button to verify delivery.

The Telegram bot also accepts commands such as `/status`, `/list`, `/restart`, `/kick <name>`, `/ban <name>`, and forwards any other text as a console command.

---

## 🔄 Running 24/7 with PM2

```bash
npm install -g pm2
pm2 start npm --name "bedrock-panel" -- run start
pm2 save
pm2 startup   # follow the printed instructions
```

PM2 will relaunch the panel after crashes or reboots.

---

## 🗂️ Project Structure

```
minecraft-pe-server-manager/
├── bds/                     # Bedrock server files (not committed)
├── public/                  # Static assets (HTML/CSS/JS, Tailwind output)
├── src/
│   ├── config.ts            # Resolves paths and validates BDS directory
│   ├── server.ts            # Express app + WebSocket bootstrap
│   ├── controllers/         # HTTP API handlers
│   ├── services/
│   │   ├── bedrockProcess.ts   # Wraps the BDS child process
│   │   ├── telegramBot.ts      # Notification and bot command logic
│   │   ├── worldManager.ts     # Import/export/backup logic
│   │   └── serverProperties.ts # Parser + serializer for server.properties
│   ├── styles/              # Tailwind entry file
│   └── utils/               # Helpers (cookies, hashing, etc.)
├── public/css/tailwind.css  # Generated stylesheet
├── panel-settings.json      # Created automatically to store panel auth + telegram config
└── package.json
```

---

## 📝 License

MIT License. See `LICENSE` for details.
