import type { Forecast, ForecastPeriod } from './client';

export * from './client';

export interface ForecastDay {
	name: string;
	startTime: string;
	high: number | null;
	low: number | null;
	temperatureUnit: 'F' | 'C';
	precipitationChance: number | null;
	icon: string | null;
	shortForecast: string;
	detailedForecast: string;
	day: ForecastPeriod | null;
	night: ForecastPeriod | null;
}

export declare function summarizeDays(periods: ForecastPeriod[], count?: number): ForecastDay[];

export declare function renderForecast(
	forecast: Forecast,
	options?: { days?: number; attribution?: boolean; title?: string }
): string;

export declare class NwsForecastElement extends HTMLElement {
	static observedAttributes: string[];
	forecast: Forecast | null;
	refresh(): Promise<void>;
}

export declare function defineNwsForecast(tagName?: string): void;

declare global {
	interface HTMLElementTagNameMap {
		'nws-forecast': NwsForecastElement;
	}
	interface HTMLElementEventMap {
		'nws-forecast-load': CustomEvent<Forecast>;
		'nws-forecast-error': CustomEvent<Error>;
	}
}
