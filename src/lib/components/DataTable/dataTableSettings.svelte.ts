let tableSize = $state<'xs' | 'sm' | 'md' | 'lg'>('md');
let zebra = $state(true);

export function getTableSettings() {
	function setTableSize(size: 'xs' | 'sm' | 'md' | 'lg') {
		tableSize = size;
		localStorage.setItem('tableSize', size);
	}

	function setZebra(value: boolean) {
		zebra = value;
		localStorage.setItem('tableZebra', value.toString());
	}

	function getTableSize() {
		return tableSize;
	}

	function getZebra() {
		return zebra;
	}

	return {
		setTableSize,
		setZebra,
		getTableSize,
		getZebra
	};
}
