--!strict

local Promise = require(script.Parent.Promise)

local RunService = game:GetService("RunService")

local OUTPUT_PREFIX = "roblox-ts: "
local NODE_MODULES = "node_modules"
local DEFAULT_SCOPE = "@rbxts"

local TS = {}

TS.Promise = Promise

TS.SourcemapModule = nil
pcall(function()
	local sourcemapModule = script.Parent:FindFirstChild("RuntimeLib.Sourcemap")
	if sourcemapModule and sourcemapModule:IsA("ModuleScript") then
		TS.SourcemapModule = require(sourcemapModule)
		if TS.SourcemapModule and TS.SourcemapModule.init then
			TS.SourcemapModule.init()
		end
	end
end)

local SymbolRegistry = {}
local Symbol = setmetatable({}, {
	__call = function(_, description)
		local symbol = newproxy(true)
		getmetatable(symbol).__tostring = function()
			return "Symbol(" .. (description or "") .. ")"
		end
		return symbol
	end,
})

TS.Symbol = Symbol
TS.__undefined = {}

function Symbol.for_(key)
	if not SymbolRegistry[key] then
		SymbolRegistry[key] = Symbol(key)
	end
	return SymbolRegistry[key]
end

function Symbol.keyFor(sym)
	for key, value in pairs(SymbolRegistry) do
		if value == sym then
			return key
		end
	end
end

Symbol.iterator = Symbol("Symbol.iterator")
Symbol.asyncIterator = Symbol("Symbol.asyncIterator")
Symbol.hasInstance = Symbol("Symbol.hasInstance")
Symbol.isConcatSpreadable = Symbol("Symbol.isConcatSpreadable")
Symbol.match = Symbol("Symbol.match")
Symbol.replace = Symbol("Symbol.replace")
Symbol.search = Symbol("Symbol.search")
Symbol.species = Symbol("Symbol.species")
Symbol.split = Symbol("Symbol.split")
Symbol.toPrimitive = Symbol("Symbol.toPrimitive")
Symbol.toStringTag = Symbol("Symbol.toStringTag")
Symbol.unscopables = Symbol("Symbol.unscopables")
Symbol.dispose = Symbol("Symbol.dispose")
Symbol.asyncDispose = Symbol("Symbol.asyncDispose")

-- re-execution creates a fresh TS table, but preserves the runtime's ModuleScript identity
TS.__runtimeScript = script

local function isPlugin(context)
	return RunService:IsStudio() and context:FindFirstAncestorWhichIsA("Plugin") ~= nil
end

function TS.getModule(context, scope, moduleName)
	-- legacy call signature
	if moduleName == nil then
		moduleName = scope
		scope = DEFAULT_SCOPE
	end

	-- ensure modules have fully replicated
	if RunService:IsRunning() and RunService:IsClient() and not isPlugin(context) and not game:IsLoaded() then
		game.Loaded:Wait()
	end

	local object = context
	repeat
		local nodeModulesFolder = object:FindFirstChild(NODE_MODULES)
		if nodeModulesFolder then
			local scopeFolder = nodeModulesFolder:FindFirstChild(scope)
			if scopeFolder then
				local module = scopeFolder:FindFirstChild(moduleName)
				if module then
					return module
				end
			end
		end
		object = object.Parent
	until object == nil

	error(OUTPUT_PREFIX .. "Could not find module: " .. moduleName, 2)
end

-- This is a hash which TS.import uses as a kind of linked-list-like history of [Script who Loaded] -> Library
local currentlyLoading = {}
local registeredLibraries = {}

function TS.import(context, module, ...)
	for i = 1, select("#", ...) do
		module = module:WaitForChild((select(i, ...)))
	end

	if module.ClassName ~= "ModuleScript" then
		error(OUTPUT_PREFIX .. "Failed to import! Expected ModuleScript, got " .. module.ClassName, 2)
	end

	currentlyLoading[context] = module

	-- Check to see if a case like this occurs:
	-- module -> Module1 -> Module2 -> module

	-- WHERE currentlyLoading[module] is Module1
	-- and currentlyLoading[Module1] is Module2
	-- and currentlyLoading[Module2] is module

	local currentModule = module
	local depth = 0

	while currentModule do
		depth = depth + 1
		currentModule = currentlyLoading[currentModule]

		if currentModule == module then
			local str = currentModule.Name -- Get the string traceback

			for _ = 1, depth do
				currentModule = currentlyLoading[currentModule]
				str = str .. "  ⇒ " .. currentModule.Name
			end

			error(OUTPUT_PREFIX .. "Failed to import! Detected a circular dependency chain: " .. str, 2)
		end
	end

	if not registeredLibraries[module] then
		local registeredBy = _G[module]
		if registeredBy ~= nil and (type(registeredBy) ~= "table" or registeredBy.__runtimeScript ~= script) then
			error(
				OUTPUT_PREFIX
				.. "Invalid module access! Do you have multiple TS runtimes trying to import this? "
				.. module:GetFullName(),
				2
			)
		end

		_G[module] = TS
		registeredLibraries[module] = true -- register as already loaded for subsequent calls
	end

	local data = require(module) :: any

	if currentlyLoading[context] == module then -- Thread-safe cleanup!
		currentlyLoading[context] = nil
	end

	return data
end

function TS.instanceof(obj, class)
	-- Custom Symbol.hasInstance takes precedence over the default class check.
	if type(class) == "table" then
		local hasInstance = class[Symbol.hasInstance]
		if type(hasInstance) == "function" then
			return hasInstance(class, obj)
		end
	end

	-- custom Class.instanceof() check
	if type(class) == "table" and type(class.instanceof) == "function" then
		return class.instanceof(obj)
	end

	-- metatable check
	if type(obj) == "table" then
		obj = getmetatable(obj)
		while obj ~= nil do
			if obj == class then
				return true
			end
			local mt = getmetatable(obj)
			if mt then
				obj = mt.__index
			else
				obj = nil
			end
		end
	end

	return false
end

function TS.async(callback)
	return function(...)
		local n = select("#", ...)
		local args = { ... }
		return Promise.new(function(resolve, reject)
			local ok, result = pcall(callback, unpack(args, 1, n))
			if ok then
				resolve(result)
			else
				reject(result)
			end
		end)
	end
end

function TS.await(promise)
	if not Promise.is(promise) then
		return promise
	end

	local status, value = promise:awaitStatus()
	if status == Promise.Status.Resolved then
		return value
	elseif status == Promise.Status.Rejected then
		error(value, 2)
	else
		error("The awaited Promise was cancelled", 2)
	end
end

local activeGeneratorResources = setmetatable({}, { __mode = "k" })

function TS.registerUsing(resource, isAwait)
	if resource == nil then
		return
	end
	local thread = coroutine.running()
	local resources = thread and activeGeneratorResources[thread]
	if resources then
		table.insert(resources, { resource = resource, isAwait = isAwait })
	end
end

local function disposeResourceMethod(resource, isAwait)
	if resource == nil then
		return
	end
	local disposeMethod
	if isAwait then
		disposeMethod = resource[Symbol.asyncDispose] or resource[Symbol.dispose]
	else
		disposeMethod = resource[Symbol.dispose]
	end
	if type(disposeMethod) == "function" then
		local result = disposeMethod(resource)
		if isAwait then
			TS.await(result)
		end
	end
end

function TS.disposeResource(resource, isAwait)
	if resource == nil then
		return
	end
	local thread = coroutine.running()
	local resources = thread and activeGeneratorResources[thread]
	if resources then
		for i = #resources, 1, -1 do
			if resources[i].resource == resource then
				table.remove(resources, i)
				break
			end
		end
	end
	disposeResourceMethod(resource, isAwait)
end

local function disposeGeneratorResourcesTo(thread, depth)
	local resources = activeGeneratorResources[thread]
	if not resources then
		return
	end
	local disposeError
	while #resources > depth do
		local entry = table.remove(resources)
		local success, result = pcall(disposeResourceMethod, entry.resource, entry.isAwait)
		if not success and disposeError == nil then
			disposeError = result
		end
	end
	if disposeError ~= nil then
		error(disposeError, 0)
	end
end

local function disposeGeneratorResources(thread)
	local success, result = pcall(disposeGeneratorResourcesTo, thread, 0)
	activeGeneratorResources[thread] = nil
	if not success then
		error(result, 0)
	end
end

local SIGN = 2 ^ 31
local COMPLEMENT = 2 ^ 32
local function bit_sign(num)
	-- Restores the sign after an unsigned conversion according to 2s complement.
	if bit32.btest(num, SIGN) then
		return num - COMPLEMENT
	else
		return num
	end
end

function TS.bit_lrsh(a, b)
	return bit_sign(bit32.arshift(a, b))
end

TS.TRY_RETURN = 1
TS.TRY_BREAK = 2
TS.TRY_CONTINUE = 3
TS.GENERATOR_RETURN = {}

local function isGeneratorReturnError(value)
	if value == TS.GENERATOR_RETURN then
		return true
	end
	if type(value) ~= "string" then
		return false
	end

	local pointer = string.match(tostring(TS.GENERATOR_RETURN), "^table: 0x(%x+)$")
	if not pointer then
		return false
	end
	pointer = string.gsub(pointer, "^0+", "")
	if pointer == "" then
		pointer = "0"
	end
	local marker = "runtime error: table: 0x" .. pointer
	if string.sub(value, 1, #marker) ~= marker then
		return false
	end
	local nextCharacter = string.sub(value, #marker + 1, #marker + 1)
	return nextCharacter == "" or nextCharacter == "\n"
end

function TS.yield(value)
	local input = coroutine.yield(value)
	if input == TS.GENERATOR_RETURN then
		error(TS.GENERATOR_RETURN, 0)
	end
	return input
end

function TS.try(try, catch, finally)
	local generatorThread = coroutine.running()
	local generatorResources = generatorThread and activeGeneratorResources[generatorThread]
	local generatorResourceDepth = generatorResources and #generatorResources or 0

	-- execute try
	local trySuccess, exitTypeOrTryError, returns = pcall(try)
	local exitType, tryError
	if trySuccess then
		exitType = exitTypeOrTryError
	else
		tryError = exitTypeOrTryError
		if type(tryError) == "string" and TS.SourcemapModule and TS.SourcemapModule.enhanceError then
			local enhanceSuccess, enhancedError = pcall(TS.SourcemapModule.enhanceError, tryError)
			if enhanceSuccess and type(enhancedError) == "string" then
				tryError = enhancedError
			end
		end
	end

	if not trySuccess and generatorResources then
		local disposeSuccess, disposeError = pcall(disposeGeneratorResourcesTo, generatorThread, generatorResourceDepth)
		if not disposeSuccess then
			tryError = disposeError
		end
	end

	local catchSuccess = true
	local catchError
	local generatorReturn = not trySuccess and tryError == TS.GENERATOR_RETURN

	-- if try block failed, and catch block exists, execute catch
	if not trySuccess and catch and not generatorReturn then
		local newExitTypeOrCatchError, newReturns
		catchSuccess, newExitTypeOrCatchError, newReturns = pcall(catch, tryError)
		local newExitType
		if catchSuccess then
			newExitType = newExitTypeOrCatchError
		else
			catchError = newExitTypeOrCatchError
		end

		if newExitType then
			exitType, returns = newExitType, newReturns
		end
	end

	if not catchSuccess and generatorResources then
		local disposeSuccess, disposeError = pcall(disposeGeneratorResourcesTo, generatorThread, generatorResourceDepth)
		if not disposeSuccess then
			catchError = disposeError
		end
	end

	-- execute finally
	if finally then
		local newExitType, newReturns = finally()
		if newExitType then
			exitType, returns = newExitType, newReturns
		end
	end

	if generatorReturn and not exitType then
		error(TS.GENERATOR_RETURN, 0)
	end

	-- if exit type is a control flow, do not rethrow errors
	if exitType ~= TS.TRY_RETURN and exitType ~= TS.TRY_BREAK and exitType ~= TS.TRY_CONTINUE then
		-- if catch block threw an error, rethrow it
		if not catchSuccess then
			error(catchError, 2)
		end

		-- if try block threw an error and there was no catch block, rethrow it
		if not trySuccess and not catch then
			error(tryError, 2)
		end
	end

	return exitType, returns
end

function TS.generator(callback)
	local co = coroutine.create(callback)
	activeGeneratorResources[co] = {}
	local started = false
	local closed = false
	local iterator = {
		next = function(...)
			if closed or coroutine.status(co) == "dead" then
				return { done = true }
			else
				started = true
				local success, value = coroutine.resume(co, ...)
				if success == false then
					disposeGeneratorResources(co)
					error(value, 2)
				end
				if coroutine.status(co) == "dead" then
					closed = true
					disposeGeneratorResources(co)
				end
				return {
					value = value,
					done = coroutine.status(co) == "dead",
				}
			end
		end,
		return_ = function(_, value)
			if closed or coroutine.status(co) == "dead" or not started then
				closed = true
				return { done = true, value = value }
			end

			local success, result = coroutine.resume(co, TS.GENERATOR_RETURN)
			if not success then
				closed = true
				disposeGeneratorResources(co)
				if isGeneratorReturnError(result) then
					return { done = true, value = value }
				end
				error(result, 2)
			end

			local done = coroutine.status(co) == "dead"
			closed = done
			if done then
				disposeGeneratorResources(co)
			end
			return { done = done, value = result }
		end,
	}
	iterator["return"] = iterator.return_
	return iterator
end

return TS
