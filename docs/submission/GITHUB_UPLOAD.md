# Upload BrandGate to GitHub (Windows)

The ZIP is a standalone source package. Extract it somewhere outside the existing `PROJECT` Git repository, for example `C:\BrandComplianceCopilot`. Do not run `git add .` from the parent `PROJECT` folder; that folder contains unrelated projects.

## Option A — Command Prompt (CMD)

1. Create an **empty** GitHub repository in your account. Do not initialize it with a README, license, or `.gitignore`.
2. Download and extract `BrandGate_Round2_Source.zip` so the project root is `C:\BrandComplianceCopilot`.
3. Open **Command Prompt** (not PowerShell) and run:

```cmd
cd /d "C:\BrandComplianceCopilot"
git init
git add .
git status --short
git diff --cached --check
git commit -m "feat: submit BrandGate Round 2"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the URL with the HTTPS URL copied from your empty GitHub repository. Do not type the example URL literally. If Git asks for your identity, use your own name/email:

```cmd
git config user.name "Your Name"
git config user.email "you@example.com"
```

After the push, refresh the GitHub repository page. Copy that page URL into `[[GITHUB_REPOSITORY_URL]]` in the submission PDF/checklist.

## If you are using PowerShell

PowerShell does not accept CMD's `cd /d`. Use this instead, then run the Git commands above one at a time:

```powershell
Set-Location "C:\BrandComplianceCopilot"
```

## Run and view the app locally

From the extracted project folder, install dependencies once and start the local app:

```cmd
cd /d "C:\BrandComplianceCopilot"
npm install --prefix frontend
py -m pip install -r backend\requirements.txt
npm run dev
```

Open the **frontend URL printed by the command** (typically `http://127.0.0.1:5178/`). Keep that terminal open. This is a local preview on your computer, not a working public link. The API root is not a website; `/docs` shows API documentation.

## To make the project link public

A public link needs the frontend and FastAPI backend deployed to hosting and configured with the backend HTTPS URL in `VITE_API_URL`, plus allowed frontend origins. See `DEPLOY.md`. No hosting credentials or public deployment URL are currently available, so do not list a localhost link as the working project link. After deployment, replace `[[PUBLIC_APP_URL]]` and test the sample flow from a fresh browser.
