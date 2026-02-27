# Deployment Guide

Since your application uses a persistent Node.js server with Socket.io, it requires a **Split Hosting Strategy**:
1.  **Frontend**: Hosted on **Netlify** (Static hosting).
2.  **Backend**: Hosted on **Render** (Node.js hosting).

---

## Part 1: Deploy Backend to Render

**Render** allows you to host Node.js applications for free.

1.  **Push your code to GitHub**.
    *   Make sure your `server/` folder is committed.
2.  Go to [Render.com](https://render.com) and sign up/login.
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  Configure the service:
    *   **Name**: `sus-backend` (or similar)
    *   **Root Directory**: `server` (Important!)
    *   **Runtime**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `node index.js`
    *   **Free Instance Type**: Select "Free".
6.  Click **Create Web Service**.
7.  Wait for the deployment to finish. Copy the URL (e.g., `https://sus-backend.onrender.com`).

**⚠️ Important Note**: On Render's free tier, the file system is temporary. If the server restarts (which happens automatically), any new files you created via the app will be reset to the original state.

---

## Part 2: Deploy Frontend to Netlify

1.  Go to [Netlify.com](https://netlify.com) and sign up/login.
2.  Click **Add new site** -> **Import from existing project**.
3.  Connect your GitHub repository.
4.  Configure the build settings:
    *   **Build command**: `npm run build`
    *   **Publish directory**: `dist`
5.  **Environment Variables** (Crucial Step):
    *   Click on **Show advanced** or go to **Site Settings > Environment variables** after creation.
    *   Add a new variable:
        *   **Key**: `VITE_API_URL`
        *   **Value**: Your Render Backend URL (e.g., `https://sus-backend.onrender.com`) - **Do not add a trailing slash**.
6.  Click **Deploy site**.

---

## Part 3: Verify

1.  Open your deployed Netlify URL.
2.  The app should load.
3.  It should connect to the Render backend (might take 30-60s to wake up on the free tier).
4.  Try creating a repo or editing a file to verify connection.
