import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDays } from '../src/summarize.js';
import { escapeHtml, renderForecast } from '../src/template.js';

function period(name, isDaytime, temperature, extra = {}) {
	return {
		name,
		startTime: '2026-11-01T06:00:00-07:00',
		endTime: '2026-11-01T18:00:00-07:00',
		isDaytime,
		temperature,
		temperatureUnit: 'F',
		precipitationChance: null,
		windSpeed: '5 mph',
		windDirection: 'S',
		icon: `https://api.weather.gov/icons/land/${isDaytime ? 'day' : 'night'}/few`,
		shortForecast: `${name} sky`,
		detailedForecast: `${name} detail.`,
		...extra
	};
}

test('day and night periods pair into one day with a high and low', () => {
	const days = summarizeDays([
		period('Today', true, 55, { precipitationChance: 20 }),
		period('Tonight', false, 41, { precipitationChance: 60 }),
		period('Monday', true, 52),
		period('Monday Night', false, 40)
	]);
	assert.equal(days.length, 2);
	assert.deepEqual(
		days.map((d) => [d.name, d.high, d.low, d.precipitationChance]),
		[
			['Today', 55, 41, 60],
			['Monday', 52, 40, null]
		]
	);
	assert.equal(days[0].detailedForecast, 'Today detail. Tonight detail.');
});

test('an evening forecast starts with a night-only day', () => {
	const days = summarizeDays([
		period('Tonight', false, 41),
		period('Monday', true, 52),
		period('Monday Night', false, 40)
	]);
	assert.deepEqual(
		days.map((d) => [d.name, d.high, d.low]),
		[
			['Tonight', null, 41],
			['Monday', 52, 40]
		]
	);
});

test('a trailing day without its night keeps a null low', () => {
	const days = summarizeDays([period('Saturday', true, 60)]);
	assert.equal(days[0].low, null);
});

test('count limits the number of days', () => {
	const periods = [];
	for (let i = 0; i < 7; i++) periods.push(period(`D${i}`, true, 50), period(`N${i}`, false, 40));
	assert.equal(summarizeDays(periods, 3).length, 3);
});

const forecast = {
	location: {
		lat: 47.6062,
		lng: -122.3321,
		city: 'Seattle',
		state: 'WA',
		timeZone: 'America/Los_Angeles',
		gridId: 'SEW',
		gridX: 125,
		gridY: 68
	},
	units: 'us',
	hourly: false,
	updated: '2026-11-01T15:00:00+00:00',
	periods: [period('Today', true, 55), period('Tonight', false, 41)]
};

test('renderForecast shows the place, temperatures and both credits', () => {
	const html = renderForecast(forecast);
	assert.match(html, /Forecast near Seattle, WA/);
	assert.match(html, /55°/);
	assert.match(html, /41°/);
	assert.match(html, /forecast\.weather\.gov\/MapClick\.php\?lat=47\.6062&amp;lon=-122\.3321/);
	assert.match(html, /Widget by beexploring\.com/);
	assert.match(html, /href="https:\/\/beexploring\.com\/"/);
});

test('precipitation chances under 10% are hidden', () => {
	const wet = structuredClone(forecast);
	wet.periods[0].precipitationChance = 9;
	assert.doesNotMatch(renderForecast(wet), /precip</);
	wet.periods[0].precipitationChance = 10;
	assert.match(renderForecast(wet), /10% precip/);
});

test('attribution: false drops the widget credit but keeps the NWS one', () => {
	const html = renderForecast(forecast, { attribution: false });
	assert.doesNotMatch(html, /beexploring/);
	assert.match(html, /National Weather Service/);
});

test('text from the API is escaped', () => {
	const hostile = structuredClone(forecast);
	hostile.periods[0].shortForecast = '<img src=x onerror=alert(1)>';
	hostile.location.city = '"><script>';
	const html = renderForecast(hostile);
	assert.doesNotMatch(html, /<img src=x/);
	assert.doesNotMatch(html, /<script>/);
	assert.equal(escapeHtml(`a&b<"'>`), 'a&amp;b&lt;&quot;&#39;&gt;');
});

test('the index module imports cleanly outside the browser', async () => {
	const mod = await import('../src/index.js');
	assert.equal(typeof mod.getForecast, 'function');
	assert.equal(typeof mod.defineNwsForecast, 'function');
});
