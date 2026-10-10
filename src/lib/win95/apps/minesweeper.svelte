<script lang="ts">
	import { onMount } from 'svelte';
	import { bindswipegestures } from '$lib/utils/swipe-gestures';
	import '../win95.css';

	const COLS = 9;
	const ROWS = 9;
	const MINES = 10;

	type cell = { mine: boolean; open: boolean; flag: boolean; n: number };

	let grid = $state<cell[][]>([]);
	let dead = $state(false);
	let won = $state(false);
	let flags = $state(0);
	let started = $state(false);
	let status = $state('');

	function mkgrid(): cell[][] {
		return Array.from({ length: ROWS }, () =>
			Array.from({ length: COLS }, () => ({ mine: false, open: false, flag: false, n: 0 }))
		);
	}

	function neighbors(r: number, c: number) {
		const out: [number, number][] = [];
		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				if (!dr && !dc) continue;
				const nr = r + dr;
				const nc = c + dc;
				if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push([nr, nc]);
			}
		}
		return out;
	}

	function placeMines(skipR: number, skipC: number) {
		let placed = 0;
		while (placed < MINES) {
			const r = Math.floor(Math.random() * ROWS);
			const c = Math.floor(Math.random() * COLS);
			if (grid[r][c].mine || (r === skipR && c === skipC)) continue;
			grid[r][c].mine = true;
			placed++;
		}
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				if (grid[r][c].mine) continue;
				grid[r][c].n = neighbors(r, c).filter(([nr, nc]) => grid[nr][nc].mine).length;
			}
		}
	}

	function flood(r: number, c: number) {
		const stack: [number, number][] = [[r, c]];
		while (stack.length) {
			const [cr, cc] = stack.pop()!;
			const cell = grid[cr][cc];
			if (cell.open || cell.flag) continue;
			cell.open = true;
			if (cell.n === 0 && !cell.mine) {
				for (const [nr, nc] of neighbors(cr, cc)) {
					if (!grid[nr][nc].open) stack.push([nr, nc]);
				}
			}
		}
	}

	function checkWin() {
		for (const row of grid) {
			for (const cell of row) {
				if (!cell.mine && !cell.open) return;
			}
		}
		won = true;
		status = 'You Win!';
	}

	function reveal(r: number, c: number) {
		if (dead || won) return;
		const cell = grid[r][c];
		if (cell.flag || cell.open) return;

		if (!started) {
			started = true;
			placeMines(r, c);
		}

		cell.open = true;
		grid = grid;
		if (cell.mine) {
			dead = true;
			status = 'Game Over';
			for (const row of grid) {
				for (const ch of row) {
					if (ch.mine) ch.open = true;
				}
			}
			return;
		}

		if (cell.n === 0) flood(r, c);
		checkWin();
	}

	function toggleFlag(r: number, c: number) {
		if (dead || won) return;
		const cell = grid[r][c];
		if (cell.open) return;
		cell.flag = !cell.flag;
		flags += cell.flag ? 1 : -1;
		grid = grid;
	}

	function reset() {
		grid = mkgrid();
		dead = false;
		won = false;
		flags = 0;
		started = false;
		status = '';
	}

	reset();

	const face = $derived(dead ? '☹' : won ? '😎' : '🙂');
	const counter = $derived(String(Math.max(0, MINES - flags)).padStart(3, '0'));

	const colors = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];

	let flagTimer: ReturnType<typeof setTimeout> | null = null;
	let flagTarget: [number, number] | null = null;
	let gridEl: HTMLDivElement;
	let suppressTap = false;

	function clearFlagTimer() {
		if (flagTimer) clearTimeout(flagTimer);
		flagTimer = null;
		flagTarget = null;
	}

	function cellAt(x: number, y: number): [number, number] | null {
		if (!gridEl) return null;
		const cellW = gridEl.clientWidth / COLS;
		const cellH = gridEl.clientHeight / ROWS;
		const c = Math.min(COLS - 1, Math.max(0, Math.floor(x / cellW)));
		const r = Math.min(ROWS - 1, Math.max(0, Math.floor(y / cellH)));
		return [r, c];
	}

	function onCellPointerDown(r: number, c: number) {
		clearFlagTimer();
		flagTarget = [r, c];
		flagTimer = setTimeout(() => {
			if (flagTarget?.[0] === r && flagTarget?.[1] === c) {
				toggleFlag(r, c);
				suppressTap = true;
				flagTarget = null;
				flagTimer = null;
			}
		}, 450);
	}

	function onCellPointerUp() {
		clearFlagTimer();
	}

	onMount(() => {
		if (!gridEl) return;
		const gestures = bindswipegestures(gridEl, {
			ontap(p) {
				if (suppressTap) {
					suppressTap = false;
					return;
				}
				const cell = cellAt(p.x, p.y);
				if (cell) reveal(cell[0], cell[1]);
			}
		});
		return () => gestures.cleanup();
	});
</script>

<div class="w95-app">
	<div class="w95-menubar" role="menubar">
		<button type="button">Game</button>
		<button type="button">Help</button>
	</div>
	<div class="mine-frame">
		<div class="mine-head">
			<span class="lcd">{counter}</span>
			<button type="button" class="face" onclick={reset}>{face}</button>
			<span class="lcd">000</span>
		</div>
		<div class="grid" role="grid" bind:this={gridEl}>
			{#each grid as row, r}
				{#each row as cell, c}
					<button
						type="button"
						class="cell"
						class:open={cell.open}
						class:mine={cell.open && cell.mine}
						oncontextmenu={(e) => {
							e.preventDefault();
							toggleFlag(r, c);
						}}
						onpointerdown={() => onCellPointerDown(r, c)}
						onpointerup={onCellPointerUp}
						onpointerleave={onCellPointerUp}
						onpointercancel={onCellPointerUp}
					>
						{#if cell.flag && !cell.open}
							🚩
						{:else if cell.open}
							{#if cell.mine}
								💣
							{:else if cell.n}
								<span style:color={colors[cell.n]}>{cell.n}</span>
							{/if}
						{/if}
					</button>
				{/each}
			{/each}
		</div>
	</div>
	<div class="w95-status">
		<span>{status || 'Tap open · hold to flag'}</span>
	</div>
</div>

<style>
	.mine-frame {
		margin: 6px;
		padding: 6px;
		border: 3px solid;
		border-color: #808080 #fff #fff #808080;
		background: #c0c0c0;
		width: fit-content;
		max-width: calc(100% - 12px);
		align-self: center;
	}

	.mine-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 6px;
		gap: 8px;
	}

	.lcd {
		display: inline-block;
		min-width: 39px;
		padding: 2px 4px;
		background: #000;
		color: #f00;
		font-family: 'Courier New', monospace;
		font-size: 20px;
		font-weight: 700;
		line-height: 1;
		border: 2px solid;
		border-color: #808080 #fff #fff #808080;
		text-align: center;
	}

	.face {
		width: 26px;
		height: 26px;
		font-size: 14px;
		line-height: 1;
		padding: 0;
		border: 2px solid;
		border-color: #fff #808080 #808080 #fff;
		background: #c0c0c0;
		cursor: default;
	}

	.face:active {
		border-color: #808080 #fff #fff #808080;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(9, var(--mine-cell, 20px));
		gap: 0;
		border: 3px solid;
		border-color: #808080 #fff #fff #808080;
		touch-action: none;
	}

	.cell {
		width: var(--mine-cell, 20px);
		height: var(--mine-cell, 20px);
		padding: 0;
		border: 2px solid;
		border-color: #fff #808080 #808080 #fff;
		background: #c0c0c0;
		font-size: clamp(10px, 2.8vw, 13px);
		font-weight: 700;
		line-height: 1;
		cursor: default;
		touch-action: manipulation;
	}

	.cell.open {
		border: 1px solid #808080;
		background: #bdbdbd;
	}

	.cell.mine {
		background: #f00;
	}

	@media (max-width: 1023px) {
		.mine-frame {
			--mine-cell: clamp(26px, 8.5vw, 34px);
		}

		.face {
			width: 34px;
			height: 34px;
			font-size: 18px;
		}
	}

	@media (max-width: 767px) {
		.mine-frame {
			--mine-cell: clamp(28px, 9.5vw, 36px);
			margin: 4px auto;
		}
	}
</style>
