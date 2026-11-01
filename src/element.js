import { getForecast } from './client.js';
import { renderForecast, renderLoading, renderMessage, styles } from './template.js';

const REFRESH_MS = 30 * 60 * 1000;

// Importing this module in Node (for the client exports) must not throw.
const Base = globalThis.HTMLElement ?? class {};

/**
 * <nws-forecast lat="47.6062" lng="-122.3321"></nws-forecast>
 *
 * Attributes: lat, lng (required), days, units ("us" | "si"), heading,
 * no-attribution. Fires `nws-forecast-load` and `nws-forecast-error`.
 */
export class NwsForecastElement extends Base {
	static observedAttributes = ['lat', 'lng', 'days', 'units', 'heading', 'no-attribution'];

	/** @type {import('../types/client').Forecast | null} */
	forecast = null;

	#root;
	#controller = null;
	#timer = null;
	#pending = false;

	constructor() {
		super();
		this.#root = this.attachShadow({ mode: 'open' });
		this.#root.innerHTML = `<style>${styles}</style><div part="root"></div>`;
	}

	connectedCallback() {
		this.#schedule();
		this.#timer = setInterval(() => this.refresh(), REFRESH_MS);
	}

	disconnectedCallback() {
		clearInterval(this.#timer);
		this.#controller?.abort();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue || !this.isConnected) return;
		// Re-render from data already loaded when only presentation changed.
		if (this.forecast && ['days', 'heading', 'no-attribution'].includes(name)) {
			this.#show(this.#renderLoaded(this.forecast));
			return;
		}
		this.#schedule();
	}

	// Batch several attribute changes made in the same task into one fetch.
	#schedule() {
		if (this.#pending) return;
		this.#pending = true;
		queueMicrotask(() => {
			this.#pending = false;
			this.refresh();
		});
	}

	#show(html) {
		this.#root.querySelector('[part="root"]').innerHTML = html;
	}

	#renderLoaded(forecast) {
		const days = Number.parseInt(this.getAttribute('days') ?? '', 10);
		return renderForecast(forecast, {
			days: Number.isFinite(days) && days > 0 ? days : 7,
			title: this.getAttribute('heading') ?? undefined,
			attribution: !this.hasAttribute('no-attribution')
		});
	}

	/** Fetch the forecast again (the cache still applies). */
	async refresh() {
		const lat = this.getAttribute('lat');
		const lng = this.getAttribute('lng');
		if (lat == null || lng == null) {
			this.#show(renderMessage('Add lat and lng attributes to show a forecast.'));
			return;
		}

		this.#controller?.abort();
		const controller = new AbortController();
		this.#controller = controller;
		if (!this.forecast) this.#show(renderLoading());

		try {
			const forecast = await getForecast(lat, lng, {
				units: this.getAttribute('units') === 'si' ? 'si' : 'us',
				signal: controller.signal
			});
			if (controller.signal.aborted) return;
			this.forecast = forecast;
			this.#show(this.#renderLoaded(forecast));
			this.dispatchEvent(new CustomEvent('nws-forecast-load', { detail: forecast }));
		} catch (error) {
			if (controller.signal.aborted) return;
			this.forecast = null;
			this.#show(
				renderMessage(error?.message || 'The forecast could not be loaded.', { error: true })
			);
			this.dispatchEvent(new CustomEvent('nws-forecast-error', { detail: error }));
		}
	}
}

/**
 * Register the element. Safe to call more than once.
 *
 * @param {string} [tagName]
 */
export function defineNwsForecast(tagName = 'nws-forecast') {
	if (typeof customElements === 'undefined' || customElements.get(tagName)) return;
	// A fresh subclass per tag, because one constructor cannot back two names.
	customElements.define(tagName, class extends NwsForecastElement {});
}
