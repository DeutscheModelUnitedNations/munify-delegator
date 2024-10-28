/// <references types="houdini-svelte">

/** @type {import('houdini').ConfigFile} */
const config = {
	watchSchema: {
		url: 'http://localhost:5173/api/graphql'
	},
	plugins: {
		'houdini-svelte': {
			forceRunesMode: true
		}
	},
	scalars: {
		DateTime: {
			type: 'Date',
			unmarshal(val) {
				return val ? new Date(val) : null;
			},
			marshal(date) {
				return date && date.getTime();
			}
		}
	},
};

export default config;
