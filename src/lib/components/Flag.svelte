<script lang="ts">
	import { Alpha3 } from 'convert-iso-codes';

	interface Props {
		size?: 'xs' | 'sm' | 'md' | 'lg';
		countryCode: string;
	}

	let { size = 'md', countryCode }: Props = $props();

	const flagClassNames = () => {
		switch (size) {
			case 'xs':
				return 'w-[2rem] h-[1.5rem] rounded';
			case 'sm':
				return 'w-[4rem] h-[3rem] rounded-lg';
			case 'md':
				return 'w-[6rem] h-[4.5rem] rounded-lg';
			case 'lg':
				return 'w-[8rem] h-[6rem] rounded-lg';
		}
	};

</script>

<div class="{flagClassNames()} overflow-hidden shadow flex justify-center items-center">
  <span class="fi fi-{countryCode}"></span>
</div>


<style>
  .fi {
    width: 100% !important;
    line-height: 100rem !important;
  }
</style>