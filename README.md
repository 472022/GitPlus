# GitHub Clone (Frontend + JSON Storage)

This is a high-fidelity **GitHub Clone** built with React 19 and Tailwind CSS. It features a simulated backend using a local JSON file for persistent storage and **Socket.io** for real-time live updates across multiple browser tabs.

## 🚀 Features

*   **Persistent Storage**: All data (repositories, users, files) is stored in `server/data.json`. The app state persists even after refreshing the page.
*   **Live Reload & Sync**: 
    *   **Auto-Save**: Text files are saved automatically as you type (with a slight delay).
    *   **Real-Time Updates**: Changes made in one tab (e.g., creating a repo, editing a file) instantly update all other open tabs without refreshing.
    *   **File Watching**: Manually editing `server/data.json` will also trigger live updates in the app.
*   **Repository Management**: Create repositories, fork existing ones, and view file structures.
*   **File Viewer/Editor**: 
    *   View code with syntax highlighting (simulated).
    *   **Edit mode**: Click the pencil icon to edit files directly in the browser.
    *   **HTML Preview**: "Go Live" button for HTML files.
*   **Social Interactions**: Star and watch repositories.

## 🛠 Tech Stack

*   **Frontend**: React 19, React Router v7, Tailwind CSS, Lucide Icons.
*   **Backend**: Node.js, Express, Socket.io.
*   **Build Tool**: Vite.

## 📦 Installation

Prerequisites: Ensure you have **Node.js** installed.

### 1. Install Frontend Dependencies
Run this in the root project directory:
```bash
npm install
```

### 2. Install Backend Dependencies
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```

## 🏃‍♂️ How to Run

You need to run **two separate terminals** to start the full application.

### Terminal 1: Start the Backend Server
This server handles data storage and real-time sockets.
```bash
cd server
npm run dev
```
> The server will run on `http://localhost:3001`.

### Terminal 2: Start the Frontend Application
Run this in the root directory:
```bash
npm run dev
```
> The app will usually run on `http://localhost:5173` (or `5174` if port is busy).

## 📝 Usage Guide

1.  **Open the App**: Go to the localhost URL provided by the frontend terminal.
2.  **Edit a File**:
    *   Navigate to a repository (e.g., `shadcn/ui`).
    *   Open a file (e.g., `README.md`).
    *   Click the **Edit (Pencil)** icon.
    *   Start typing. Your changes are saved automatically.
3.  **Test Live Sync**:
    *   Open the app in a second browser tab.
    *   Make changes in the first tab.
    *   Watch the second tab update instantly!
