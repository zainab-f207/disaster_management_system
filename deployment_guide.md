# Nigehbaan Deployment Guide (100% Free Hosting)

Follow these step-by-step instructions to deploy your frontend to Vercel, your database to Neon, and your ASP.NET Core backend to Render. No credit card is required for any of these steps.

---

## Part 1: Push Project to GitHub

Before beginning, ensure that your entire project (including both backend folders and the `disaster-response-frontend` folder) is pushed to a GitHub repository.
If you haven't initialized Git yet:
1. Open Git Bash or terminal in the project root (`Pakistan-Disaster-Response-System`).
2. Run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Nigehbaan"
   ```
3. Create a public or private repository on [GitHub](https://github.com).
4. Run the commands provided by GitHub to link your local repository and push:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

---

## Part 2: Database Setup on Neon (PostgreSQL)

Neon provides a fully-managed PostgreSQL database with a free tier that does not require a credit card.

1. Go to **[Neon.tech](https://neon.tech/)** and click **Sign Up** (use your GitHub account).
2. Click **Create a new project**.
3. Name your project (e.g. `nigehbaan-db`).
4. Select the PostgreSQL version (choose the latest, e.g. **PostgreSQL 16**).
5. Choose a region closest to your target users (e.g., Singapore or Europe for Pakistan).
6. Click **Create Project**.
7. In the dashboard, you will be presented with a connection string. Copy the **ConnectionString** (it starts with `postgresql://...`). Save this for Part 3.

---

## Part 3: Backend API Deployment on Render

We will deploy the ASP.NET Core Web API using Docker, since Render's free tier supports custom Docker containers (via the `Dockerfile` we created in the root directory).

1. Go to **[Render.com](https://render.com/)** and click **Sign Up** (sign up using GitHub to avoid card requirements).
2. Click the **New +** button in the top right and select **Web Service**.
3. Under "Connect a repository", select your GitHub repository and click **Connect**.
4. In the configuration settings:
   - **Name**: Enter `nigehbaan-api`.
   - **Region**: Choose the same region you selected in Neon (e.g., Singapore or Europe) to ensure minimum latency.
   - **Branch**: Select your main branch (usually `main`).
   - **Root Directory**: Leave it blank (the Dockerfile is in the workspace root).
   - **Runtime**: Select **Docker**. (Render will automatically detect the `Dockerfile` in the root).
   - **Instance Type**: Select the **Free** tier ($0/month).
5. Expand the **Advanced** section or click the **Environment** tab:
   - Click **Add Environment Variable**.
   - **Key**: `ConnectionStrings__DefaultConnection`
   - **Value**: Paste the Neon PostgreSQL connection string you copied in Part 2.
   - Click **Add Environment Variable** again:
     - **Key**: `ASPNETCORE_ENVIRONMENT`
     - **Value**: `Production`
6. Click **Create Web Service** at the bottom of the page.
7. Render will build the container using the Dockerfile and deploy it. Once the build finishes, copy the URL of your live API (e.g., `https://nigehbaan-api.onrender.com`).

---

## Part 4: Frontend Deployment on Vercel

Vercel is the easiest and most powerful static site hosting platform, with a rich free tier and no credit card required.

1. Go to **[Vercel.com](https://vercel.com/)** and click **Sign Up** (log in using GitHub).
2. Click **Add New** -> **Project**.
3. Find your GitHub repository and click **Import**.
4. Configure the project:
   - **Framework Preset**: Select **Vite**.
   - **Root Directory**: Set this to `disaster-response-frontend` (click Edit and select the folder).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand the **Environment Variables** section:
   - **Key**: `VITE_API_URL`
   - **Value**: Paste the live Render API URL you copied in Part 3 (e.g., `https://nigehbaan-api.onrender.com`).
6. Click **Deploy**.
7. Once deployed, Vercel will give you a public URL (e.g., `https://nigehbaan.vercel.app`).
8. Page refreshes are automatically handled by the `vercel.json` rewrite file we added.

---

## Part 5: Syncing the Backend CORS (Optional but Recommended)

To ensure that your backend allows API requests from your Vercel URL, open the backend `Program.cs` or app settings and ensure your Vercel URL is added to the allowed CORS origins (or configured to allow any origin in development/production if desired).
