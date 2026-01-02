# 🚀 Deployment Guide - roblox-ts 3.1.0

## ✅ Pre-Deployment Checklist

- ✅ All tests pass: `npm run test` (651/651)
- ✅ Build works: `npm run build`
- ✅ Linting OK: `npm run eslint src tests`
- ✅ CHANGELOG.md updated
- ✅ package.json version = 3.1.0

---

## 📦 Deploy to npm (Stable Release)

### Quick Method (for release):

```powershell
# 1. Make sure you're on the release branch
git checkout release/3.1.0-alchemy
git pull origin release/3.1.0-alchemy

# 2. Build the project
npm run build

# 3. Publish (stable)
npm publish --access public

# 4. Create git tag
git tag v3.1.0
git push origin v3.1.0
```

---

## 🧪 Beta Deployment (Test Version)

### For testing before release:

```powershell
# Use the ready-made script
npm run publish-beta

# Or manually:
npm publish --tag beta --access public
```

**Installation by users:**
```powershell
npm install @radomiej/roblox-ts@beta
# or specific version
npm install @radomiej/roblox-ts@3.1.0-beta.1
```

---

## 🔧 `publish-beta.ts` Script

Located in `scripts/publish-beta.ts` - automatically:
- ✅ Increments beta version
- ✅ Publishes all 3 packages (roblox-ts, compiler-types, ts-expose-internals)
- ✅ Handles OTP (2FA) and Auth Tokens
- ✅ Cleans temporary files

**Usage:**
```powershell
npm run publish-beta
```

**Authentication Options:**
1. OTP (2FA code from npm)
2. Auth Token (for CI/Automation)

---

## 📝 After Deployment

### 1. Create GitHub Release
- Go to: https://github.com/roblox-ts/roblox-ts/releases/new
- Tag: `v3.1.0`
- Title: `v3.1.0 - TypeScript 5.9.3 + Major Features`
- Description: Copy the 3.1.0 section from `CHANGELOG.md`

### 2. Announce release
- Discord roblox-ts
- Twitter/X
- Roblox DevForum

### 3. Verify installation
```powershell
npm install -g @radomiej/roblox-ts@3.1.0
rbxtsc --version
# Should show: 3.1.0
```

---

## ⚠️ Rollback (if something goes wrong)

```powershell
# Unpublish within 72h of publication
npm unpublish @radomiej/roblox-ts@3.1.0

# Or deprecate (after 72h)
npm deprecate @radomiej/roblox-ts@3.1.0 "Version has critical bugs, use 3.0.x"
```

---

## 📋 Deployment Checklist

- [ ] Tests pass (651/651)
- [ ] Build successful
- [ ] Logged in to npm (`npm login`)
- [ ] On `release/3.1.0-alchemy` branch
- [ ] No uncommitted changes
- [ ] CHANGELOG.md updated
- [ ] `npm publish --access public` executed
- [ ] Git tag `v3.1.0` created
- [ ] GitHub Release created
- [ ] Announcement on Discord/DevForum
