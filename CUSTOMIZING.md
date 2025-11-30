# Customizing RockSwap

Create your own version of RockSwap with custom colors or settings - just follow this guide.

## What You'll Need

- A GitHub account
- Basic knowledge of editing files on GitHub
- 5-10 minutes

---

## Step 1A: Fork This Repository

1. Click the **Fork** button at the top right of this repository
2. GitHub will create a copy under your account (e.g., `yourname/rockswap`)
3. You now have your own version to customize.

## Step 1B: Enable Pages from Your Repo

1. Go to your repo's **Settings** tab
2. Click **Pages** in the left sidebar
3. Under "Source", select:
   - `Actions`
4. Click **Save**
5. After you publish, your game will be live at: https://yourusername.github.io/rockswap/

### Step 1C: Change README.md to your account:

1. In your forked repo, navigate to `README.md`
2. Click the **pencil icon** (Edit this file)
3. Change all occurrences of `BruceRanger` to your GitHub account name
4. Scroll down and click **Commit changes**

### Step 1D: Change deploy.yml to your account:

1. In your forked repo, navigate to `.github\workflows\deploy.yml`
2. Click the **pencil icon** (Edit this file)
3. Change all occurrences of `BruceRanger` to your GitHub account name
4. Scroll down and click **Commit changes**

---

## Step 2: Customize Your Game

Edit the config file to change colors.

### Change colors:

1. In your forked repo, navigate to `src/config.ts`
2. Click the **pencil icon** (Edit this file)
3. Change the ROCK_COLORS to your liking
4. Scroll down and click **Commit changes**

### Other Settings You Can Change:

    // Make the board bigger or smaller
    export const BOARD_SIZE = 10;  // Default is 8 (8 to 10 is good)

    // Add more colors (automatically updates rock types)
    export const ROCK_COLORS: string[] = [
      "#color1",
      "#color2",
      // ... add up to 8-10 colors max for playability
    ];

Committing your changes will automatically deploy your new game page.

---

## Periodically: Get Updates from the Original Repo

As RockSwap evolves, here's how to get the updates:

### On GitHub (Web Interface):

1. Go to your forked repo
2. Click **Sync fork** button (if available)
3. Click **Update branch**

---

<details>
<summary>⚠️ Handling Merge Conflicts (Click to expand)</summary>

**Good news:** If you only edited `src/config.ts`, you should have **zero conflicts**!

If you do get conflicts:

1. Open the conflicted file
2. Look for sections marked with `<<<<<<<`, `=======`, `>>>>>>>`
3. Keep your changes (your custom colors)
4. Delete the conflict markers
5. Commit the resolved file

**Example conflict in config.ts:**

    <<<<<<< HEAD
    export const ROCK_COLORS = ["#ff0000", "#00ff00"];  // Your colors
    =======
    export const ROCK_COLORS = ["#blue", "#green"];     // Upstream colors
    >>>>>>> upstream/main

**Resolution:** Keep YOUR colors:

    export const ROCK_COLORS = ["#ff0000", "#00ff00"];  // Your colors

</details>

---

<details>
<summary>📝 Tips for Forkers (Click to expand)</summary>

### Keep It Simple:

- **Only edit `src/config.ts`** for colors and settings
- Avoid editing other files unless you know what you're doing
- This minimizes merge conflicts when getting updates

### Testing Colors:

- Use 5-6 colors for best gameplay (matching gets too easy with fewer, too hard with more)
- Test on mobile! Colors should be distinguishable on small screens
- Consider colorblind-friendly palettes (use patterns too, eventually)

### Sharing Your Fork:

- Change the repo description to mention it's a custom version
- Link back to the original repo: Based on RockSwap (original-link)
- Share your color scheme! Tag it #rockswap-custom

</details>

---

<details>
<summary>🆘 Troubleshooting (Click to expand)</summary>

### Game doesn't update after changes:

- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Check that GitHub Pages rebuilt (Settings → Pages shows deployment status)

### Colors not showing:

- Make sure you used valid hex codes: "#rrggbb"
- Check browser console for errors (F12)
- Verify `src/config.ts` was saved and committed

### Build fails on GitHub Pages:

- Check Actions tab for error messages
- Make sure `vite.config.ts` has correct `base:` path
- Ensure `package.json` has no syntax errors

</details>

---

## Questions?

- Check the original repo's Issues page
- Make sure you're running the latest version
- Include your `package.json` version when asking for help
