/**
 * Editor UI for the NWS Forecast block. Hand-written against the wp.* globals
 * so the plugin has no build step beyond bundling the widget itself.
 *
 * The preview is the real <nws-forecast> element. The editor canvas is an
 * iframe, so the widget module is loaded into whichever document the block
 * renders in rather than into the admin page.
 */
(function (blocks, blockEditor, components, element, i18n) {
	const h = element.createElement;
	const { useEffect, useRef, useState, Fragment } = element;
	const { __ } = i18n;
	const { useBlockProps, InspectorControls } = blockEditor;
	const { Button, PanelBody, Placeholder, RangeControl, SelectControl, TextControl } = components;
	const config = window.nwsForecastWidgetEditor || {};

	function isCoordinate(value, limit) {
		if (value === '' || value == null) return false;
		const n = Number(value);
		return Number.isFinite(n) && Math.abs(n) <= limit;
	}

	function useWidgetModule(ref) {
		useEffect(() => {
			const doc = ref.current && ref.current.ownerDocument;
			if (!doc || !config.moduleUrl) return;
			if (doc.defaultView.customElements.get('nws-forecast')) return;
			if (doc.getElementById('nws-forecast-widget-module')) return;
			const script = doc.createElement('script');
			script.type = 'module';
			script.id = 'nws-forecast-widget-module';
			script.src = config.moduleUrl;
			doc.head.appendChild(script);
		}, []);
	}

	// The preview fetches on every attribute change, so wait for typing to stop.
	function useDebounced(value, ms) {
		const [settled, setSettled] = useState(value);
		useEffect(() => {
			const timer = setTimeout(() => setSettled(value), ms);
			return () => clearTimeout(timer);
		}, [value, ms]);
		return settled;
	}

	// Inputs are local until submitted: "-1" is a valid longitude, so binding
	// them straight to attributes would swap in the preview mid-typing.
	function LocationForm({ setAttributes }) {
		const [draft, setDraft] = useState({ lat: '', lng: '' });
		const [error, setError] = useState('');
		const submit = (event) => {
			event.preventDefault();
			if (!isCoordinate(draft.lat, 90) || !isCoordinate(draft.lng, 180)) {
				setError(__('Enter a latitude and longitude in decimal degrees.', 'nws-forecast-widget'));
				return;
			}
			setAttributes({ lat: draft.lat, lng: draft.lng });
		};
		return h(
			'form',
			{
				onSubmit: submit,
				style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end' }
			},
			h(LocationFields, {
				attributes: draft,
				setAttributes: (change) => {
					setError('');
					setDraft((current) => ({ ...current, ...change }));
				}
			}),
			h(Button, { variant: 'primary', type: 'submit' }, __('Show forecast', 'nws-forecast-widget')),
			error && h('p', { style: { flexBasis: '100%', margin: 0, color: '#cc1818' } }, error)
		);
	}

	function LocationFields({ attributes, setAttributes }) {
		return h(
			Fragment,
			null,
			h(TextControl, {
				label: __('Latitude', 'nws-forecast-widget'),
				value: attributes.lat,
				placeholder: '47.6062',
				inputMode: 'decimal',
				onChange: (lat) => setAttributes({ lat: lat.trim() }),
				__nextHasNoMarginBottom: true
			}),
			h(TextControl, {
				label: __('Longitude', 'nws-forecast-widget'),
				value: attributes.lng,
				placeholder: '-122.3321',
				inputMode: 'decimal',
				onChange: (lng) => setAttributes({ lng: lng.trim() }),
				__nextHasNoMarginBottom: true
			})
		);
	}

	function Edit({ attributes, setAttributes }) {
		const ref = useRef();
		useWidgetModule(ref);
		const blockProps = useBlockProps({ ref });
		const valid = isCoordinate(attributes.lat, 90) && isCoordinate(attributes.lng, 180);
		const debounced = useDebounced(attributes, 600);
		const preview =
			isCoordinate(debounced.lat, 90) && isCoordinate(debounced.lng, 180) ? debounced : attributes;

		const inspector = h(
			InspectorControls,
			null,
			h(
				PanelBody,
				{ title: __('Location', 'nws-forecast-widget') },
				h(LocationFields, { attributes, setAttributes }),
				h(
					'p',
					{ className: 'components-base-control__help' },
					__(
						'Decimal degrees. Right-click a spot in Google Maps to copy its coordinates. US locations only.',
						'nws-forecast-widget'
					)
				)
			),
			h(
				PanelBody,
				{ title: __('Display', 'nws-forecast-widget') },
				h(RangeControl, {
					label: __('Days', 'nws-forecast-widget'),
					value: attributes.days,
					min: 1,
					max: 7,
					onChange: (days) => setAttributes({ days: days || 5 }),
					__nextHasNoMarginBottom: true
				}),
				h(SelectControl, {
					label: __('Units', 'nws-forecast-widget'),
					value: attributes.units,
					options: [
						{ label: __('Site default', 'nws-forecast-widget'), value: '' },
						{ label: __('Fahrenheit, mph', 'nws-forecast-widget'), value: 'us' },
						{ label: __('Celsius, km/h', 'nws-forecast-widget'), value: 'si' }
					],
					onChange: (units) => setAttributes({ units }),
					__nextHasNoMarginBottom: true
				}),
				h(TextControl, {
					label: __('Heading', 'nws-forecast-widget'),
					help: __(
						'Leave empty to use "Forecast near" and the nearest town.',
						'nws-forecast-widget'
					),
					value: attributes.heading,
					onChange: (heading) => setAttributes({ heading }),
					__nextHasNoMarginBottom: true
				})
			)
		);

		// Clearing a sidebar field to retype it keeps the last good preview.
		if (!valid && preview === attributes) {
			return h(
				'div',
				blockProps,
				inspector,
				h(
					Placeholder,
					{
						icon: 'cloud',
						label: __('NWS Forecast', 'nws-forecast-widget'),
						instructions: __(
							'Enter the latitude and longitude of a US location.',
							'nws-forecast-widget'
						)
					},
					h(LocationForm, { setAttributes })
				)
			);
		}

		const widgetProps = {
			lat: preview.lat,
			lng: preview.lng,
			days: String(preview.days || 5),
			units: preview.units || config.defaultUnits || 'us'
		};
		if (preview.heading) widgetProps.heading = preview.heading;
		if (!config.credit) widgetProps['no-attribution'] = '';

		return h('div', blockProps, inspector, h('nws-forecast', widgetProps));
	}

	blocks.registerBlockType('nws-forecast-widget/forecast', {
		edit: Edit,
		save: () => null
	});
})(
	window.wp.blocks,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.element,
	window.wp.i18n
);
