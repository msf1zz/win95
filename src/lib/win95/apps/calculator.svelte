<script lang="ts">
	import { onMount } from 'svelte';
	import { bindswipegestures } from '$lib/utils/swipe-gestures';
	import '../win95.css';

	let display = $state('0');
	let acc = $state<number | null>(null);
	let op = $state<string | null>(null);
	let fresh = $state(true);
	let padEl: HTMLDivElement;

	function inputDigit(d: string) {
		if (fresh) {
			display = d;
			fresh = false;
		} else if (display === '0' && d !== '.') {
			display = d;
		} else if (d === '.' && display.includes('.')) {
			return;
		} else {
			display += d;
		}
	}

	function clearAll() {
		display = '0';
		acc = null;
		op = null;
		fresh = true;
	}

	function operate(next: string) {
		const val = parseFloat(display);
		if (acc === null) acc = val;
		else if (op && !fresh) {
			acc = calc(acc, val, op);
			display = String(acc);
		}
		op = next;
		fresh = true;
	}

	function equals() {
		if (acc === null || !op) return;
		const val = parseFloat(display);
		acc = calc(acc, val, op);
		display = String(acc);
		op = null;
		fresh = true;
	}

	function calc(a: number, b: number, operator: string) {
		switch (operator) {
			case '+':
				return a + b;
			case '-':
				return a - b;
			case '*':
				return a * b;
			case '/':
				return b === 0 ? NaN : a / b;
			default:
				return b;
		}
	}

	const buttons = [
		['MC', 'MR', 'MS', 'M+'],
		['CE', 'C', '⌫', '÷'],
		['7', '8', '9', '×'],
		['4', '5', '6', '-'],
		['1', '2', '3', '+'],
		['±', '0', '.', '=']
	] as const;

	function press(label: string) {
		if (label >= '0' && label <= '9') inputDigit(label);
		else if (label === '.') inputDigit('.');
		else if (label === 'C') clearAll();
		else if (label === 'CE') {
			display = '0';
			fresh = true;
		} else if (label === '⌫') {
			display = display.length > 1 ? display.slice(0, -1) : '0';
		} else if (label === '±') {
			display = String(parseFloat(display) * -1);
		} else if (label === '+') operate('+');
		else if (label === '-') operate('-');
		else if (label === '×') operate('*');
		else if (label === '÷') operate('/');
		else if (label === '=') equals();
	}

	onMount(() => {
		if (!padEl) return;
		const gestures = bindswipegestures(padEl, {
			onswipe(dir) {
				if (dir === 'left') press('⌫');
				else if (dir === 'right') press('+');
				else if (dir === 'up') press('C');
				else if (dir === 'down') press('=');
			}
		});
		return () => gestures.cleanup();
	});
</script>

<div class="w95-app calc-app">
	<div class="lcd">{display}</div>
	<div class="pad" bind:this={padEl}>
		{#each buttons as row}
			<div class="row">
				{#each row as label}
					<button
						type="button"
						class="w95-btn key"
						class:wide={label === '0'}
						class:accent={['÷', '×', '-', '+', '='].includes(label)}
						onclick={() => press(label)}
					>
						{label}
					</button>
				{/each}
			</div>
		{/each}
	</div>
	<p class="hint-touch">swipe ← backspace · → add · ↑ clear · ↓ equals</p>
</div>

<style>
	.calc-app {
		padding: 8px;
		width: fit-content;
		align-self: center;
	}

	.lcd {
		text-align: right;
		padding: 6px 8px;
		margin-bottom: 6px;
		background: #fff;
		border: 2px solid;
		border-color: #808080 #fff #fff #808080;
		font-family: 'Courier New', monospace;
		font-size: 22px;
		min-width: 180px;
	}

	.pad {
		display: flex;
		flex-direction: column;
		gap: 4px;
		touch-action: none;
	}

	.hint-touch {
		display: none;
		margin: 6px 0 0;
		font-size: 10px;
		color: #404040;
		text-align: center;
	}

	@media (hover: none), (pointer: coarse) {
		.hint-touch {
			display: block;
		}
	}

	.row {
		display: flex;
		gap: 4px;
	}

	.key {
		width: 42px;
		height: 28px;
		font-weight: 700;
	}

	.key.wide {
		width: 88px;
	}

	.key.accent {
		color: #800000;
	}

	@media (max-width: 767px) {
		.key {
			width: clamp(36px, 10vw, 42px);
			height: clamp(32px, 9vw, 28px);
		}

		.key.wide {
			width: clamp(76px, 21vw, 88px);
		}

		.lcd {
			min-width: 0;
			width: 100%;
			font-size: clamp(18px, 5vw, 22px);
		}
	}
</style>
