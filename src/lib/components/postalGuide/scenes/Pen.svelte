<!-- A pen, its tip at the origin. -->
<path d="M0 0l2 -8 6 4Z" class="nib" />
<path d="M2 -8L21 -40l6 4L8 -4Z" class="barrel" />
<path d="M21 -40l2.5 -4q1 -1.5 2.5 -0.5l3 2q1.5 1 0.5 2.5l-2.5 4Z" class="cap" />

<style>
	.nib {
		fill: var(--ink);
	}

	.barrel {
		fill: var(--color-primary);
	}

	.cap {
		fill: color-mix(in oklab, var(--color-primary) 60%, black);
	}
</style>
