# Optional: Setup Locally (on your machine)

If you want to change gameplay, scoring logic, or transitions, you'll probably want to set up the project to run locally on your machine.

## Project Tools

| Tool           | What it does                                        | Why we use it                                                |
| -------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| **Node.js**    | Lets you run JavaScript apps locally.               | Needed for development tools.                                |
| **npm**        | Installs helper libraries listed in `package.json`. | Handles setup commands like `npm install` and `npm run dev`. |
| **TypeScript** | Adds type checking to JavaScript.                   | Catches simple mistakes early.                               |
| **Prettier**   | Formats code automatically.                         | Keeps files neat and consistent.                             |
| **Vite**       | Fast local web server and build tool.               | Reloads instantly as you edit.                               |
| **Git**        | Version control.                                    | Used for commits and syncing changes.                        |
| **VS Code**    | Developer-friendly editor.                          | Recommended for TypeScript projects.                         |

## 1. Install Tools

1. Install Node.js from
2. Install Git from
3. Install VS Code from

## 2. Get a Copy on Your Machine

Log in to GitHub.
Go to [github.com/BruceRanger/rockswap](https://github.com/BruceRanger/rockswap). Click "Fork" to copy the repo into your GitHub account.
Clone your new rockswap repo down to your machine and open in VS Code using the following commands.
Open terminal.

```
git clone https://github.com/BruceRanger/rockswap.git
cd rockswap
code .
```

## 3. VS Code Extensions

When VS Code makes a recommendation, please click "Yes" or accept the recommendation.

## 4. Quick Start

In VS Code, open a new terminal (CMD+SHIFT+` or use the menu: "Terminal", "New Terminal") and run the following commands one at a time:

```bash
npm install
npm audit fix --force
npm run build

npm run format:check

npm run dev

# open http://localhost:5174
```

Use CTRL+c or CMD+c to quit.

---

## Pre-Release Verification

```shell
npm install
npm audit fix --force
npm run format
npm run dev
```

Open <http://localhost:5174>.

Final commit and tag:

```shell
git add .
git commit -m "Prep vx.y.z"
git push -u origin main
```

Verify CI & Docs Actions pass on GitHub, then:

```shell
git tag vx.y.z -m "x.y.z"
git push origin vx.y.z
```
