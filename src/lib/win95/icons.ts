const enc = (svg: string) =>
	`data:image/svg+xml,${encodeURIComponent(svg.replace(/\n\s*/g, ' ').trim())}`;

export const desktopicons: Record<string, string> = {
	stickfight: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">
		<rect x="1" y="25" width="30" height="2" fill="#5a3d1e"/>
		<rect x="1" y="27" width="30" height="2" fill="#8b5a2b"/>
		<ellipse cx="16" cy="26" rx="14" ry="1" fill="#3d6b2e" opacity="0.5"/>
		<line x1="8" y1="22" x2="8" y2="9" stroke="#1a5cff" stroke-width="2.5" stroke-linecap="round"/>
		<circle cx="8" cy="7" r="3.5" fill="#1a5cff" stroke="#0033aa" stroke-width="0.5"/>
		<line x1="24" y1="22" x2="24" y2="9" stroke="#d4382a" stroke-width="2.5" stroke-linecap="round"/>
		<circle cx="24" cy="7" r="3.5" fill="#d4382a" stroke="#8b1a12" stroke-width="0.5"/>
		<line x1="8" y1="13" x2="15" y2="11" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round"/>
		<line x1="15" y1="11" x2="24" y2="14" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round"/>
		<line x1="8" y1="17" x2="13" y2="19" stroke="#1a5cff" stroke-width="2" stroke-linecap="round"/>
		<line x1="24" y1="17" x2="19" y2="19" stroke="#d4382a" stroke-width="2" stroke-linecap="round"/>
		<rect x="14" y="4" width="4" height="2" fill="#ff6b9d"/>
		<text x="16" y="6" text-anchor="middle" fill="#fff" font-size="3" font-family="Arial" font-weight="bold">VS</text>
	</svg>`),

	minesweeper: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">
		<rect x="14" y="5" width="3" height="22" fill="#606060" stroke="#000"/>
		<polygon points="17,6 28,11 17,16" fill="#e10600" stroke="#000"/>
		<rect x="9" y="26" width="14" height="3" fill="#808080" stroke="#000"/>
	</svg>`),

	pong: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">
		<rect x="2" y="2" width="28" height="28" fill="#0a1a0a" stroke="#000" stroke-width="1"/>
		<rect x="2" y="2" width="28" height="28" fill="none" stroke="#1a4a1a" stroke-width="1"/>
		<rect x="5" y="4" width="3" height="10" fill="#e8ffe8"/>
		<rect x="24" y="18" width="3" height="10" fill="#e8ffe8"/>
		<circle cx="16" cy="16" r="3" fill="#e8ffe8"/>
		<line x1="16" y1="4" x2="16" y2="28" stroke="#1a4a1a" stroke-width="1" stroke-dasharray="3 3"/>
		<text x="16" y="8" text-anchor="middle" fill="#4a8a4a" font-size="4" font-family="Arial">PONG</text>
	</svg>`),

	paint: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">
		<rect x="4" y="4" width="24" height="18" fill="#fff" stroke="#000"/>
		<rect x="6" y="6" width="6" height="5" fill="#ff0000"/>
		<rect x="13" y="6" width="6" height="5" fill="#00aa00"/>
		<rect x="20" y="6" width="6" height="5" fill="#0000ff"/>
		<rect x="6" y="12" width="6" height="5" fill="#ffff00"/>
		<rect x="13" y="12" width="6" height="5" fill="#ff00ff"/>
		<rect x="20" y="12" width="6" height="5" fill="#00ffff"/>
		<path d="M8 25 L14 8 L18 10 L12 27 Z" fill="#ffcc00" stroke="#996600" stroke-width="1"/>
		<rect x="17" y="23" width="9" height="4" fill="#996600" stroke="#664400"/>
		<ellipse cx="21" cy="25" rx="2" ry="1" fill="#cc8800"/>
	</svg>`),

	calculator: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">
		<rect x="5" y="2" width="22" height="28" fill="#c0c0c0" stroke="#000"/>
		<rect x="7" y="4" width="18" height="7" fill="#9fd89f" stroke="#808080"/>
		<text x="22" y="10" font-size="6" fill="#000" font-family="Arial" text-anchor="end">1337</text>
		<rect x="7" y="13" width="5" height="4" fill="#dfdfdf" stroke="#808080"/>
		<rect x="13" y="13" width="5" height="4" fill="#dfdfdf" stroke="#808080"/>
		<rect x="19" y="13" width="5" height="4" fill="#dfdfdf" stroke="#808080"/>
		<rect x="7" y="18" width="5" height="4" fill="#dfdfdf" stroke="#808080"/>
		<rect x="13" y="18" width="5" height="4" fill="#dfdfdf" stroke="#808080"/>
		<rect x="19" y="18" width="5" height="4" fill="#dfdfdf" stroke="#808080"/>
		<rect x="7" y="23" width="5" height="4" fill="#dfdfdf" stroke="#808080"/>
		<rect x="13" y="23" width="5" height="4" fill="#dfdfdf" stroke="#808080"/>
		<rect x="19" y="23" width="11" height="4" fill="#ff8080" stroke="#808080"/>
	</svg>`),

	notepad: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">
		<rect x="6" y="2" width="20" height="28" fill="#ffffe1" stroke="#000"/>
		<rect x="4" y="2" width="5" height="28" fill="#000080"/>
		<rect x="4" y="2" width="2" height="28" fill="#1084d0"/>
		<line x1="9" y1="8" x2="23" y2="8" stroke="#0000aa"/>
		<line x1="9" y1="12" x2="23" y2="12" stroke="#000"/>
		<line x1="9" y1="16" x2="21" y2="16" stroke="#000"/>
		<line x1="9" y1="20" x2="23" y2="20" stroke="#000"/>
		<line x1="9" y1="24" x2="18" y2="24" stroke="#000"/>
		<polygon points="26,2 26,8 20,2" fill="#e8e8c8" stroke="#000"/>
	</svg>`),

	mycomputer: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">
		<rect x="4" y="3" width="24" height="17" fill="#dcdcdc" stroke="#000"/>
		<rect x="6" y="5" width="20" height="13" fill="#000080"/>
		<rect x="8" y="7" width="7" height="5" fill="#1084d0"/>
		<rect x="16" y="7" width="8" height="9" fill="#c0c0c0"/>
		<rect x="17" y="8" width="6" height="1" fill="#fff"/>
		<rect x="17" y="10" width="4" height="1" fill="#808080"/>
		<rect x="11" y="22" width="10" height="3" fill="#a0a0a0" stroke="#000"/>
		<rect x="7" y="25" width="18" height="3" fill="#606060"/>
		<rect x="8" y="25" width="16" height="1" fill="#909090"/>
		<rect x="14" y="26" width="4" height="1" fill="#404040"/>
	</svg>`),

	recycle: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">
		<rect x="12" y="4" width="8" height="3" fill="#d4d4d4" stroke="#000"/>
		<rect x="6" y="7" width="20" height="4" fill="#c0c0c0" stroke="#000"/>
		<rect x="8" y="12" width="16" height="15" fill="#b5b5b5" stroke="#000"/>
		<rect x="12" y="15" width="2" height="9" fill="#808080"/>
		<rect x="18" y="15" width="2" height="9" fill="#808080"/>
	</svg>`),

	network: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">
		<rect x="3" y="7" width="11" height="9" fill="#c0c0c0" stroke="#000"/>
		<rect x="4" y="8" width="9" height="6" fill="#000080"/>
		<rect x="18" y="13" width="11" height="9" fill="#c0c0c0" stroke="#000"/>
		<rect x="19" y="14" width="9" height="6" fill="#000080"/>
		<line x1="14" y1="11" x2="18" y2="15" stroke="#000" stroke-width="1.5"/>
		<line x1="8" y1="16" x2="8" y2="22" stroke="#000" stroke-width="1"/>
		<line x1="24" y1="22" x2="24" y2="27" stroke="#000" stroke-width="1"/>
		<rect x="5" y="22" width="7" height="2" fill="#808080"/>
		<rect x="21" y="27" width="7" height="2" fill="#808080"/>
		<circle cx="16" cy="18" r="2" fill="#00aa00"/>
	</svg>`),

	readme: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">
		<rect x="7" y="3" width="18" height="26" fill="#fff" stroke="#000"/>
		<rect x="9" y="7" width="14" height="1" fill="#000"/>
		<rect x="9" y="10" width="14" height="1" fill="#000"/>
		<rect x="9" y="13" width="10" height="1" fill="#000"/>
		<rect x="9" y="16" width="12" height="1" fill="#000"/>
		<rect x="9" y="22" width="14" height="5" fill="#ffffe1" stroke="#808080"/>
		<text x="16" y="26" text-anchor="middle" fill="#cc0000" font-size="5" font-family="Arial" font-weight="bold">TXT</text>
	</svg>`),

	programs: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" shape-rendering="crispEdges">
		<path d="M1 3h6v2H3v7H1z" fill="#ffff00" stroke="#000"/>
		<rect x="8" y="2" width="6" height="10" fill="#000080" stroke="#000"/>
		<rect x="9" y="3" width="4" height="8" fill="#1084d0"/>
		<rect x="10" y="5" width="2" height="3" fill="#c0c0c0"/>
	</svg>`),

	settings: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" shape-rendering="crispEdges">
		<rect x="2" y="2" width="12" height="12" fill="#c0c0c0" stroke="#000"/>
		<circle cx="8" cy="8" r="4" fill="none" stroke="#000" stroke-width="1.5"/>
		<circle cx="8" cy="8" r="1.5" fill="#000"/>
		<line x1="8" y1="3" x2="8" y2="6" stroke="#000" stroke-width="1.5"/>
		<line x1="8" y1="10" x2="8" y2="13" stroke="#000" stroke-width="1.5"/>
		<line x1="3" y1="8" x2="6" y2="8" stroke="#000" stroke-width="1.5"/>
		<line x1="10" y1="8" x2="13" y2="8" stroke="#000" stroke-width="1.5"/>
	</svg>`),

	find: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" shape-rendering="crispEdges">
		<circle cx="7" cy="7" r="4.5" fill="#ffffe1" stroke="#000" stroke-width="1.5"/>
		<line x1="10" y1="10" x2="14" y2="14" stroke="#000" stroke-width="2" stroke-linecap="round"/>
		<circle cx="7" cy="7" r="2.5" fill="none" stroke="#808080" stroke-width="0.5"/>
	</svg>`),

	help: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" shape-rendering="crispEdges">
		<circle cx="8" cy="8" r="6" fill="#ffffe1" stroke="#000" stroke-width="1"/>
		<text x="8" y="11" text-anchor="middle" fill="#000080" font-size="9" font-family="Arial" font-weight="bold">?</text>
	</svg>`),

	run: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" shape-rendering="crispEdges">
		<rect x="1" y="2" width="14" height="12" fill="#c0c0c0" stroke="#000"/>
		<path d="M3 11 L3 4 L10 7.5 Z" fill="#000080"/>
		<line x1="11" y1="5" x2="13" y2="5" stroke="#000" stroke-width="0.5"/>
		<line x1="11" y1="7" x2="13" y2="7" stroke="#000" stroke-width="0.5"/>
	</svg>`),

	shutdown: enc(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" shape-rendering="crispEdges">
		<rect x="3" y="2" width="10" height="7" fill="#c0c0c0" stroke="#000"/>
		<rect x="5" y="4" width="6" height="4" fill="#ffffe1"/>
		<line x1="5" y1="12" x2="11" y2="12" stroke="#cc0000" stroke-width="2"/>
		<line x1="8" y1="10" x2="8" y2="14" stroke="#cc0000" stroke-width="1.5"/>
	</svg>`)
};

export function iconfor(id: string): string {
	return desktopicons[id] ?? desktopicons.readme;
}
