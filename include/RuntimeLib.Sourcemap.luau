-- Enhanced RuntimeLib with Sourcemap Support
-- This module provides runtime error mapping from Lua to TypeScript

local SourcemapModule = {}

-- Sourcemap data (loaded from Sourcemap.luau)
local SOURCEMAP_DATA = {}
local SOURCEMAP_ENABLED = false

-- Initialize sourcemap from Sourcemap.luau
function SourcemapModule.init()
	local success, sourcemapData = pcall(function()
		local ReplicatedStorage = game:GetService("ReplicatedStorage")
		local rbxtsInclude = ReplicatedStorage:FindFirstChild("rbxts_include")
		if rbxtsInclude then
			local sourcemap = rbxtsInclude:FindFirstChild("Sourcemap")
			if sourcemap and sourcemap:IsA("ModuleScript") then
				return require(sourcemap)
			end
		end
		return nil
	end)

	if success and sourcemapData and sourcemapData.mappings then
		SOURCEMAP_DATA = sourcemapData.mappings
		SOURCEMAP_ENABLED = true
		print("[roblox-ts] Sourcemap loaded - Enhanced error messages enabled")
		return true
	end

	return false
end

-- Parse Lua stack trace line to extract file and line number
local function parseStackLine(line)
	-- Format: "Script 'Path.To.Script', Line 123"
	local scriptPath, lineNum = line:match("Script '([^']+)', Line (%d+)")
	if scriptPath and lineNum then
		return scriptPath, tonumber(lineNum)
	end
	return nil, nil
end

-- Convert Lua file path to sourcemap key
local function luaPathToSourcemapKey(scriptPath)
	-- Input: "ServerScriptService.TS.test_features"
	-- Output: "server/test_features.luau"

	-- Determine folder based on service
	local folder = nil
	if scriptPath:match("^ServerScriptService") then
		folder = "server"
	elseif scriptPath:match("^StarterPlayer") then
		folder = "client"
	elseif scriptPath:match("^ReplicatedStorage%.TS") then
		folder = "shared"
	end

	-- Extract everything after ".TS."
	local afterTS = scriptPath:match("%.TS%.(.+)$")
	if not afterTS then
		return nil
	end

	-- Replace dots with slashes for nested paths
	local filePath = afterTS:gsub("%.", "/")

	-- Build the key
	if folder then
		return folder .. "/" .. filePath .. ".luau"
	end

	return filePath .. ".luau"
end

-- Get TypeScript location for a Lua location
function SourcemapModule.getTypeScriptLocation(luaFile, luaLine)
	if not SOURCEMAP_ENABLED then
		return nil
	end

	local mapping = SOURCEMAP_DATA[luaFile]
	if not mapping then
		return nil
	end

	local tsLine = mapping.lines[tostring(luaLine)]
	if tsLine then
		return {
			source = mapping.source,
			line = tsLine
		}
	end

	return nil
end

-- Enhance error message with TypeScript location
function SourcemapModule.enhanceError(errorMsg)
	if not SOURCEMAP_ENABLED then
		return errorMsg
	end

	-- Parse error message for file and line
	-- Format: "ServerScriptService.TS.test_features:240: error message"
	local scriptPath, lineNum, message = errorMsg:match("([^:]+):(%d+): (.+)")
	if not scriptPath or not lineNum then
		return errorMsg
	end

	local sourcemapKey = luaPathToSourcemapKey(scriptPath)
	if not sourcemapKey then
		return errorMsg
	end

	local tsLocation = SourcemapModule.getTypeScriptLocation(sourcemapKey, tonumber(lineNum))
	if tsLocation then
		-- Print enhanced error as warning (orange/red) in Studio
		warn(string.format("  → TypeScript: %s:%d", tsLocation.source, tsLocation.line))
	end

	return errorMsg
end

-- Enhance stack trace with TypeScript locations
function SourcemapModule.enhanceStackTrace(stackTrace)
	if not SOURCEMAP_ENABLED then
		return stackTrace
	end

	local lines = {}
	for line in stackTrace:gmatch("[^\n]+") do
		local scriptPath, lineNum = parseStackLine(line)
		if scriptPath and lineNum then
			local sourcemapKey = luaPathToSourcemapKey(scriptPath)
			if sourcemapKey then
				local tsLocation = SourcemapModule.getTypeScriptLocation(sourcemapKey, lineNum)
				if tsLocation then
					table.insert(lines, line)
					table.insert(lines, string.format("    → TypeScript: %s:%d",
						tsLocation.source, tsLocation.line))
				else
					table.insert(lines, line)
				end
			else
				table.insert(lines, line)
			end
		else
			table.insert(lines, line)
		end
	end

	return table.concat(lines, "\n")
end

return SourcemapModule
