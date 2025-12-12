# Bedrock Server Panel

A web-based control panel for managing a Minecraft Bedrock Dedicated Server (BDS). This application provides a modern dashboard to control the server state, manage worlds, configure resource/behavior packs, and edit server properties.

## Features

-   **Dashboard**: Start/Stop/Restart server, view real-time console logs, and monitor online players.
-   **Pack Management**: Upload `.mcpack` files, enable/disable packs per world. Auto-cleans pack names (removes color codes).
-   **World Management**: Import worlds (`.mcworld` or `.zip`), select active level, and backup worlds.
-   **Settings Editor**: GUI for `server.properties` and whitelist management.
-   **Auto-Restart**: Automatically restarts the server if it crashes.

## Prerequisites

-   [Node.js](https://nodejs.org/) (v16 or higher)
-   Minecraft Bedrock Dedicated Server for command line ("bedrock_server" binary).

## Installation

1.  **Clone the Repository** (or download source code):
    ```bash
    git clone <repository_url>
    cd bedrock-panel
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Bedrock Server**:
    -   Download the Bedrock Dedicated Server software from the [official website](https://www.minecraft.net/en-us/download/server/bedrock).
    -   Extract the downloaded files into a `bds` folder inside the `bedrock-panel` directory.
    -   **Important**: Ensure the `bedrock_server` executable is directly inside `bedrock-panel/bds/`.

    *Directory Structure:*
    ```
    bedrock-panel/
    ├── bds/
    │   ├── bedrock_server
    │   ├── server.properties
    │   └── ...
    ├── src/
    ├── server.js
    └── ...
    ```

    *Alternatively, you can point to an existing BDS installation by creating a `.env` file:*
    ```env
    BDS_DIR=/absolute/path/to/your/bedrock-server-folder
    PORT=4000
    ```

## Usage

1.  **Start the Panel**:
    ```bash
    npm start
    ```

2.  **Access the Dashboard**:
    Open your browser and navigate to `http://localhost:4000`.

## Auto-Start on Boot (Optional)

To ensure the panel starts automatically when your computer restarts, use [PM2](https://pm2.keymetrics.io/).

1.  **Install PM2**:
    ```bash
    npm install -g pm2
    ```

2.  **Start the application with PM2**:
    ```bash
    pm2 start npm --name "bedrock-panel" -- run start
    ```

3.  **Save the process list**:
    ```bash
    pm2 save
    ```

4.  **Generate startup script**:
    ```bash
    pm2 startup
    ```
    (Copy and paste the command PM2 outputs to finish setup).

## Troubleshooting

-   **"Pack changes not saving"**: Ensure the server is stopped before enabling/disabling packs to avoid file conflicts, although the panel tries to handle sync automatically.
-   **"Permission denied"**: On Linux/Mac, ensure `bedrock_server` has execute permissions: `chmod +x bds/bedrock_server`.

## License

MIT
