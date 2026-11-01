/**
 * A small client for the National Weather Service API (api.weather.gov).
 *
 * Getting a forecast takes two requests: /points/{lat},{lng} resolves the
 * coordinates to a forecast office grid, and that response names the forecast
 * URL to fetch. The grid lookup almost never changes, so it is cached far
 * longer than the forecast itself.
 *
 * No API key is needed. NWS asks callers to send a User-Agent that identifies
 * the app; browsers do not allow scripts to set that header, so `contact` is
 * only sent outside the browser.
 */

export const API_BASE = 'https://api.weather.gov';

const POINT_TTL = 7 * 24 * 60 * 60 * 1000;
const FORECAST_TTL = 30 * 60 * 1000;
const CACHE_PREFIX = 'nws-forecast-widget:';
const DEFAULT_USER_AGENT = 'nws-forecast-widget';

export class NwsError extends Error {
	/**
	 * @param {string} message
	 * @param {{ code?: string, status?: number, url?: string, cause?: unknown }} [details]
	 */
	constructor(message, details = {}) {
		super(message, { cause: details.cause });
		this.name = 'NwsError';
		this.code = details.code ?? 'HTTP';
		this.status = details.status;
		this.url = details.url;
	}
}

/**
 * NWS rejects coordinates with more than four decimal places, and redirects
 * trailing zeros (47.6000 -> 47.6), so normalise before building the URL.
 *
 * @param {number|string} value
 * @param {'lat'|'lng'} axis
 * @returns {string}
 */
export function formatCoordinate(value, axis) {
	const limit = axis === 'lat' ? 90 : 180;
	const n = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
	if (!Number.isFinite(n) || Math.abs(n) > limit) {
		throw new NwsError(`Invalid ${axis === 'lat' ? 'latitude' : 'longitude'}: ${value}`, {
			code: 'INVALID_COORDINATES'
		});
	}
	return String(Number(n.toFixed(4)));
}

/**
 * A Web Storage compatible store that lives only as long as the page.
 *
 * @returns {Pick<Storage, 'getItem'|'setItem'|'removeItem'>}
 */
export function createMemoryStorage() {
	const map = new Map();
	return {
		getItem: (key) => (map.has(key) ? map.get(key) : null),
		setItem: (key, value) => void map.set(key, String(value)),
		removeItem: (key) => void map.delete(key)
	};
}

// Shared by every widget on the page when localStorage is unavailable.
const memoryStorage = createMemoryStorage();

function defaultStorage() {
	try {
		// Only touch localStorage in a page; Node 25+ warns on merely reading it.
		const storage = typeof window === 'undefined' ? null : window.localStorage;
		if (storage) {
			const probe = CACHE_PREFIX + 'probe';
			storage.setItem(probe, '1');
			storage.removeItem(probe);
			return storage;
		}
	} catch {
		// Private mode, blocked site data, or no DOM at all.
	}
	return memoryStorage;
}

function createCache(option) {
	if (option === false) {
		return { get: () => null, set: () => {}, delete: () => {} };
	}
	const storage = option ?? defaultStorage();
	return {
		get(key) {
			try {
				const raw = storage.getItem(CACHE_PREFIX + key);
				if (!raw) return null;
				const entry = JSON.parse(raw);
				if (entry.expires > Date.now()) return entry.data;
				storage.removeItem(CACHE_PREFIX + key);
			} catch {
				// A corrupt or unreadable entry is just a cache miss.
			}
			return null;
		},
		set(key, data, ttl) {
			try {
				storage.setItem(CACHE_PREFIX + key, JSON.stringify({ expires: Date.now() + ttl, data }));
			} catch {
				// Quota exceeded or storage blocked: carry on uncached.
			}
		},
		delete(key) {
			try {
				storage.removeItem(CACHE_PREFIX + key);
			} catch {
				// Nothing to do.
			}
		}
	};
}

function delay(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(signal.reason);
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(timer);
				reject(signal.reason);
			},
			{ once: true }
		);
	});
}

function createContext(options) {
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new NwsError('No fetch implementation available; pass one as options.fetch', {
			code: 'NO_FETCH'
		});
	}
	/** @type {Record<string, string>} */
	const headers = { Accept: 'application/geo+json' };
	if (typeof document === 'undefined') {
		headers['User-Agent'] = options.contact
			? `${DEFAULT_USER_AGENT} (${options.contact})`
			: DEFAULT_USER_AGENT;
	}
	return {
		fetchImpl,
		headers,
		signal: options.signal,
		retries: options.retries ?? 2,
		retryDelay: options.retryDelay ?? 500,
		cache: createCache(options.cache)
	};
}

async function fetchJson(url, ctx) {
	for (let attempt = 0; ; attempt++) {
		let response;
		try {
			response = await ctx.fetchImpl(url, { headers: ctx.headers, signal: ctx.signal });
		} catch (err) {
			if (ctx.signal?.aborted) throw err;
			if (attempt >= ctx.retries) {
				throw new NwsError(`Could not reach the National Weather Service`, {
					code: 'NETWORK',
					url,
					cause: err
				});
			}
			await delay(ctx.retryDelay * 2 ** attempt, ctx.signal);
			continue;
		}

		if (response.ok) return response.json();

		// api.weather.gov returns intermittent 500s and 503s that clear on retry.
		const retryable = response.status >= 500 || response.status === 429;
		if (retryable && attempt < ctx.retries) {
			await delay(ctx.retryDelay * 2 ** attempt, ctx.signal);
			continue;
		}

		let detail = '';
		try {
			detail = (await response.json())?.detail ?? '';
		} catch {
			// Error bodies are usually problem+json, but not always.
		}
		throw new NwsError(detail || `The National Weather Service returned ${response.status}`, {
			code: response.status === 404 ? 'NOT_FOUND' : 'HTTP',
			status: response.status,
			url
		});
	}
}

/**
 * @typedef {object} NwsPoint
 * @property {string} gridId
 * @property {number} gridX
 * @property {number} gridY
 * @property {string|null} forecast
 * @property {string|null} forecastHourly
 * @property {string|null} timeZone
 * @property {string|null} city
 * @property {string|null} state
 */

/**
 * @param {number|string} lat
 * @param {number|string} lng
 * @param {object} [options] see ClientOptions in types/client.d.ts
 * @returns {Promise<NwsPoint>}
 */
export async function getPoint(lat, lng, options = {}) {
	return pointFor(
		`${formatCoordinate(lat, 'lat')},${formatCoordinate(lng, 'lng')}`,
		createContext(options)
	);
}

async function pointFor(key, ctx) {
	const cached = ctx.cache.get('point:' + key);
	if (cached) return cached;

	let json;
	try {
		json = await fetchJson(`${API_BASE}/points/${key}`, ctx);
	} catch (err) {
		if (err instanceof NwsError && err.status === 404) {
			err.code = 'OUT_OF_COVERAGE';
			err.message =
				'This location is outside National Weather Service coverage. Forecasts are available for the United States and its territories.';
		}
		throw err;
	}

	const p = json.properties;
	const place = p.relativeLocation?.properties;
	/** @type {NwsPoint} */
	const point = {
		gridId: p.gridId,
		gridX: p.gridX,
		gridY: p.gridY,
		forecast: p.forecast ?? null,
		forecastHourly: p.forecastHourly ?? null,
		timeZone: p.timeZone ?? null,
		city: place?.city ?? null,
		state: place?.state ?? null
	};
	ctx.cache.set('point:' + key, point, POINT_TTL);
	return point;
}

function normalizePeriod(period) {
	return {
		name: period.name,
		startTime: period.startTime,
		endTime: period.endTime,
		isDaytime: period.isDaytime,
		temperature: period.temperature,
		temperatureUnit: period.temperatureUnit,
		precipitationChance: period.probabilityOfPrecipitation?.value ?? null,
		windSpeed: period.windSpeed ?? null,
		windDirection: period.windDirection ?? null,
		icon: period.icon ?? null,
		shortForecast: period.shortForecast ?? '',
		detailedForecast: period.detailedForecast ?? ''
	};
}

/**
 * Fetch the forecast for a latitude and longitude.
 *
 * @param {number|string} lat
 * @param {number|string} lng
 * @param {object} [options] see ClientOptions in types/client.d.ts
 */
export async function getForecast(lat, lng, options = {}) {
	const units = options.units ?? 'us';
	if (units !== 'us' && units !== 'si') {
		throw new NwsError(`Invalid units "${units}"; use "us" or "si"`, { code: 'INVALID_UNITS' });
	}
	const key = `${formatCoordinate(lat, 'lat')},${formatCoordinate(lng, 'lng')}`;
	const ctx = createContext(options);
	const hourly = Boolean(options.hourly);
	const forecastKey = `forecast:${key}:${hourly ? 'hourly' : 'daily'}:${units}`;

	const cached = ctx.cache.get(forecastKey);
	if (cached) return cached;

	let point = await pointFor(key, ctx);
	let json;
	try {
		json = await fetchForecastJson(point, hourly, units, ctx);
	} catch (err) {
		// A cached grid can go stale when NWS redraws office boundaries.
		if (!(err instanceof NwsError) || err.status !== 404) throw err;
		ctx.cache.delete('point:' + key);
		point = await pointFor(key, ctx);
		json = await fetchForecastJson(point, hourly, units, ctx);
	}

	const p = json.properties;
	const forecast = {
		location: {
			lat: Number(key.split(',')[0]),
			lng: Number(key.split(',')[1]),
			city: point.city,
			state: point.state,
			timeZone: point.timeZone,
			gridId: point.gridId,
			gridX: point.gridX,
			gridY: point.gridY
		},
		units,
		hourly,
		updated: p.updateTime ?? p.generatedAt ?? null,
		periods: (p.periods ?? []).map(normalizePeriod)
	};
	ctx.cache.set(forecastKey, forecast, FORECAST_TTL);
	return forecast;
}

function fetchForecastJson(point, hourly, units, ctx) {
	const url = hourly ? point.forecastHourly : point.forecast;
	if (!url) {
		throw new NwsError('The National Weather Service has no forecast for this location.', {
			code: 'NO_FORECAST'
		});
	}
	return fetchJson(`${url}?units=${units}`, ctx);
}
