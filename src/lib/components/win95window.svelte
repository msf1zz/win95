<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import { iconfor } from '$lib/win95/icons';
	import { fitDesktopWindow, measureDesktopArea } from '$lib/win95/desktop-bounds';

	const PAD = 8;

	let {
		title,
		iconId = '',
		x = 80,
		y = 60,
		width = 420,
		height = 340,
		z = 1,
		active = false,
		onclose,
		onfocus,
		children
	}: {
		title: string;
		iconId?: string;
		x?: number;
		y?: number;
		width?: number;
		height?: number;
		z?: number;
		active?: boolean;
		onclose: () => void;
		onfocus: () => void;
		children: Snippet;
	} = $props();

	let root: HTMLDivElement;
	let posX = $state(untrack(() => x));
	let posY = $state(untrack(() => y));
	let dragging = $state(false);
	let dragOffsetX = 0;
	let dragOffsetY = 0;
	let viewportW = $state(0);
	let areaW = $state(0);
	let areaH = $state(0);

	const winicon = $derived(iconId ? iconfor(iconId) : '');

	const compact = $derived(areaW > 0 && areaW <= 1023);
	const phone = $derived(areaW > 0 && areaW <= 767);

	const layout = $derived.by(() => {
		if (areaW <= 0 || areaH <= 0) {
			return { w: width, h: height, x, y };
		}
		if (areaW > 1023) {
			return { w: width, h: height, x, y };
		}
		return fitDesktopWindow({ w: areaW, h: areaH }, width, height, 0, PAD);
	});

	$effect.pre(() => {
		if (!dragging) {
			posX = layout.x;
			posY = layout.y;
		}
	});

	function desktop(): HTMLElement | null {
		return root?.closest('.desktop') as HTMLElement | null;
	}

	function clampPos(nx: number, ny: number) {
		const host = desktop();
		const winW = root?.offsetWidth ?? layout.w;
		const winH = root?.offsetHeight ?? layout.h;
		const maxW = host?.clientWidth ?? areaW;
		const maxH = host?.clientHeight ?? areaH;
		return {
			x: Math.min(Math.max(0, nx), Math.max(0, maxW - winW)),
			y: Math.min(Math.max(0, ny), Math.max(0, maxH - winH))
		};
	}

	function startDrag(ev: PointerEvent) {
		if ((ev.target as HTMLElement).closest('button')) return;
		onfocus();
		dragging = true;
		const host = desktop();
		const rect = host?.getBoundingClientRect();
		const left = rect?.left ?? 0;
		const top = rect?.top ?? 0;
		dragOffsetX = ev.clientX - left - posX;
		dragOffsetY = ev.clientY - top - posY;
		(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
	}

	function moveDrag(ev: PointerEvent) {
		if (!dragging) return;
		const host = desktop();
		const rect = host?.getBoundingClientRect();
		const left = rect?.left ?? 0;
		const top = rect?.top ?? 0;
		const next = clampPos(ev.clientX - left - dragOffsetX, ev.clientY - top - dragOffsetY);
		posX = next.x;
		posY = next.y;
	}

	function endDrag(ev: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		try {
			(ev.currentTarget as HTMLElement).releasePointerCapture(ev.pointerId);
		} catch {
			/* ignore */
		}
	}

	function measureArea() {
		const host = desktop();
		const taskbar = host?.closest('.win95')?.querySelector('.taskbar') as HTMLElement | null;
		const area = measureDesktopArea(host, taskbar);
		areaW = area.w;
		areaH = area.h;
		viewportW = typeof window !== 'undefined' ? window.innerWidth : area.w;
	}

	$effect(() => {
		if (!root) return;
		measureArea();
		const host = desktop();
		if (!host) return;
		const ro = new ResizeObserver(measureArea);
		ro.observe(host);
		const taskbar = host.closest('.win95')?.querySelector('.taskbar');
		if (taskbar) ro.observe(taskbar);
		window.addEventListener('resize', measureArea);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', measureArea);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={root}
	class="win-window"
	class:active
	class:inactive={!active}
	class:compact
	class:phone
	style:left="{posX}px; top:{posY}px; width:{layout.w}px; height:{layout.h}px; z-index:{z}"
	onpointerdown={onfocus}
>
	<div
		class="titlebar"
		class:active
		onpointerdown={startDrag}
		onpointermove={moveDrag}
		onpointerup={endDrag}
		onpointercancel={endDrag}
	>
		{#if winicon}
			<img class="win-ico" src={winicon} alt="" width="16" height="16" />
		{/if}
		<span class="title">{title}</span>
		<div class="controls">
			<button type="button" class="ctrl min" aria-label="Minimize" disabled>
				<span></span>
			</button>
			<button type="button" class="ctrl max" aria-label="Maximize" disabled>
				<span></span>
			</button>
			<button type="button" class="ctrl close" aria-label="Close" onclick={onclose}>
				<span></span>
			</button>
		</div>
	</div>
	<div class="resize-edge" aria-hidden="true"></div>
	<div class="client">
		{@render children()}
	</div>
</div>

<style>
	.win-window {
		position: absolute;
		display: flex;
		flex-direction: column;
		padding: 2px;
		background: #c0c0c0;
		border: 1px solid #000;
		box-shadow:
			1px 1px 0 #dfdfdf,
			2px 2px 0 #808080,
			3px 3px 6px rgba(0, 0, 0, 0.35);
		font-family: 'Tahoma', 'MS Sans Serif', Arial, sans-serif;
		font-size: 11px;
		user-select: none;
		max-width: 100%;
		max-height: 100%;
		box-sizing: border-box;
	}

	.win-window.inactive {
		box-shadow: 1px 1px 0 #dfdfdf, 2px 2px 4px rgba(0, 0, 0, 0.2);
	}

	.titlebar {
		display: flex;
		align-items: center;
		gap: 3px;
		height: 20px;
		padding: 1px 2px;
		background: linear-gradient(90deg, #808080 0%, #b0b0b0 100%);
		color: #ececec;
		cursor: default;
	}

	.titlebar.active {
		background: linear-gradient(90deg, #000080 0%, #1084d0 8%, #000080 100%);
		color: #fff;
	}

	.win-ico {
		width: 16px;
		height: 16px;
		image-rendering: pixelated;
		flex-shrink: 0;
	}

	.title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 700;
		font-size: 11px;
		letter-spacing: 0.02em;
	}

	.controls {
		display: flex;
		gap: 2px;
		flex-shrink: 0;
	}

	.ctrl {
		width: 16px;
		height: 14px;
		padding: 0;
		border: none;
		background: #c0c0c0;
		box-shadow:
			inset -1px -1px #0a0a0a,
			inset 1px 1px #fff,
			inset -2px -2px #808080,
			inset 2px 2px #dfdfdf;
		cursor: default;
		position: relative;
		display: grid;
		place-items: center;
	}

	.ctrl:disabled {
		opacity: 0.5;
	}

	.ctrl.min span {
		display: block;
		width: 8px;
		height: 2px;
		background: #000;
		margin-top: 4px;
	}

	.ctrl.max span {
		display: block;
		width: 8px;
		height: 7px;
		border: 1px solid #000;
		background: transparent;
	}

	.ctrl.close span {
		position: relative;
		display: block;
		width: 10px;
		height: 10px;
	}

	.ctrl.close span::before,
	.ctrl.close span::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 10px;
		height: 2px;
		background: #000;
	}

	.ctrl.close span::before {
		transform: translate(-50%, -50%) rotate(45deg);
	}

	.ctrl.close span::after {
		transform: translate(-50%, -50%) rotate(-45deg);
	}

	.ctrl:active:not(:disabled) {
		box-shadow:
			inset -1px -1px #fff,
			inset 1px 1px #0a0a0a,
			inset -2px -2px #dfdfdf,
			inset 2px 2px #808080;
	}

	.resize-edge {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 14px;
		height: 14px;
		cursor: nwse-resize;
		background: linear-gradient(135deg, transparent 50%, #808080 50%, #c0c0c0 70%, transparent 70%);
		pointer-events: none;
	}

	.client {
		flex: 1;
		min-height: 0;
		border: 1px solid;
		border-color: #808080 #fff #fff #808080;
		background: #c0c0c0;
		overflow: hidden;
	}

	.client :global(> *) {
		width: 100%;
		height: 100%;
	}

	.win-window.compact .titlebar {
		touch-action: none;
	}

	.win-window.phone {
		box-shadow:
			1px 1px 0 #dfdfdf,
			2px 2px 0 #808080,
			3px 3px 8px rgba(0, 0, 0, 0.4);
	}

	.win-window.phone .ctrl {
		width: 28px;
		height: 24px;
	}

	@media (max-width: 767px) {
		.title {
			font-size: 12px;
		}
	}
</style>
