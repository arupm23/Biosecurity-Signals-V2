# Create a NEW GitHub repository for Biosecurity Signals v2.0

This is a standalone, ready-to-push codebase. It does **not** overwrite the original `arupm23/biosecurity-signals` repository.

## Create the repository

1. Sign in to GitHub as `arupm23`, open https://github.com/new and create an empty **public** repository named `biosecurity-signals-v2`. Add **no README, license or .gitignore** from the GitHub form: all are already included in this project.
2. Extract the release ZIP and open a terminal in the `biosecurity-signals-v2` folder.
3. Run the commands below, using your GitHub credentials when prompted:

```sh
git init -b main
git add .
git commit -m "Initial release: Biosecurity Signals v2.0 evidence observatory"
git remote add origin https://github.com/arupm23/biosecurity-signals-v2.git
git push -u origin main
```

If your download already contains a `.git` history, skip `git init`, `git add`, and `git commit`; instead run `git remote add origin ...` and `git push -u origin main`.

4. Go to GitHub **Settings → Pages** and select **Deploy from a branch**, branch `main`, folder `/ (root)`. The static site should publish at `https://arupm23.github.io/biosecurity-signals-v2/` after GitHub Pages finishes deploying.
5. Check the **Actions** tab for the automatic JavaScript smoke-test workflow.

## Database initialization (separate, privileged step)

- Create a Supabase project owned by you, then execute `supabase/001_evidence_observatory.sql` followed by `supabase/002_seed.sql` using its SQL Editor.
- Run `supabase/tests/rls_privileges.sql` and verify an unauthenticated client cannot read drafts or write to tables.
- Set **only** the public project URL and **publishable** (or legacy anonymous) key in `config.js`. Do **not** commit database passwords, service-role keys, personal access tokens, or any confidential data.
- Refer to the root README for the review process and evidence-model limitations.

**Until you configure Supabase, the public site intentionally displays the eight-record offline snapshot.** Code and migrations alone do not create a live managed database.

## Optional one-command GitHub CLI publishing

Instead of creating the repository through the website, on your own computer install the [GitHub CLI](https://cli.github.com/), run `gh auth login`, then from the extracted project folder run:

```sh
bash scripts/publish-to-github.sh
```

This script checks authentication, creates a local initial commit under your configured Git identity, creates the public remote repository only if the name is unused, and pushes `main`. It will not overwrite an existing GitHub repository. The script cannot be run by this assistant without repository-creation credentials.
