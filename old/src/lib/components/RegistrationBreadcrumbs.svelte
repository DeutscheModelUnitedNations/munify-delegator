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
	<div class="card mt-4 w-fit bg-base-100 px-4 py-1 transition-all duration-300 hover:bg-base-200">
		<div class="breadcrumbs overflow-hidden text-xs">
			<ul>
				<li>
					<a href="/" class="!no-underline" aria-label="Zurück zur Startseite">
						<i class="fa-solid fa-house hover:text-primary transition-all duration-300"></i>
					</a>
				</li>
				{#each breadcrumbs as { title, href, icon }}
					<li>
						<a {href} class="hover:text-primary !no-underline transition-all duration-300">
							{#if icon}
								<i class="fa-solid fa-{icon} {title && 'mr-1'}"></i>
							{/if}
							{title}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
