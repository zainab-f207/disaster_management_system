# Nigehbaan Deployment Guide (100% Free Hosting)

This guide provides step-by-step instructions to deploy your frontend to Vercel, your database to Neon, and your ASP.NET Core backend to Render. All services are 100% free with no credit card required.

---

## ⚠️ Important Note: SQL Server vs. PostgreSQL Mismatch Fixed!

### What Went Wrong:
Your local backend was built using **Entity Framework Core for SQL Server** (`Microsoft.EntityFrameworkCore.SqlServer`). When you configured a **PostgreSQL** database (from Neon) on Render, EF Core tried to parse the `postgresql://...` connection string using SQL Server rules, causing the startup crash:
`Unhandled exception. System.ArgumentException: Keyword not supported: 'postgresql://...'`

### How We Fixed It:
1. **Multi-Database Support**: We added the `Npgsql.EntityFrameworkCore.PostgreSQL` package to the backend.
2. **Dynamic DB Provider Selection**: We modified `Program.cs` to check the connection string prefix. If it starts with `postgresql://` or `postgres://`, the app automatically switches to **PostgreSQL**. Otherwise, it defaults to **SQL Server**.
3. **Migration Fallback**: Since Entity Framework SQL Server migrations cannot run directly on PostgreSQL, we wrapped the migration step in a try-catch. If applying migrations fails, the app falls back to `.Database.EnsureCreatedAsync()`, which directly creates the required tables on the PostgreSQL database.

---

## Part 1: Push Code Changes to GitHub

Commit the database-switching changes and the updated Dockerfile to your GitHub repository:
```bash
git add .
git commit -m "Configure dynamic database provider for PostgreSQL support"
git push origin main
```

---

## Part 2: Database Setup on Neon (PostgreSQL)

Neon provides a fully-managed PostgreSQL database with a free tier that does not require a credit card.

1. Go to **[Neon.tech](https://neon.tech/)** and click **Sign Up** (use your GitHub account).
2. Click **Create a new project**.
3. Name your project (e.g. `nigehbaan-db`).
4. Select the PostgreSQL version (choose **PostgreSQL 16**).
5. Choose a region closest to your target users (e.g., Singapore or Europe for Pakistan).
6. Click **Create Project**.
7. In the dashboard, you will be presented with a connection string. Copy the **ConnectionString** (it starts with `postgresql://...`). Save this for Part 3.

---

## Part 3: Backend API Deployment on Render

We will deploy the ASP.NET Core Web API using Docker, since Render's free tier supports custom Docker containers (via the `Dockerfile` in the root directory).

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
