import type { Component } from 'svelte';
import Stickfight from '$lib/win95/apps/stickfight.svelte';
import Paint from '$lib/win95/apps/paint.svelte';
import Minesweeper from '$lib/win95/apps/minesweeper.svelte';
import Pong from '$lib/win95/apps/pong.svelte';
import Calculator from '$lib/win95/apps/calculator.svelte';
import Notepad from '$lib/win95/apps/notepad.svelte';
import About from '$lib/win95/apps/about.svelte';
import Recyclebin from '$lib/win95/apps/recyclebin.svelte';

export const win95registry: Record<string, Component> = {
	stickfight: Stickfight,
	paint: Paint,
	minesweeper: Minesweeper,
	pong: Pong,
	calculator: Calculator,
	notepad: Notepad,
	about: About,
	recyclebin: Recyclebin
};

export type win95appid = keyof typeof win95registry;
