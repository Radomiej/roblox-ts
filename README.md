<div align="center"><img width=25% src="https://i.imgur.com/yCjHmng.png"></div>
<h1 align="center"><a href="https://roblox-ts.com">roblox-ts</a></h1>
<div align="center">A TypeScript-to-Luau Compiler for Roblox</div>
<br>
<div align="center">
	<a href="https://discord.roblox-ts.com"><img src="https://discordapp.com/api/guilds/476080952636997633/embed.png" alt="Discord server" /></a>
	<a href="https://github.com/roblox-ts/roblox-ts/actions"><img src="https://github.com/roblox-ts/roblox-ts/actions/workflows/UnitTests.yml/badge.svg?branch=master" alt="CI Status" /></a>
	<a href="https://codecov.io/gh/roblox-ts/roblox-ts" ><img src="https://codecov.io/gh/roblox-ts/roblox-ts/graph/badge.svg?token=mdt4kQ2tHK"/></a>
	<a href="https://www.npmjs.com/package/roblox-ts"><img src="https://badge.fury.io/js/roblox-ts.svg"></a>
</div>
<div>&nbsp;</div>

## Introduction

**roblox-ts** is an attempt to bridge the abilities of TypeScript to work in a Roblox environment. We break down your code into an abstract syntax tree and emit functionally similar structures in [Luau](https://luau-lang.org/) so that the code behaves the same.

## Quick start & Documentation

Ready to dive in? [Check out the documentation.](https://roblox-ts.com/docs)

### Creating a New Project

**Prerequisites:**
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Rojo](https://rojo.space/) (v7.4.0 or higher)
- [Roblox Studio](https://www.roblox.com/create)

**Step 1: Create project directory**
```bash
mkdir my-roblox-game
cd my-roblox-game
```

**Step 2: Initialize npm and install roblox-ts**
```bash
npm init -y
npm install --save-dev @radomiej/roblox-ts@3.1.0-beta.4
npm install --save-dev @rbxts/compiler-types@npm:@radomiej/compiler-types@^3.1.0-types.beta.3
npm install --save-dev @rbxts/types typescript
npm install --save @rbxts/services
```

**Step 3: Create project structure**
```bash
mkdir -p src/client src/server src/shared
```

**Step 4: Create `tsconfig.json`**
```json
{
    "compilerOptions": {
        "allowSyntheticDefaultImports": true,
        "downlevelIteration": true,
        "jsx": "react",
        "jsxFactory": "React.createElement",
        "jsxFragmentFactory": "React.Fragment",
        "module": "commonjs",
        "moduleResolution": "Node",
        "noLib": true,
        "resolveJsonModule": true,
        "experimentalDecorators": true,
        "forceConsistentCasingInFileNames": true,
        "moduleDetection": "force",
        "strict": true,
        "target": "ESNext",
        "typeRoots": ["node_modules/@rbxts"],
        "rootDir": "src",
        "outDir": "out",
        "baseUrl": "src",
        "incremental": true,
        "tsBuildInfoFile": "out/tsconfig.tsbuildinfo"
    }
}
```

**Step 5: Create `default.project.json`**
```json
{
    "name": "my-roblox-game",
    "tree": {
        "$className": "DataModel",
        "ReplicatedStorage": {
            "$className": "ReplicatedStorage",
            "rbxts_include": {
                "$path": "include"
            },
            "node_modules": {
                "@rbxts": {
                    "$path": "node_modules/@rbxts"
                }
            },
            "TS": {
                "$path": "out/shared"
            }
        },
        "ServerScriptService": {
            "$className": "ServerScriptService",
            "TS": {
                "$path": "out/server"
            }
        },
        "StarterPlayer": {
            "$className": "StarterPlayer",
            "StarterPlayerScripts": {
                "$className": "StarterPlayerScripts",
                "TS": {
                    "$path": "out/client"
                }
            }
        }
    }
}
```

**Step 6: Add npm scripts to `package.json`**
```json
{
    "scripts": {
        "build": "npx rbxtsc --sourcemap",
        "watch": "npx rbxtsc -w --sourcemap",
        "dev": "rojo serve"
    }
}
```

**Step 7: Create example files**

`src/server/main.server.ts`:
```typescript
import { Players } from "@rbxts/services";

print("Server started!");

Players.PlayerAdded.Connect((player) => {
    print(`${player.Name} joined the game!`);
});
```

`src/client/main.client.ts`:
```typescript
import { Players } from "@rbxts/services";

const player = Players.LocalPlayer;
print(`Hello, ${player.Name}!`);
```

**Step 8: Build and run**
```bash
npm run build
npm run dev
```

Then open Roblox Studio and connect to Rojo (Plugins → Rojo → Connect).

**📖 For best practices and common pitfalls, see [`global.md`](./global.md)**

## Join the Community!

https://discord.roblox-ts.com

## Games that use roblox-ts

<a href="https://www.roblox.com/games/6872265039"><img width=32.9% src="https://i.imgur.com/S2x5isG.png" /></a><!-- BedWars 10.5B -->
<a href="https://www.roblox.com/games/4872321990"><img width=32.9% src="https://i.imgur.com/pkuQfdG.png" /></a><!-- Islands 2.3B -->
<a href="https://www.roblox.com/games/7711635737"><img width=32.9% src="https://i.imgur.com/lmJLoAx.png" /></a><!-- Emergency Hamburg 860.7M -->
<a href="https://www.roblox.com/games/110829983956014"><img width=32.9% src="https://i.imgur.com/Cf7oLHJ.jpeg" /></a><!-- Anime Card Clash 306.2M -->
<a href="https://www.roblox.com/games/3759927663"><img width=32.9% src="https://i.imgur.com/OAmrsuz.png" /></a><!-- Zombie Strike 227.4M -->
<a href="https://www.roblox.com/games/8542259458"><img width=32.9% src="https://i.imgur.com/n6fMYfz.jpeg" /></a><!-- SkyWars 321.6M -->
<a href="https://www.roblox.com/games/12851888521"><img width=32.9% src="https://i.imgur.com/K8SvYsc.png" /></a><!-- Punch Wall Simulator 180.8M -->
<a href="https://www.roblox.com/games/9759729519"><img width=32.9% src="https://i.imgur.com/n1dye62.png" /></a><!-- All of Us Are Dead 149.8M -->
<a href="https://www.roblox.com/games/8597844216"><img width=32.9% src="https://i.imgur.com/S728lWz.png" /></a><!-- Slither Simulator 128.2M -->
<a href="https://www.roblox.com/games/12144402492"><img width=32.9% src="https://i.imgur.com/nffggbO.png" /></a><!-- Deadline 42.1M + 1.9M (game was taken down?) -->
<a href="https://www.roblox.com/games/11653088948"><img width=32.9% src="https://i.imgur.com/qCAC3d8.png" /></a><!-- Jurassic Blocky 82.3M -->
<a href="https://www.roblox.com/games/841531820"><img width=32.9% src="https://i.imgur.com/KFUgqsV.png" /></a><!-- Deep Space Tycoon 30.8M -->
<a href="https://www.roblox.com/games/15798268709"><img width=32.9% src="https://i.imgur.com/ERuCebr.png" /></a><!-- The Sewers 28.3M -->
<a href="https://www.roblox.com/games/9611595239"><img width=32.9% src="https://i.imgur.com/qISPda3.png" /></a><!-- Rift Royale 21.1M -->
<a href="https://www.roblox.com/games/8747402506"><img width=32.9% src="https://i.imgur.com/cZsnXms.png" /></a><!-- Prop Hunt 19.7M -->
<a href="https://www.roblox.com/games/5414779423"><img width=32.9% src="https://i.imgur.com/5GTAGqt.png" /></a><!-- Science Simulator 19.1M -->
<a href="https://www.roblox.com/games/13251504936"><img width=32.9% src="https://i.imgur.com/6AyGF1m.png" /></a><!-- Creepy Crawlers 22.7M -->
<a href="https://www.roblox.com/games/9681195418"><img width=32.9% src="https://i.imgur.com/599Tpu0.png" /></a><!-- popper 11.8M -->
<a href="https://www.roblox.com/games/9655469250"><img width=32.9% src="https://i.imgur.com/GXt8rmT.png" /></a><!-- Space War Tycoon 11.3M -->
<a href="https://www.roblox.com/games/11688361399"><img width=32.9% src="https://i.imgur.com/EDC7xw6.png" /></a><!-- Wealdland Foods 6.7M -->
<a href="https://www.roblox.com/games/84633364434995"><img width=32.9% src="https://i.imgur.com/bL7cnBe.png" /></a><!-- Unnamed Battlegrounds 5.2M -->
<a href="https://www.roblox.com/games/138705998165267"><img width=32.9% src="https://i.imgur.com/TfDGxeN.png" /></a><!-- Plinko Tycoon 6.1M -->
<a href="https://www.roblox.com/games/12147220287"><img width=32.9% src="https://i.imgur.com/iD2PKgW.png" /></a><!-- LegacyVerse 4.8M -->
<a href="https://www.roblox.com/games/91664813726836"><img width=32.9% src="https://i.imgur.com/chsMGo1.png" /></a><!-- Go Dig 3.7M -->
<a href="https://www.roblox.com/games/73950822398272"><img width=32.9% src="https://i.imgur.com/4kClZ8K.png" /></a><!-- Steal A Figure 3.4M -->
<a href="https://www.roblox.com/games/18381234265"><img width=32.9% src="https://i.imgur.com/KJpPZT2.png" /></a><!-- Fashion Stars 3.4M -->
<a href="https://www.roblox.com/games/2184151436"><img width=32.9% src="https://i.imgur.com/JSFPTA0.png" /></a><!-- Dungeon Life 2.0M -->
<a href="https://www.roblox.com/games/118799079009085"><img width=32.9% src="https://i.imgur.com/D3XTG90.png" /></a><!-- RNG Dropper Tycoon 1.6M -->
<a href="https://www.roblox.com/games/84402061711337"><img width=32.9% src="https://i.imgur.com/9GNse44.png" /></a><!-- Vacuum Everything 4.2M -->
