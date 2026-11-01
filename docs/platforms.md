# Installing on your platform

Every option below shows the same forecast. Pick the first one your platform allows:

1. **The script tag.** It's the lightest option and matches your page's fonts and colours. Works anywhere you can paste HTML that includes `<script>`.
2. **The WordPress plugin**, for self-hosted WordPress.
3. **The iframe.** It works almost everywhere, including site builders that strip scripts.

**Finding coordinates:** in Google Maps, right-click the spot and click the coordinates at the top
of the menu to copy them, for example `47.6062, -122.3321`. The first number is `lat`, the second
is `lng`. Forecasts cover the United States and its territories.

## The snippets

**Script tag**

```html
<script
	type="module"
	src="https://cdn.jsdelivr.net/npm/nws-forecast-widget@0.1.1/src/index.js"
></script>
<nws-forecast lat="47.6062" lng="-122.3321" days="5"></nws-forecast>
```

**Iframe**

```html
<iframe
	src="https://bolton.github.io/nws-forecast-widget/embed/?lat=47.6062&lng=-122.3321&days=5"
	title="Weather forecast"
	loading="lazy"
	style="width:100%;height:280px;border:0"
></iframe>
```

The [demo page](https://bolton.github.io/nws-forecast-widget/demo/) writes both snippets for
whatever location you enter.

## Platform by platform

| Platform                  | Use        | Where to paste it                                                                                                                                                              |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WordPress (self-hosted)   | Plugin     | Plugins → Add New → search "NWS Forecast Widget", or upload the zip from [Releases](https://github.com/bolton/nws-forecast-widget/releases). Then add the "NWS Forecast" block |
| WordPress.com             | Plugin     | Only on plans that allow plugins. On other plans, the iframe in a Custom HTML block                                                                                            |
| Squarespace               | Script tag | Add a Code Block and paste. Squarespace only runs JavaScript in Code Blocks on some plans; if the forecast doesn't appear, use the iframe                                      |
| Webflow                   | Script tag | Add → Code Embed element                                                                                                                                                       |
| Ghost                     | Script tag | Type `/html` in the editor for an HTML card                                                                                                                                    |
| Shopify                   | Script tag | Online Store → Themes → Customize → Add section → Custom Liquid                                                                                                                |
| Carrd                     | Script tag | Add an Embed element, type Code                                                                                                                                                |
| Wix                       | Iframe URL | Add Elements → Embed Code → Embed HTML → Website address, then paste just the iframe's `src` URL                                                                               |
| Google Sites              | Iframe URL | Insert → Embed → By URL, then paste the iframe's `src` URL                                                                                                                     |
| Notion                    | Iframe URL | Type `/embed` and paste the iframe's `src` URL                                                                                                                                 |
| Plain HTML, any CMS       | Script tag | Anywhere in the page body                                                                                                                                                      |
| React, Vue, Svelte, Astro | npm        | `npm install nws-forecast-widget`, `import 'nws-forecast-widget'`, then use `<nws-forecast>` in your markup                                                                    |

## Iframe options

Everything is set in the query string of the iframe URL.

| Parameter            | Example             | Effect                                                                      |
| -------------------- | ------------------- | --------------------------------------------------------------------------- |
| `lat`, `lng`         | `47.6062`           | Required. Decimal degrees                                                   |
| `days`               | `3`                 | 1 to 7. Default 5                                                           |
| `units`              | `si`                | °C and km/h instead of °F and mph                                           |
| `heading`            | `Snoqualmie%20Pass` | Replaces "Forecast near …"                                                  |
| `theme`              | `dark`              | `light` (default), `dark`, or `auto` to follow the visitor's system setting |
| `bg`, `fg`, `accent` | `accent=38bdf8`     | Hex colours without the `#`                                                 |
| `credit`             | `0`                 | Hides the "Widget by beexploring.com" link                                  |

### Sizing the iframe

280px fits the usual row of days. In a column narrower than about 360px the days stack into a list
and need more height. If your platform lets you add a script, this keeps every forecast iframe
exactly as tall as its content:

```html
<script>
	addEventListener('message', function (event) {
		if (!event.data || event.data.type !== 'nws-forecast-height') return;
		document.querySelectorAll('iframe').forEach(function (frame) {
			if (frame.contentWindow === event.source) frame.style.height = event.data.height + 'px';
		});
	});
</script>
```
