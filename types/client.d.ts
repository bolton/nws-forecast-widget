export declare const API_BASE: 'https://api.weather.gov';

export type NwsErrorCode =
	| 'INVALID_COORDINATES'
	| 'INVALID_UNITS'
	| 'OUT_OF_COVERAGE'
	| 'NO_FORECAST'
	| 'NOT_FOUND'
	| 'NETWORK'
	| 'NO_FETCH'
	| 'HTTP';

export declare class NwsError extends Error {
	name: 'NwsError';
	code: NwsErrorCode;
	status?: number;
	url?: string;
}

export type CacheStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface ClientOptions {
	/** "us" (°F, mph) or "si" (°C, km/h). Default "us". */
	units?: 'us' | 'si';
	/** Fetch the hourly forecast instead of day and night periods. */
	hourly?: boolean;
	/** Contact info for the User-Agent NWS asks for. Only sent outside the browser. */
	contact?: string;
	/** Defaults to localStorage, or memory when that is unavailable. `false` disables caching. */
	cache?: CacheStorage | false;
	fetch?: typeof fetch;
	signal?: AbortSignal;
	/** Retries for network errors, 429 and 5xx. Default 2. */
	retries?: number;
	/** Base backoff in ms, doubled each retry. Default 500. */
	retryDelay?: number;
}

export interface NwsPoint {
	gridId: string;
	gridX: number;
	gridY: number;
	forecast: string | null;
	forecastHourly: string | null;
	timeZone: string | null;
	city: string | null;
	state: string | null;
}

export interface ForecastPeriod {
	name: string;
	startTime: string;
	endTime: string;
	isDaytime: boolean;
	temperature: number;
	temperatureUnit: 'F' | 'C';
	precipitationChance: number | null;
	windSpeed: string | null;
	windDirection: string | null;
	icon: string | null;
	shortForecast: string;
	detailedForecast: string;
}

export interface Forecast {
	location: {
		lat: number;
		lng: number;
		city: string | null;
		state: string | null;
		timeZone: string | null;
		gridId: string;
		gridX: number;
		gridY: number;
	};
	units: 'us' | 'si';
	hourly: boolean;
	updated: string | null;
	periods: ForecastPeriod[];
}

export declare function formatCoordinate(value: number | string, axis: 'lat' | 'lng'): string;
export declare function createMemoryStorage(): CacheStorage;
export declare function getPoint(
	lat: number | string,
	lng: number | string,
	options?: ClientOptions
): Promise<NwsPoint>;
export declare function getForecast(
	lat: number | string,
	lng: number | string,
	options?: ClientOptions
): Promise<Forecast>;
