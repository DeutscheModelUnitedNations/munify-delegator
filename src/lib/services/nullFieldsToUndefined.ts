type RecursivelyReplaceNullWithUndefined<T> = T extends null
	? undefined
	: T extends Date
		? T
		: {
				[K in keyof T]: T[K] extends (infer U)[]
					? RecursivelyReplaceNullWithUndefined<U>[]
					: RecursivelyReplaceNullWithUndefined<T[K]>;
			};

// https://stackoverflow.com/a/69058437/11988368
/**
 * Typesafe conversion of all null fields to undefined.
 * Useful for pre populating a form with database fields which may be null
 */
export function nullFieldsToUndefined<T>(obj: T): RecursivelyReplaceNullWithUndefined<T> {
	if (obj === null) {
		return undefined as any;
	}

	// object check based on: https://stackoverflow.com/a/51458052/6489012
	if (obj.constructor.name === 'Object') {
		for (let key in obj) {
			obj[key] = nullFieldsToUndefined(obj[key]) as any;
		}
	}
	return obj as any;
}
