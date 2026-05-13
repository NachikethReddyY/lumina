# Project Instructions

## Git Remote Workflow

This repository uses two primary remotes for different purposes:

- **school**: The primary repository for academic submissions.
  - URL: `https://github.com/soc-DBSP/react-nodejs-project1-NachikethReddyY.git`
- **hosting**: The repository used for live deployment and hosting.
  - URL: `https://github.com/NachikethReddyY/lumina.git`

### How to Switch and Push

#### 1. Pushing to Hosting (Lumina)
When you want to deploy or update the hosted version:
```bash
git push hosting main
```

#### 2. Pushing to School (Submission)
When you want to submit your work or update the school repository:
```bash
git push school main
```

#### 3. Syncing Both
To ensure both remotes are up to date with your local changes:
```bash
git push school main && git push hosting main
```

### AI Guidance
When asked to "commit and push", always clarify which remote the user intends to target unless specified. If the goal is deployment, use `hosting`. If the goal is academic submission, use `school`.

---
*Note: The `origin` remote has been renamed to `school` to avoid confusion. The `main` branch is currently tracking `hosting/main`.*
