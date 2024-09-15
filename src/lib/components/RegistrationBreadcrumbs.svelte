<script lang="ts">
	interface Props {
		breadcrumbs: {
			href: string;
			title?: string;
			icon?: string;
		}[];
	}

	let { breadcrumbs }: Props = $props();
</script>

<div class="flex justify-center">
	<div class="card bg-base-100 hover:bg-base-200 transition-all duration-300 px-4 py-1 w-fit mt-4">
		<div class="breadcrumbs text-xs overflow-hidden">
			<ul>
				<li>
					<a href="/" class="!no-underline">
						<i class="fa-solid fa-house hover:text-primary transition-all duration-300"></i></a
					>
				</li>
				{#each breadcrumbs as { title, href, icon }}
					<li>
						<a {href} class="hover:text-primary transition-all duration-300 !no-underline">
							{#if icon}
								<i
									class="fa-solid fa-{icon} {title &&
										'mr-1'}"
								></i>
							{/if}
							{title}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
