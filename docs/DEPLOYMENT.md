# Deployment Guide (Docker)

To ensure this platform runs optimally without "API Exhaustion" (serverless timeouts) when the AI code review takes 1-2 minutes to process a large file, the recommended deployment strategy is a **Dockerized Virtual Private Server (VPS)**. 

You can deploy this on AWS (EC2), Google Cloud (Compute Engine), or DigitalOcean (Droplet).

## Prerequisites
1. A Linux server (Ubuntu 22.04 recommended)
2. Git installed
3. Docker & Docker Compose installed

## Deployment Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/AI-Code-Review-Agent.git
   cd AI-Code-Review-Agent
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory to store your API keys securely:
   ```bash
   GEMINI_API_KEY=your_gemini_key_here
   XAI_API_KEY=your_xai_key_here
   JWT_SECRET_KEY=super_secure_random_string
   ```

3. **Start the Application**
   Run the following command to build the containers and launch the application in the background:
   ```bash
   docker-compose up --build -d
   ```

4. **Access the Portal**
   - Developer Portal (Next.js): `http://<your-server-ip>:3000`
   - Backend API Docs (FastAPI): `http://<your-server-ip>:8000/docs`

## Production Configuration Notes
- **Domain Names**: If you attach a domain name (e.g., `code-scanner.yourdomain.com`), you must use a reverse proxy like **Nginx** or **Caddy** to route port `80/443` to `3000` and `8000`. 
- **CORS / API URL**: When deploying to a real domain, remember to edit `docker-compose.yml` and change `NEXT_PUBLIC_API_URL` to point to the public domain of the backend API (e.g., `https://api.code-scanner.yourdomain.com`).
- **Data Persistence**: The docker compose file maps a local volume `backend_data:/app/data` to ensure all generated PDF reports and your SQLite database persist even if the container restarts.
