import committees from './countries_mun-sh_2025.json';

const nations = {};

for (const committee of committees) {
	for (const nation of committee.nations) {
		if (!nations[nation]) {
			nations[nation] = [];
		}
		nations[nation].push(committee.abbreviation);
	}
}

function countNationsOfSizeX(size: number) {
	return Object.values(nations).filter((x) => x.length === size).length;
}

console.info('Nations:', Object.keys(nations).length);
console.info('1 seat:', countNationsOfSizeX(1));
console.info('2 seats:', countNationsOfSizeX(2));
console.info('3 seats:', countNationsOfSizeX(3));
console.info('4 seats:', countNationsOfSizeX(4));
console.info('5 seats:', countNationsOfSizeX(5));
console.info('6 seats:', countNationsOfSizeX(6));
console.info('7 seats:', countNationsOfSizeX(7));
