# nws-forecast-widget

A National Weather Service forecast for any US latitude and longitude, as a dependency-free web
component. No API key, no build step, no framework.

[![npm](https://img.shields.io/npm/v/nws-forecast-widget)](https://www.npmjs.com/package/nws-forecast-widget)
[![license](https://img.shields.io/npm/l/nws-forecast-widget)](LICENSE)

**[Live demo](https://bolton.github.io/nws-forecast-widget/demo/)**

```html
<script
	type="module"
	src="https://cdn.jsdelivr.net/npm/nws-forecast-widget@0.1.0/src/index.js"
></script>

<nws-forecast lat="47.6062" lng="-122.3321" days="5"></nws-forecast>
```

Data comes straight from [api.weather.gov](https://www.weather.gov/documentation/services-web-api),
the free public API run by the National Weather Service. It covers the United States and its
territories.

## Install

```bash
npm install nws-forecast-widget
```

```js
import 'nws-forecast-widget'; // registers <nws-forecast>
```

## Attributes

| Attribute        | Default           | Description                                              |
| ---------------- | ----------------- | -------------------------------------------------------- |
| `lat`            | required          | Latitude, decimal degrees                                |
| `lng`            | required          | Longitude, decimal degrees                               |
| `days`           | `7`               | How many days to show (NWS provides up to 7)             |
| `units`          | `us`              | `us` for °F and mph, `si` for °C and km/h                |
| `heading`        | `Forecast near …` | Replaces the heading, which defaults to the nearest town |
| `no-attribution` | off               | Hides the "Widget by beexploring.com" link               |

Changing an attribute updates the widget. The NWS data credit always stays.

## Styling

The widget renders in Shadow DOM, so page styles cannot break it. Theme it with custom properties:

```css
nws-forecast {
	--nws-bg: #0f172a;
	--nws-fg: #e2e8f0;
	--nws-muted: #94a3b8;
	--nws-border: #1e293b;
	--nws-accent: #38bdf8; /* precipitation chance */
	--nws-error: #f87171;
	--nws-radius: 4px;
	--nws-gap: 8px;
	--nws-font: Georgia, serif;
}
```

The defaults use the `Canvas` and `CanvasText` system colours, so the widget follows the page's
`color-scheme` in light and dark mode. For deeper changes, every piece is exposed as a CSS part:
`card`, `header`, `title`, `updated`, `days`, `day`, `day-name`, `icon`, `temps`, `precip`,
`summary`, `footer`.

```css
nws-forecast::part(day) {
	border: none;
}
```

Below 360px of width the days switch to a stacked list.

## Events and methods

```js
const widget = document.querySelector('nws-forecast');
widget.addEventListener('nws-forecast-load', (e) => console.log(e.detail.periods));
widget.addEventListener('nws-forecast-error', (e) => console.warn(e.detail.code));
widget.refresh(); // fetch again; the cache still applies
```

The widget refreshes itself every 30 minutes while it is on the page.

## Using the data without the widget

The client works in browsers and in Node 18+ and has no DOM dependency:

```js
import { getForecast } from 'nws-forecast-widget/client';

const forecast = await getForecast(47.6062, -122.3321, {
	units: 'us',
	hourly: false,
	contact: 'you@example.com' // sent as the User-Agent outside the browser
});
```

`getForecast` returns `{ location, units, hourly, updated, periods }`. Errors are `NwsError`s with a
`code`: `INVALID_COORDINATES`, `OUT_OF_COVERAGE`, `NO_FORECAST`, `NETWORK` or `HTTP`.

`summarizeDays(periods, count)` pairs the day and night periods into one entry per day with a high
and a low, and `renderForecast(forecast, options)` returns the widget's HTML as a string.

## How it works

1. `GET /points/{lat},{lng}` resolves the location to a forecast office grid. It is cached for 7 days.
2. The forecast URL from that response is fetched and cached for 30 minutes.

The cache uses `localStorage` and falls back to memory, so several widgets on one page, and repeat
visits, don't hit NWS again. Pass `cache: false` to the client to turn it off. Transient 5xx and 429
responses are retried with backoff, and a stale grid is looked up again automatically.

## Notes

- **No API key.** NWS asks API callers to identify themselves with a `User-Agent`. Browsers do not
  let scripts set that header, so in the browser the request carries your page's origin instead.
  Outside the browser, pass `contact`.
- **US only.** A point outside NWS coverage shows a clear message rather than an empty card.
- **Icons** are the NWS icon images referenced by the forecast response.

## License

MIT
