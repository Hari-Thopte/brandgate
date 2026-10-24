# Git setup (run only from a clean Brand Review copy)

The current workspace is inside a parent Git repository that contains unrelated projects and staged changes. Do not commit from the parent repository. The commands below are for a standalone copy of `BrandComplianceCopilot/` after reviewing `docs/PROJECT_FILES.md`.

```powershell
cd "C:\Users\Ishan\OneDrive\Documents\ChatGPT\PROJECT\BrandComplianceCopilot"
# Set these yourself; do not use a placeholder as your Git identity.
git config user.name "YOUR NAME"
git config user.email "YOUR EMAIL"
git init
git add .
git status --short
git diff --cached --check
git commit -m "feat: build Brand Review compliance demo"
# Create an empty GitHub repository in your account, then substitute its URL.
git branch -M main
git remote add origin "YOUR_GITHUB_REPOSITORY_URL"
git push -u origin main
```

Because this folder currently sits inside another Git repository, `git init` here creates a nested repository. If that is not desired, first make a separate copy of this folder outside `PROJECT/`, verify the copy, then run the commands in that copy. No Git identity is configured and no repository was initialized or committed by this task.
