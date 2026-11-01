import { summarizeDays } from './summarize.js';

const ATTRIBUTION_URL = 'https://beexploring.com/';
// Single-digit chances are noise next to the summary text.
const MIN_PRECIP_SHOWN = 10;

export const styles = `
:host {
	--_bg: var(--nws-bg, Canvas);
	--_fg: var(--nws-fg, CanvasText);
	--_muted: var(--nws-muted, color-mix(in srgb, var(--_fg) 62%, transparent));
	--_border: var(--nws-border, color-mix(in srgb, var(--_fg) 14%, transparent));
	--_accent: var(--nws-accent, #2563eb);
	--_radius: var(--nws-radius, 12px);
	--_gap: var(--nws-gap, 8px);
	display: block;
	container-type: inline-size;
	font-family: var(--nws-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
	color: var(--_fg);
}
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
.card {
	background: var(--_bg);
	border: 1px solid var(--_border);
	border-radius: var(--_radius);
	padding: 14px;
}
header {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	justify-content: space-between;
	gap: 4px 12px;
	margin-bottom: 12px;
}
h2 { font-size: 1rem; font-weight: 600; margin: 0; }
.updated { font-size: 0.75rem; color: var(--_muted); }
ol {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
	gap: var(--_gap);
}
li {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 4px;
	padding: 10px 6px;
	border: 1px solid var(--_border);
	border-radius: calc(var(--_radius) - 4px);
	min-width: 0;
}
.name {
	font-size: 0.8rem;
	font-weight: 600;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
img { width: 48px; height: 48px; border-radius: 8px; }
.temps { font-size: 0.95rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.high { font-weight: 700; }
.low { color: var(--_muted); }
.short {
	font-size: 0.72rem;
	color: var(--_muted);
	line-height: 1.25;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
.pop { font-size: 0.72rem; font-weight: 600; color: var(--_accent); min-height: 1em; }
footer {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: 4px 12px;
	margin-top: 12px;
	font-size: 0.7rem;
	color: var(--_muted);
}
footer a { color: inherit; }
.message { font-size: 0.875rem; color: var(--_muted); margin: 0; }
.message.error { color: var(--nws-error, #b91c1c); }
.skeleton {
	height: 150px;
	border-radius: calc(var(--_radius) - 4px);
	background: linear-gradient(90deg, var(--_border), transparent, var(--_border));
	background-size: 200% 100%;
	animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
@container (max-width: 360px) {
	ol { grid-template-columns: 1fr; }
	li {
		display: grid;
		grid-template-columns: 5.5em 36px auto minmax(0, 1fr);
		grid-template-areas: 'name icon temps short' 'name icon temps pop';
		align-items: center;
		column-gap: 10px;
		row-gap: 0;
		text-align: left;
		padding: 8px 10px;
	}
	.name { grid-area: name; }
	img { grid-area: icon; width: 36px; height: 36px; }
	.temps { grid-area: temps; }
	.short { grid-area: short; }
	.pop { grid-area: pop; min-height: 0; }
}
`;

/** @param {unknown} value */
export function escapeHtml(value) {
	return String(value ?? '').replace(
		/[&<>"']/g,
		(ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
	);
}

function formatUpdated(iso, timeZone) {
	if (!iso) return '';
	try {
		return new Intl.DateTimeFormat(undefined, {
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short',
			...(timeZone ? { timeZone } : {})
		}).format(new Date(iso));
	} catch {
		return '';
	}
}

function temp(value, cls) {
	return value == null ? '' : `<span class="${cls}">${escapeHtml(value)}°</span>`;
}

/**
 * @param {import('../types/client').Forecast} forecast
 * @param {{ days?: number, attribution?: boolean, title?: string }} [options]
 */
export function renderForecast(forecast, options = {}) {
	const { location } = forecast;
	const days = summarizeDays(forecast.periods, options.days ?? 7);
	const place = [location.city, location.state].filter(Boolean).join(', ');
	const title = options.title ?? (place ? `Forecast near ${place}` : 'Forecast');
	const updated = formatUpdated(forecast.updated, location.timeZone);
	const nwsUrl = `https://forecast.weather.gov/MapClick.php?lat=${location.lat}&lon=${location.lng}`;

	const items = days
		.map((d) => {
			const low = d.low != null && d.high != null ? `<span class="low"> / </span>` : '';
			return `<li part="day" title="${escapeHtml(d.detailedForecast)}">
	<span class="name" part="day-name">${escapeHtml(d.name)}</span>
	${d.icon ? `<img part="icon" src="${escapeHtml(d.icon)}" alt="" loading="lazy" decoding="async">` : ''}
	<span class="temps" part="temps">${temp(d.high, 'high')}${low}${temp(d.low, 'low')}</span>
	<span class="pop" part="precip">${d.precipitationChance >= MIN_PRECIP_SHOWN ? `${escapeHtml(d.precipitationChance)}% precip` : ''}</span>
	<span class="short" part="summary">${escapeHtml(d.shortForecast)}</span>
</li>`;
		})
		.join('');

	return `<section class="card" part="card" aria-label="${escapeHtml(title)}">
	<header part="header">
		<h2 part="title">${escapeHtml(title)}</h2>
		${updated ? `<span class="updated" part="updated">Updated ${escapeHtml(updated)}</span>` : ''}
	</header>
	<ol part="days">${items}</ol>
	<footer part="footer">
		<a href="${escapeHtml(nwsUrl)}" target="_blank" rel="noopener">Data: National Weather Service</a>
		${options.attribution === false ? '' : `<a href="${ATTRIBUTION_URL}" target="_blank" rel="noopener">Widget by beexploring.com</a>`}
	</footer>
</section>`;
}

export function renderLoading() {
	return `<section class="card" part="card" aria-busy="true"><div class="skeleton"></div></section>`;
}

/** @param {string} message @param {{ error?: boolean }} [options] */
export function renderMessage(message, options = {}) {
	return `<section class="card" part="card"><p class="message${options.error ? ' error' : ''}" role="${options.error ? 'alert' : 'status'}">${escapeHtml(message)}</p></section>`;
}
