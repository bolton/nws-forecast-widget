import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NwsError, createMemoryStorage, formatCoordinate, getForecast } from '../src/client.js';

const POINT = {
	properties: {
		gridId: 'SEW',
		gridX: 125,
		gridY: 68,
		forecast: 'https://api.weather.gov/gridpoints/SEW/125,68/forecast',
		forecastHourly: 'https://api.weather.gov/gridpoints/SEW/125,68/forecast/hourly',
		timeZone: 'America/Los_Angeles',
		relativeLocation: { properties: { city: 'Seattle', state: 'WA' } }
	}
};

const FORECAST = {
	properties: {
		updateTime: '2026-11-01T15:00:00+00:00',
		periods: [
			{
				name: 'Today',
				startTime: '2026-11-01T08:00:00-07:00',
				endTime: '2026-11-01T18:00:00-07:00',
				isDaytime: true,
				temperature: 54,
				temperatureUnit: 'F',
				probabilityOfPrecipitation: { value: 40 },
				windSpeed: '5 mph',
				windDirection: 'S',
				icon: 'https://api.weather.gov/icons/land/day/rain,40',
				shortForecast: 'Chance Rain',
				detailedForecast: 'A chance of rain.'
			}
		]
	}
};

function json(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/geo+json' }
	});
}

/** A fetch that answers from a list of handlers, recording every URL. */
function mockFetch(...responses) {
	const calls = [];
	const fetch = async (url) => {
		calls.push(String(url));
		const next = responses.shift();
		if (!next) throw new Error(`Unexpected request: ${url}`);
		return typeof next === 'function' ? next(url) : next;
	};
	return { fetch, calls };
}

const opts = (fetch) => ({ fetch, cache: createMemoryStorage(), retryDelay: 0 });

test('formatCoordinate rounds to four places and drops trailing zeros', () => {
	assert.equal(formatCoordinate(47.6, 'lat'), '47.6');
	assert.equal(formatCoordinate('47.60000', 'lat'), '47.6');
	assert.equal(formatCoordinate(-122.332149, 'lng'), '-122.3321');
	assert.equal(formatCoordinate(0, 'lng'), '0');
});

test('formatCoordinate rejects bad input', () => {
	for (const [value, axis] of [
		['', 'lat'],
		['abc', 'lat'],
		[91, 'lat'],
		[-181, 'lng'],
		[NaN, 'lng']
	]) {
		assert.throws(() => formatCoordinate(value, axis), { code: 'INVALID_COORDINATES' });
	}
});

test('getForecast resolves the grid, then fetches and normalises the forecast', async () => {
	const { fetch, calls } = mockFetch(json(POINT), json(FORECAST));
	const forecast = await getForecast('47.60620', -122.3321, opts(fetch));

	assert.deepEqual(calls, [
		'https://api.weather.gov/points/47.6062,-122.3321',
		'https://api.weather.gov/gridpoints/SEW/125,68/forecast?units=us'
	]);
	assert.equal(forecast.location.city, 'Seattle');
	assert.equal(forecast.location.lat, 47.6062);
	assert.equal(forecast.updated, '2026-11-01T15:00:00+00:00');
	assert.equal(forecast.periods[0].precipitationChance, 40);
	assert.equal(forecast.periods[0].shortForecast, 'Chance Rain');
});

test('hourly and si select the hourly URL and metric units', async () => {
	const { fetch, calls } = mockFetch(json(POINT), json(FORECAST));
	await getForecast(47.6062, -122.3321, { ...opts(fetch), hourly: true, units: 'si' });
	assert.equal(calls[1], 'https://api.weather.gov/gridpoints/SEW/125,68/forecast/hourly?units=si');
});

test('a second call is served from the cache', async () => {
	const { fetch, calls } = mockFetch(json(POINT), json(FORECAST));
	const cache = createMemoryStorage();
	await getForecast(47.6062, -122.3321, { fetch, cache });
	await getForecast(47.6062, -122.3321, { fetch, cache });
	assert.equal(calls.length, 2);
});

test('the grid stays cached when only the units change', async () => {
	const { fetch, calls } = mockFetch(json(POINT), json(FORECAST), json(FORECAST));
	const cache = createMemoryStorage();
	await getForecast(47.6062, -122.3321, { fetch, cache });
	await getForecast(47.6062, -122.3321, { fetch, cache, units: 'si' });
	assert.equal(calls.filter((url) => url.includes('/points/')).length, 1);
});

test('transient 503s are retried', async () => {
	const { fetch, calls } = mockFetch(json({}, 503), json(POINT), json({}, 500), json(FORECAST));
	const forecast = await getForecast(47.6062, -122.3321, opts(fetch));
	assert.equal(calls.length, 4);
	assert.equal(forecast.periods.length, 1);
});

test('retries give up and surface the NWS detail', async () => {
	const { fetch } = mockFetch(
		json({ detail: 'Busy' }, 503),
		json({ detail: 'Busy' }, 503),
		json({ detail: 'Busy' }, 503)
	);
	await assert.rejects(getForecast(47.6062, -122.3321, opts(fetch)), (err) => {
		assert.ok(err instanceof NwsError);
		assert.equal(err.status, 503);
		assert.equal(err.message, 'Busy');
		return true;
	});
});

test('a 404 from /points means the location is outside coverage', async () => {
	const { fetch } = mockFetch(json({ detail: 'Unable to provide data for requested point' }, 404));
	await assert.rejects(getForecast(51.5072, -0.1276, opts(fetch)), { code: 'OUT_OF_COVERAGE' });
});

test('a stale cached grid is looked up again', async () => {
	const cache = createMemoryStorage();
	const first = mockFetch(json(POINT), json(FORECAST));
	await getForecast(47.6062, -122.3321, { fetch: first.fetch, cache, hourly: true });

	const moved = structuredClone(POINT);
	moved.properties.forecast = 'https://api.weather.gov/gridpoints/SEW/126,68/forecast';
	const second = mockFetch(json({ detail: 'Not found' }, 404), json(moved), json(FORECAST));
	const forecast = await getForecast(47.6062, -122.3321, { fetch: second.fetch, cache });

	assert.deepEqual(second.calls, [
		'https://api.weather.gov/gridpoints/SEW/125,68/forecast?units=us',
		'https://api.weather.gov/points/47.6062,-122.3321',
		'https://api.weather.gov/gridpoints/SEW/126,68/forecast?units=us'
	]);
	assert.equal(forecast.periods.length, 1);
});

test('a point without a forecast URL reports NO_FORECAST', async () => {
	const marine = structuredClone(POINT);
	marine.properties.forecast = null;
	const { fetch } = mockFetch(json(marine));
	await assert.rejects(getForecast(47.6062, -122.3321, opts(fetch)), { code: 'NO_FORECAST' });
});

test('network failures become NETWORK errors after retries', async () => {
	const fail = () => {
		throw new TypeError('fetch failed');
	};
	const { fetch } = mockFetch(fail, fail, fail);
	await assert.rejects(getForecast(47.6062, -122.3321, opts(fetch)), { code: 'NETWORK' });
});

test('outside the browser, contact is sent in the User-Agent', async () => {
	let headers;
	const fetch = async (url, init) => {
		headers = init.headers;
		return json(String(url).includes('/points/') ? POINT : FORECAST);
	};
	await getForecast(47.6062, -122.3321, { ...opts(fetch), contact: 'me@example.com' });
	assert.equal(headers['User-Agent'], 'nws-forecast-widget (me@example.com)');
});

test('invalid units are rejected before any request', async () => {
	const { fetch, calls } = mockFetch();
	await assert.rejects(getForecast(47.6, -122.3, { ...opts(fetch), units: 'metric' }), {
		code: 'INVALID_UNITS'
	});
	assert.equal(calls.length, 0);
});
