export = () => {
	it("supports undefined Map keys and values across Map operations and iteration", () => {
		const map = new Map<string | undefined, number | undefined>([["constructed", undefined], [undefined, 7]]);

		expect(map.has(undefined)).to.equal(true);
		expect(map.get(undefined)).to.equal(7);
		expect(map.has("constructed")).to.equal(true);
		expect(map.get("constructed")).to.equal(undefined);
		expect(map.size()).to.equal(2);

		map.set(undefined, undefined);
		map.set("assigned", undefined);
		expect(map.has(undefined)).to.equal(true);
		expect(map.get(undefined)).to.equal(undefined);
		expect(map.has("assigned")).to.equal(true);
		expect(map.delete(undefined)).to.equal(true);
		expect(map.has(undefined)).to.equal(false);
		map.set(undefined, undefined);

		let visited = 0;
		map.forEach((value, key) => {
			if (key === undefined && value === undefined) visited++;
			if (key === "constructed" && value === undefined) visited++;
			if (key === "assigned" && value === undefined) visited++;
		});
		expect(visited).to.equal(3);

		let visitedByIteration = 0;
		for (const [key, value] of map) {
			if (key === undefined && value === undefined) visitedByIteration++;
			if (key === "constructed" && value === undefined) visitedByIteration++;
			if (key === "assigned" && value === undefined) visitedByIteration++;
		}
		expect(visitedByIteration).to.equal(3);

		const spreadEntries = [...map];
		expect(spreadEntries.some(([key, value]) => key === undefined && value === undefined)).to.equal(true);
		const copied = new Map(spreadEntries);
		expect(copied.has(undefined)).to.equal(true);
		expect(copied.get(undefined)).to.equal(undefined);
	});

	it("supports String.startsWith and endsWith including empty suffix", () => {
		expect("roblox-ts".startsWith("roblox")).to.equal(true);
		expect("roblox-ts".startsWith("ts")).to.equal(false);
		expect("roblox-ts".endsWith("ts")).to.equal(true);
		expect("roblox-ts".endsWith("")).to.equal(true);
	});
};
