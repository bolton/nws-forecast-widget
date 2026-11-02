=== NWS Forecast Widget ===
Contributors: beexploring
Tags: weather, forecast, weather widget, nws, noaa
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Show the National Weather Service forecast for any US location. Add a block or a shortcode, enter a latitude and longitude. No API key.

== Description ==

NWS Forecast Widget shows a clean, multi-day forecast from the US National Weather Service for any latitude and longitude in the United States and its territories.

* **No API key and no account.** The forecast comes from the free, public National Weather Service API.
* **A block and a shortcode.** Use the "NWS Forecast" block in the editor, or `[nws_forecast lat="47.6062" lng="-122.3321"]` in any theme, widget area or page builder.
* **Fits any theme.** The widget follows your site's light or dark color scheme and switches to a stacked list in narrow sidebars.
* **Lightweight.** One small JavaScript module, no jQuery, no tracking, loaded only on pages that show a forecast.
* **Day and night paired.** Each day shows the high, the low, the chance of precipitation and a short summary. Hover a day for the full NWS text.

Good for trailheads, campgrounds, ski areas, event venues, farms, marinas and anyone else whose readers want to know what the weather will do.

The widget is open source and also available for any website as the [nws-forecast-widget npm package](https://www.npmjs.com/package/nws-forecast-widget). It was built for [beexploring.com](https://www.beexploring.com/), a guide to the outdoors in the Pacific Northwest.

= Shortcode =

`[nws_forecast lat="47.6062" lng="-122.3321" days="5" units="us" heading="Seattle"]`

* `lat`, `lng` (required): decimal degrees.
* `days`: 1 to 7. Default 5.
* `units`: `us` (°F, mph) or `si` (°C, km/h). Defaults to the setting under Settings → NWS Forecast.
* `heading`: replaces the default "Forecast near …" title.

== External services ==

This plugin displays forecasts from the National Weather Service API (api.weather.gov), operated by the US National Oceanic and Atmospheric Administration.

When a page with a forecast loads, the visitor's browser requests the forecast for the latitude and longitude you entered. The request sends those coordinates and the usual browser information (IP address, user agent, referring page) to api.weather.gov. Forecast icons are loaded from the same service. Nothing is sent when no forecast is on the page, and the plugin itself stores no visitor data. Forecasts are cached in the visitor's browser for 30 minutes.

* Service: https://www.weather.gov/documentation/services-web-api
* Disclaimer and privacy: https://www.weather.gov/disclaimer and https://www.noaa.gov/protecting-your-privacy

== Installation ==

1. Install from Plugins → Add New, or upload the zip and activate it.
2. Add the "NWS Forecast" block to a page and enter a latitude and longitude. Right-click a spot in Google Maps to copy its coordinates.
3. Optionally choose default units under Settings → NWS Forecast.

== Frequently Asked Questions ==

= Does it work outside the United States? =

No. The National Weather Service covers the United States and its territories. For other locations the widget shows a short message saying the location is outside coverage.

= Do I need an API key? =

No. The National Weather Service API is free and public.

= Can I change the colors? =

Yes. The widget reads CSS custom properties, so a few lines in Appearance → Customize → Additional CSS will do it:

`nws-forecast { --nws-bg: #0f172a; --nws-fg: #e2e8f0; --nws-accent: #38bdf8; }`

Also available: `--nws-muted`, `--nws-border`, `--nws-radius`, `--nws-gap` and `--nws-font`.

= Where is the source code? =

The plugin ships the readable, unminified widget code. Its source and tests are at https://github.com/bolton/nws-forecast-widget.

== Screenshots ==

1. A five-day forecast in a post.
2. The block settings in the editor.
3. In a narrow sidebar, days stack into a list.

== Changelog ==

= 1.0.0 =
* First release.
