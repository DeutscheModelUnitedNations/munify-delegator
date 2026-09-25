/// <references types="houdini-svelte">

/** @type {import('houdini').ConfigFile} */
const config = {
	// Schema polling disabled: it fetches from a fixed localhost port and overwrites the tracked
	// schema.graphql with whatever happens to be serving there - during this migration it replaced
	// the file with an unrelated project's schema on every `vite`/`vitest` run. The schema is
	// regenerated deliberately via `bunx houdini generate` instead, and houdini goes away in
	// Phase F regardless.
	// watchSchema: {
	// 	url: 'http://localhost:5173/api/graphql'
	// },
	plugins: {
		'houdini-svelte': {
			forceRunesMode: true
		}
	},
	exclude: ['src/lib/paraglide/**/*'],
	scalars: {
		DateTime: {
			type: 'Date',
			unmarshal(val) {
				return val ? new Date(val) : null;
			},
			marshal(date) {
				if (date instanceof Date) {
					return date.getTime();
				}
				if (typeof date === 'string') {
					return new Date(date).getTime();
				}
				return date;
			}
		},
		JSONObject: {
			type: 'JSONObject',
			unmarshal(val) {
				return JSON.parse(val);
			},
			marshal(val) {
				return JSON.stringify(val);
			}
		},
		Json: {
			type: 'JSONObject',
			unmarshal(val) {
				return JSON.parse(val);
			},
			marshal(val) {
				return JSON.stringify(val);
			}
		},
		File: {
			type: 'File',
			unmarshal(val) {
				return val;
			},
			marshal(val) {
				return val;
			}
		}
	},
	types: {
		Nation: {
			keys: ['alpha3Code', 'alpha2Code']
		}
	}
};

export default config;
