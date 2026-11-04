local fs = require("@lune/fs")
local luau = require("@lune/luau")

local mappings = {
	["server/fallback.lua"] = {
		source = "fallback.ts",
		lines = { ["3"] = 30 },
	},
	["server/exact.luau"] = {
		source = "exact.ts",
		lines = { ["4"] = 40 },
	},
	["server/exact.lua"] = {
		source = "lua-fallback.ts",
		lines = { ["4"] = 41 },
	},
}

local sourcemapScript = {
	Parent = {
		FindFirstChild = function(_, name)
			if name == "Sourcemap" then
				return {
					IsA = function(_, className)
						return className == "ModuleScript"
					end,
				}
			end

			return nil
		end,
	},
}

local environment = {
	script = sourcemapScript,
	require = function()
		return { mappings = mappings }
	end,
	print = function() end,
}

local moduleChunk = luau.load(fs.readFile("include/RuntimeLib.Sourcemap.luau"), {
	debugName = "RuntimeLib.Sourcemap",
	environment = environment,
})
local sourcemap = moduleChunk()

assert(sourcemap.init())
local fallback = sourcemap.getTypeScriptLocation("server/fallback.luau", 3)
assert(fallback and fallback.source == "fallback.ts" and fallback.line == 30)

local exact = sourcemap.getTypeScriptLocation("server/exact.luau", 4)
assert(exact and exact.source == "exact.ts" and exact.line == 40)

print("Runtime sourcemap lookup passed")
