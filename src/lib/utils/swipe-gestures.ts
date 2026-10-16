export type swipedir = 'left' | 'right' | 'up' | 'down';

export type swipemeta = {
	velocity: number;
	distance: number;
	dx: number;
	dy: number;
	duration: number;
	isFlick: boolean;
};

export type swipeoptions = {
	threshold?: number;
	tapMaxMove?: number;
	tapMaxMs?: number;
	flickMinVelocity?: number;
	flickMinDistance?: number;
	directionRatio?: number;
	repeatMs?: number;
	stepPx?: number;
	onpress?: (point: swipepoint) => void;
	onswipe?: (dir: swipedir, meta: swipemeta) => void;
	ondrag?: (dir: swipedir, meta: swipemeta) => void;
	ontap?: (point: swipepoint) => void;
	onrelease?: () => void;
};

export type swipepoint = { x: number; y: number };

type sample = { x: number; y: number; t: number };

function haptic(ms = 8) {
	try {
		navigator.vibrate?.(ms);
	} catch {}
}

function resolveDir(dx: number, dy: number, ratio: number): swipedir | null {
	const absDx = Math.abs(dx);
	const absDy = Math.abs(dy);
	if (absDx < 1 && absDy < 1) return null;
	if (absDx > absDy * ratio) return dx > 0 ? 'right' : 'left';
	if (absDy > absDx * ratio) return dy > 0 ? 'down' : 'up';
	return null;
}

function endVelocity(samples: sample[]) {
	if (samples.length < 2) return 0;
	const recent = samples.filter((s) => samples[samples.length - 1].t - s.t <= 90);
	const window = recent.length >= 2 ? recent : samples.slice(-2);
	const first = window[0];
	const last = window[window.length - 1];
	const dt = Math.max(1, last.t - first.t);
	const dist = Math.hypot(last.x - first.x, last.y - first.y);
	return dist / dt;
}

export function isflick(
	meta: Pick<swipemeta, 'velocity' | 'distance' | 'dy' | 'isFlick'>,
	options?: Pick<swipeoptions, 'flickMinVelocity' | 'flickMinDistance'>
) {
	if (meta.isFlick) return true;
	const flickMinVelocity = options?.flickMinVelocity ?? 0.55;
	const flickMinDistance = options?.flickMinDistance ?? 48;
	return meta.velocity >= flickMinVelocity || meta.distance >= flickMinDistance;
}

export function bindswipegestures(el: HTMLElement, options: swipeoptions) {
	const threshold = options.threshold ?? 22;
	const tapMaxMove = options.tapMaxMove ?? 16;
	const tapMaxMs = options.tapMaxMs ?? 320;
	const flickMinVelocity = options.flickMinVelocity ?? 0.55;
	const flickMinDistance = options.flickMinDistance ?? 48;
	const directionRatio = options.directionRatio ?? 1.35;
	const repeatMs = options.repeatMs ?? 95;
	const stepPx = options.stepPx ?? 28;

	let startX = 0;
	let startY = 0;
	let startTime = 0;
	let active = false;
	let lockedDir: swipedir | null = null;
	let stepsFired = 0;
	let lastRepeatAt = 0;
	let usedPress = false;
	let samples: sample[] = [];
	let aborted = false;

	function abort() {
		aborted = true;
		active = false;
		lockedDir = null;
	}

	function meta(dx: number, dy: number, dt: number): swipemeta {
		const distance = Math.hypot(dx, dy);
		const velocity = endVelocity(samples);
		return {
			velocity,
			distance,
			dx,
			dy,
			duration: dt,
			isFlick: velocity >= flickMinVelocity || distance >= flickMinDistance
		};
	}

	function record(x: number, y: number) {
		const t = performance.now();
		samples.push({ x, y, t });
		if (samples.length > 12) samples.shift();
	}

	function fire(dir: swipedir, kind: 'swipe' | 'drag', dx: number, dy: number, dt: number) {
		if (aborted) return;
		const payload = meta(dx, dy, dt);
		if (kind === 'drag') options.ondrag?.(dir, payload);
		else options.onswipe?.(dir, payload);
	}

	function tryRepeat(x: number, y: number) {
		if (!lockedDir || aborted) return;
		const dx = x - startX;
		const dy = y - startY;
		const primary =
			lockedDir === 'left' || lockedDir === 'right' ? Math.abs(dx) : Math.abs(dy);
		const expected = 1 + Math.floor(Math.max(0, primary - threshold) / stepPx);
		const now = performance.now();
		if (expected <= stepsFired || now - lastRepeatAt < repeatMs) return;
		fire(lockedDir, 'drag', dx, dy, now - startTime);
		stepsFired = expected;
		lastRepeatAt = now;
	}

	function localPoint(e: PointerEvent): swipepoint {
		const rect = el.getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}

	function ondown(e: PointerEvent) {
		if (e.button !== 0) return;
		active = true;
		aborted = false;
		usedPress = false;
		lockedDir = null;
		stepsFired = 0;
		samples = [];
		startX = e.clientX;
		startY = e.clientY;
		startTime = performance.now();
		lastRepeatAt = startTime;
		record(startX, startY);
		el.setPointerCapture(e.pointerId);
		e.preventDefault();

		if (options.onpress) {
			options.onpress(localPoint(e));
			usedPress = true;
			haptic(6);
		}
	}

	function onmove(e: PointerEvent) {
		if (!active || aborted) return;
		e.preventDefault();
		record(e.clientX, e.clientY);

		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);
		const dist = Math.hypot(dx, dy);

		if (!lockedDir) {
			if (dist < threshold) return;
			const dir = resolveDir(dx, dy, directionRatio);
			if (!dir) return;
			lockedDir = dir;
			stepsFired = 1;
			lastRepeatAt = performance.now();
			fire(dir, 'swipe', dx, dy, performance.now() - startTime);
			haptic(5);
			return;
		}

		tryRepeat(e.clientX, e.clientY);
	}

	function onup(e: PointerEvent) {
		if (!active) return;
		active = false;
		if (aborted) {
			options.onrelease?.();
			return;
		}

		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		const dt = performance.now() - startTime;
		const dist = Math.hypot(dx, dy);

		if (lockedDir) {
			const expected =
				1 +
				Math.floor(
					Math.max(
						0,
						(lockedDir === 'left' || lockedDir === 'right' ? Math.abs(dx) : Math.abs(dy)) -
							threshold
					) / stepPx
				);
			while (stepsFired < expected) {
				fire(lockedDir, 'drag', dx, dy, dt);
				stepsFired++;
			}
			lockedDir = null;
			options.onrelease?.();
			return;
		}

		if (!usedPress && dist < tapMaxMove && dt < tapMaxMs) {
			options.ontap?.(localPoint(e));
			haptic(4);
		}
		options.onrelease?.();
	}

	function oncancel() {
		active = false;
		lockedDir = null;
		options.onrelease?.();
	}

	el.addEventListener('pointerdown', ondown, { passive: false });
	el.addEventListener('pointermove', onmove, { passive: false });
	el.addEventListener('pointerup', onup);
	el.addEventListener('pointercancel', oncancel);

	return {
		cleanup: () => {
			el.removeEventListener('pointerdown', ondown);
			el.removeEventListener('pointermove', onmove);
			el.removeEventListener('pointerup', onup);
			el.removeEventListener('pointercancel', oncancel);
		},
		abort
	};
}
