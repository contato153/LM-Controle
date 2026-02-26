# Deployment to Vercel

This project is ready to be deployed to Vercel. Follow these steps:

## Prerequisites

1.  A Vercel account.
2.  A Supabase project (if using Supabase backend).
3.  A Google Gemini API key (if using AI features).

## Steps

1.  **Push your code to a Git repository** (GitHub, GitLab, or Bitbucket).
2.  **Import the project in Vercel**:
    *   Go to your Vercel dashboard.
    *   Click "Add New..." -> "Project".
    *   Select your repository.
3.  **Configure Project Settings**:
    *   **Framework Preset**: Select "Vite".
    *   **Root Directory**: `./` (default).
    *   **Build Command**: `npm run build` (default).
    *   **Output Directory**: `dist` (default).
    *   **Install Command**: `npm install` (default).
4.  **Environment Variables**:
    Add the following environment variables in the Vercel project settings:

    | Variable Name | Description | Example Value |
    | :--- | :--- | :--- |
    | `VITE_USE_SUPABASE` | Set to `true` to enable Supabase backend. | `true` |
    | `VITE_SUPABASE_URL` | Your Supabase Project URL. | `https://your-project.supabase.co` |
    | `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
    | `GEMINI_API_KEY` | Your Google Gemini API Key. | `AIzaSy...` |

5.  **Deploy**: Click "Deploy".

## Troubleshooting

*   **404 on Refresh**: If you encounter 404 errors when refreshing pages, ensure the `vercel.json` file is present in the root directory. It handles client-side routing rewrites.
*   **Supabase Connection Error**: Double-check your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Ensure `VITE_USE_SUPABASE` is set to `true`.
