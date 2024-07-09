<script lang="ts">
	import { Alpha3 } from 'convert-iso-codes';

	interface Props {
		size?: 'sm' | 'md' | 'lg';
		countryCode: string;
	}

	let { size = 'md', countryCode }: Props = $props();

	const flagClassNames = () => {
		switch (size) {
			case 'sm':
				return 'w-[4rem] h-[3rem]';
			case 'md':
				return 'w-[6rem] h-[4.5rem]';
			case 'lg':
				return 'w-[8rem] h-[6rem]';
		}
	};

	const imagePath = () => {
		return `/node_modules/flag-icons/flags/4x3/${countryCode}.svg`;
	};
</script>

<div class={`${flagClassNames()} rounded-lg overflow-hidden shadow flex justify-center items-center`}>
  <img src={imagePath()} alt={countryCode} class="w-full h-full" />
</div>
