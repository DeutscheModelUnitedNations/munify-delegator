<!--
	Where a finger drags a card on a touch screen. The drag library sets touch-action: none on the
	whole card, which leaves a finger on a card no way to scroll the pool or the page, so cards
	that show this set `pointer-coarse:touch-pan-y!` and only the grip starts a drag there. Hidden
	where there is a mouse.
-->
<span
	class="text-base-content/50 -m-1 hidden size-8 shrink-0 cursor-grab touch-none items-center justify-center pointer-coarse:flex"
	aria-hidden="true"
>
	<i class="fa-sharp-duotone fa-solid fa-grip-vertical text-base"></i>
</span>
