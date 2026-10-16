<script lang="ts">
	import { onMount } from 'svelte';
	import { bindswipegestures } from '$lib/utils/swipe-gestures';
	import '../win95.css';

	const palette = [
		'#000000', '#808080', '#800000', '#808000',
		'#008000', '#008080', '#000080', '#800080',
		'#ffffff', '#c0c0c0', '#ff0000', '#ffff00',
		'#00ff00', '#00ffff', '#0000ff', '#ff00ff'
	];

	let canvas: HTMLCanvasElement;
	let tool = $state<'pencil' | 'eraser' | 'brush'>('pencil');
	let color = $state('#000000');
	let brush = $state(3);
	let status = $state('dubi doggy.');
	let toolbarEl: HTMLDivElement;

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		let drawing = false;
		let lastW = 0;
		let lastH = 0;

		function resize() {
			const dpr = window.devicePixelRatio || 1;
			const rect = canvas.getBoundingClientRect();
			const w = Math.max(1, Math.floor(rect.width));
			const h = Math.max(1, Math.floor(rect.height));
			if (w === lastW && h === lastH) return;

			const snap = document.createElement('canvas');
			snap.width = canvas.width;
			snap.height = canvas.height;
			snap.getContext('2d')?.drawImage(canvas, 0, 0);

			lastW = w;
			lastH = h;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, w, h);
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			if (snap.width) ctx.drawImage(snap, 0, 0, w, h);
		}

		function pos(ev: PointerEvent) {
			const rect = canvas.getBoundingClientRect();
			return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
		}

		function strokeAt(p: { x: number; y: number }) {
			const size = tool === 'eraser' ? Math.max(brush * 3, 10) : tool === 'brush' ? brush * 2 : brush;
			if (tool === 'eraser') {
				ctx.globalCompositeOperation = 'destination-out';
				ctx.strokeStyle = 'rgba(0,0,0,1)';
			} else {
				ctx.globalCompositeOperation = 'source-over';
				ctx.strokeStyle = color;
			}
			ctx.lineWidth = size;
			ctx.lineTo(p.x, p.y);
			ctx.stroke();
			ctx.globalCompositeOperation = 'source-over';
		}

		function start(ev: PointerEvent) {
			drawing = true;
			const p = pos(ev);
			ctx.beginPath();
			ctx.moveTo(p.x, p.y);
			strokeAt(p);
			status = tool === 'eraser' ? 'Eraser selected' : `Drawing with ${color}`;
		}

		function move(ev: PointerEvent) {
			if (!drawing) return;
			strokeAt(pos(ev));
		}

		function stop() {
			drawing = false;
		}

		function clearAll() {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, lastW, lastH);
			status = 'Image cleared';
		}

		clearFn = clearAll;
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(canvas.parentElement ?? canvas);
		canvas.addEventListener('pointerdown', start);
		canvas.addEventListener('pointermove', move);
		canvas.addEventListener('pointerup', stop);
		canvas.addEventListener('pointerleave', stop);

		const toolbarGestures = toolbarEl
			? bindswipegestures(toolbarEl, {
					onswipe(dir) {
						if (dir === 'left') brush = Math.max(1, brush - 1);
						else if (dir === 'right') brush = Math.min(12, brush + 1);
						status = `Brush size ${brush}`;
					}
				})
			: null;

		return () => {
			ro.disconnect();
			toolbarGestures?.cleanup();
			canvas.removeEventListener('pointerdown', start);
			canvas.removeEventListener('pointermove', move);
			canvas.removeEventListener('pointerup', stop);
			canvas.removeEventListener('pointerleave', stop);
		};
	});

	let clearFn: () => void = () => {};

	function pickTool(t: typeof tool) {
		tool = t;
		status =
			t === 'eraser' ? 'Eraser: drag to erase' : t === 'brush' ? 'Brush selected' : 'Pencil selected';
	}
</script>

<div class="w95-app paint-app">
	<div class="w95-menubar" role="menubar">
		<button type="button">File</button>
		<button type="button">Edit</button>
		<button type="button">View</button>
		<button type="button">Image</button>
		<button type="button">Colors</button>
		<button type="button">Help</button>
	</div>

	<div class="w95-toolbar" bind:this={toolbarEl}>
		<button
			type="button"
			class="w95-btn"
			class:pressed={tool === 'pencil'}
			title="Pencil"
			onclick={() => pickTool('pencil')}
		>✏️</button>
		<button
			type="button"
			class="w95-btn"
			class:pressed={tool === 'brush'}
			title="Brush"
			onclick={() => pickTool('brush')}
		>🖌️</button>
		<button
			type="button"
			class="w95-btn"
			class:pressed={tool === 'eraser'}
			title="Eraser"
			onclick={() => pickTool('eraser')}
		>⌫</button>
		<span class="w95-sep"></span>
		<button type="button" class="w95-btn" title="Clear" onclick={() => clearFn()}>🗑</button>
		<span class="w95-sep"></span>
		<label class="size-label">
			Size
			<input type="range" min="1" max="12" bind:value={brush} />
		</label>
	</div>

	<div class="paint-body">
		<div class="palette">
			{#each palette as swatch}
				<button
					type="button"
					class="swatch"
					class:selected={color === swatch}
					style:background={swatch}
					title={swatch}
					onclick={() => (color = swatch)}
				></button>
			{/each}
			<div class="color-preview">
				<span style:background={color} title="foreground"></span>
				<span class="bg" title="background"></span>
			</div>
		</div>
		<div class="w95-workspace canvas-wrap">
			<canvas bind:this={canvas}></canvas>
		</div>
	</div>

	<div class="w95-status">
		<span>{status}</span>
		<span class="coords">tool: {tool}</span>
		<span class="hint-touch">draw on canvas · swipe toolbar ←→ brush size</span>
	</div>
</div>

<style>
	.paint-app {
		background: #c0c0c0;
	}

	.paint-body {
		flex: 1;
		min-height: 0;
		display: flex;
		gap: 4px;
		padding: 4px;
	}

	.palette {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 52px;
		flex-shrink: 0;
	}

	.swatch {
		width: 22px;
		height: 22px;
		padding: 0;
		border: 1px solid #000;
		box-shadow: inset -1px -1px #808080;
		cursor: default;
	}

	.swatch.selected {
		outline: 2px solid #000;
		outline-offset: 1px;
	}

	.color-preview {
		position: relative;
		width: 44px;
		height: 44px;
		margin-top: 4px;
	}

	.color-preview span {
		position: absolute;
		width: 26px;
		height: 26px;
		border: 1px solid #000;
	}

	.color-preview span:first-child {
		top: 0;
		left: 0;
		z-index: 1;
	}

	.color-preview .bg {
		bottom: 0;
		right: 0;
		background: #fff;
	}

	.canvas-wrap {
		border: 2px solid;
		border-color: #808080 #fff #fff #808080;
		background: #fff;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
		cursor: crosshair;
		touch-action: none;
		background: #fff;
	}

	.size-label {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 10px;
	}

	.size-label input {
		width: 64px;
	}

	.coords {
		flex: 0 0 100px !important;
		text-align: right;
	}

	.hint-touch {
		display: none;
		flex: 1 1 auto !important;
		font-size: 10px;
		text-align: right;
	}

	@media (hover: none), (pointer: coarse) {
		.hint-touch {
			display: inline;
		}
	}

	@media (max-width: 1023px) {
		.paint-body {
			flex-direction: column;
		}

		.palette {
			flex-direction: row;
			flex-wrap: wrap;
			width: 100%;
			align-items: center;
		}

		.color-preview {
			width: 44px;
			height: 28px;
			margin-top: 0;
			margin-left: auto;
		}

		.color-preview span {
			width: 22px;
			height: 22px;
		}

		.swatch {
			width: 28px;
			height: 28px;
		}

		.size-label input {
			width: 88px;
		}

		.coords {
			display: none;
		}
	}
</style>
