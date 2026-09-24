type Extendable<T> = T & { [key: string]: any };

type Nation = Extendable<{
	alpha3Code: string;
	alpha2Code: string;
}>;

type Committee = Extendable<{
	nations: Nation[];
}>;

export function getUniqueNations(committees: Committee[]): Nation[] {
	const seen = new Set<string>();
	const result: Nation[] = [];

	for (const committee of committees) {
		for (const nation of committee.nations) {
			if (!seen.has(nation.alpha3Code)) {
				seen.add(nation.alpha3Code);
				result.push({ alpha3Code: nation.alpha3Code, alpha2Code: nation.alpha2Code });
			}
		}
	}
	return result;
}
