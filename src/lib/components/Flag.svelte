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

</script>

<div class={`${flagClassNames()} rounded-lg overflow-hidden shadow flex justify-center items-center`}>
  <span class="fi fi-{countryCode}"></span>
</div>


<style>
  .fi {
    width: 100% !important;
    line-height: 100rem !important;
  }
</style>