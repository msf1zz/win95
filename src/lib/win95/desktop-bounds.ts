export type desktoparea = { w: number; h: number };

export function measureDesktopArea(
	desktop: HTMLElement | null | undefined,
	taskbar: HTMLElement | null | undefined
): desktoparea {
	if (desktop && desktop.clientHeight > 0) {
		return { w: desktop.clientWidth, h: desktop.clientHeight };
	}
	const tb = taskbar?.offsetHeight ?? 38;
	return {
		w: typeof window !== 'undefined' ? window.innerWidth : 320,
		h: typeof window !== 'undefined' ? Math.max(120, window.innerHeight - tb) : 480
	};
}

export function fitDesktopWindow(
	area: desktoparea,
	reqW: number,
	reqH: number,
	offset: number,
	pad = 8
) {
	const phone = area.w <= 767;
	const tablet = area.w <= 1023;

	if (phone) {
		return {
			w: Math.max(240, area.w - pad * 2),
			h: Math.max(160, area.h - pad * 2),
			x: pad,
			y: pad
		};
	}

	if (tablet) {
		const w = Math.min(reqW, area.w - pad * 2);
		const h = Math.min(reqH, area.h - pad * 2);
		return {
			w,
			h,
			x: Math.min(pad + offset, Math.max(pad, area.w - w - pad)),
			y: Math.min(pad + offset, Math.max(pad, area.h - h - pad))
		};
	}

	return { w: reqW, h: reqH, x: 48 + offset, y: 32 + offset };
}
