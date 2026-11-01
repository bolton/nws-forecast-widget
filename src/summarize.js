/**
 * NWS returns alternating day and night periods ("Monday", "Monday Night").
 * Pair them into one entry per day with a high and a low. The first period
 * can be a night ("Tonight") when the forecast is fetched in the evening; it
 * becomes a day with only a low.
 *
 * @param {import('../types/client').ForecastPeriod[]} periods
 * @param {number} [count]
 * @returns {import('../types/index').ForecastDay[]}
 */
export function summarizeDays(periods, count = 7) {
	const days = [];
	for (let i = 0; i < periods.length && days.length < count; i++) {
		const period = periods[i];
		const next = periods[i + 1];
		const night = period.isDaytime ? (next && !next.isDaytime ? next : null) : period;
		const day = period.isDaytime ? period : null;
		const lead = day ?? night;

		days.push({
			name: lead.name,
			startTime: lead.startTime,
			high: day ? day.temperature : null,
			low: night ? night.temperature : null,
			temperatureUnit: lead.temperatureUnit,
			precipitationChance: maxOrNull(day?.precipitationChance, night?.precipitationChance),
			icon: lead.icon,
			shortForecast: lead.shortForecast,
			detailedForecast: [day?.detailedForecast, night?.detailedForecast].filter(Boolean).join(' '),
			day,
			night
		});
		if (day && night) i++;
	}
	return days;
}

function maxOrNull(a, b) {
	const values = [a, b].filter((v) => typeof v === 'number');
	return values.length ? Math.max(...values) : null;
}
