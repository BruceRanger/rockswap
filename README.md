# RockSwap (Match-3 Game) B

[![CI](https://github.com/BruceRanger/rockswap/actions/workflows/ci.yml/badge.svg)](https://github.com/BruceRanger/rockswap/actions/workflows/ci.yml)
[![Deploy](https://github.com/BruceRanger/rockswap/actions/workflows/deploy.yml/badge.svg)](https://github.com/BruceRanger/rockswap/actions/workflows/deploy.yml)
[![CodeQL](https://github.com/BruceRanger/rockswap/actions/workflows/codeql.yml/badge.svg)](https://github.com/BruceRanger/rockswap/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-22.x-339933?logo=node.js)
![typescript dev dep](https://img.shields.io/github/package-json/dependency-version/BruceRanger/rockswap/dev/typescript)
![vite dev dep](https://img.shields.io/github/package-json/dependency-version/BruceRanger/rockswap/dev/vite)
![Code Style: Prettier](https://img.shields.io/badge/code_style-Prettier-ff69b4?logo=prettier)
[![GitHub Pages](https://img.shields.io/badge/site-live-brightgreen)](https://BruceRanger.github.io/rockswap/)

[Lighthouse Scores (out of 100)](https://BruceRanger.github.io/rockswap/lighthouse.html)

[![Lighthouse Accessibility Badge](./assets/img/scores/lighthouse_accessibility.svg)](https://github.com/BruceRanger/rockswap)
[![Lighthouse Best Practices Badge](./assets/img/scores/lighthouse_best-practices.svg)](https://github.com/BruceRanger/rockswap)
[![Lighthouse Performance Badge](./assets/img/scores/lighthouse_performance.svg)](https://github.com/BruceRanger/rockswap)
[![Lighthouse SEO Badge](./assets/img/scores/lighthouse_seo.svg)](https://github.com/BruceRanger/rockswap)

A learner-friendly match-3 puzzle game built with TypeScript and HTML5 Canvas.
Installable as a Progressive Web App (PWA).

Initial Features:

- 8x8 board with 6 rock kinds
- Swap adjacent cells if it forms a match
- Find matches, clear, collapse, refill
- Basic scoring and moves

## Controls

- Click a cell and then click an adjacent cell to try a swap.
- Valid swaps that create matches will clear and cascade.

## How the Game Logic is Organized

The main code is in the [`src`](./src/) folder. For an overview, see: [`SRC.md`](./SRC.md)

## Making Changes

To make changes, see: [`CUSTOMIZING.md`](./CUSTOMIZING.md).
