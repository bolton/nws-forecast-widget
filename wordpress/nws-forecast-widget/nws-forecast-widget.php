<?php
/**
 * Plugin Name:       NWS Forecast Widget
 * Plugin URI:        https://github.com/bolton/nws-forecast-widget
 * Description:       Show the National Weather Service forecast for any US location with a block or the [nws_forecast] shortcode. No API key needed.
 * Version:           1.0.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Rob Bolton
 * Author URI:        https://www.beexploring.com/
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       nws-forecast-widget
 *
 * @package NwsForecastWidget
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'NWS_FORECAST_WIDGET_VERSION', '1.0.0' );
define( 'NWS_FORECAST_WIDGET_OPTION', 'nws_forecast_widget_options' );

require_once __DIR__ . '/includes/settings.php';

/**
 * Site-wide defaults, merged over what is saved.
 *
 * @return array{units: string, credit: bool}
 */
function nws_forecast_widget_options() {
	$saved = get_option( NWS_FORECAST_WIDGET_OPTION, array() );
	return array(
		'units'  => ( isset( $saved['units'] ) && 'si' === $saved['units'] ) ? 'si' : 'us',
		// WordPress.org guideline 10: public credit links must be opt-in.
		'credit' => ! empty( $saved['credit'] ),
	);
}

/**
 * The JavaScript is the npm package bundled into one ES module by
 * `npm run build:wp`; it registers the <nws-forecast> element.
 */
function nws_forecast_widget_module_url() {
	return plugins_url( 'assets/js/nws-forecast-widget.js', __FILE__ );
}

add_action(
	'init',
	function () {
		wp_register_script_module(
			'nws-forecast-widget',
			nws_forecast_widget_module_url(),
			array(),
			NWS_FORECAST_WIDGET_VERSION
		);

		register_block_type( __DIR__ . '/block' );

		$editor_handle = generate_block_asset_handle( 'nws-forecast-widget/forecast', 'editorScript' );
		$options       = nws_forecast_widget_options();
		wp_add_inline_script(
			$editor_handle,
			'window.nwsForecastWidgetEditor = ' . wp_json_encode(
				array(
					'moduleUrl'    => add_query_arg( 'ver', NWS_FORECAST_WIDGET_VERSION, nws_forecast_widget_module_url() ),
					'defaultUnits' => $options['units'],
					'credit'       => $options['credit'],
				)
			) . ';',
			'before'
		);

		add_shortcode( 'nws_forecast', 'nws_forecast_widget_shortcode' );
	}
);

/**
 * Parse a coordinate, or return null when it is missing or out of range.
 *
 * @param mixed $value Raw attribute value.
 * @param float $limit 90 for latitude, 180 for longitude.
 * @return float|null
 */
function nws_forecast_widget_coordinate( $value, $limit ) {
	if ( ! is_numeric( $value ) ) {
		return null;
	}
	$number = (float) $value;
	return abs( $number ) <= $limit ? round( $number, 4 ) : null;
}

/**
 * Build the <nws-forecast> element shared by the block and the shortcode.
 *
 * @param array  $args    lat, lng, days, units, heading.
 * @param string $wrapper Extra attributes for a wrapping div, or '' for none.
 * @return string
 */
function nws_forecast_widget_markup( $args, $wrapper = '' ) {
	$lat = nws_forecast_widget_coordinate( isset( $args['lat'] ) ? $args['lat'] : null, 90 );
	$lng = nws_forecast_widget_coordinate( isset( $args['lng'] ) ? $args['lng'] : null, 180 );

	if ( null === $lat || null === $lng ) {
		// Only people who can fix it see the problem; visitors see nothing.
		if ( ! current_user_can( 'edit_posts' ) ) {
			return '';
		}
		return '<p class="nws-forecast-widget-notice">' . esc_html__( 'NWS Forecast: add a valid latitude and longitude.', 'nws-forecast-widget' ) . '</p>';
	}

	$options = nws_forecast_widget_options();
	$days    = isset( $args['days'] ) ? absint( $args['days'] ) : 5;
	$days    = min( 7, max( 1, $days ? $days : 5 ) );
	$units   = ( isset( $args['units'] ) && in_array( $args['units'], array( 'us', 'si' ), true ) ) ? $args['units'] : $options['units'];
	$heading = isset( $args['heading'] ) ? trim( (string) $args['heading'] ) : '';

	wp_enqueue_script_module( 'nws-forecast-widget' );

	$attributes = sprintf(
		'lat="%s" lng="%s" days="%d" units="%s"',
		esc_attr( number_format( $lat, 4, '.', '' ) ),
		esc_attr( number_format( $lng, 4, '.', '' ) ),
		$days,
		esc_attr( $units )
	);
	if ( '' !== $heading ) {
		$attributes .= sprintf( ' heading="%s"', esc_attr( $heading ) );
	}
	if ( ! $options['credit'] ) {
		$attributes .= ' no-attribution';
	}

	$element = '<nws-forecast ' . $attributes . '></nws-forecast>';
	return $wrapper ? '<div ' . $wrapper . '>' . $element . '</div>' : $element;
}

/**
 * [nws_forecast lat="47.6062" lng="-122.3321" days="5" units="us" heading="Seattle"]
 *
 * @param array|string $atts Shortcode attributes.
 * @return string
 */
function nws_forecast_widget_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'lat'     => '',
			'lng'     => '',
			'days'    => 5,
			'units'   => '',
			'heading' => '',
		),
		$atts,
		'nws_forecast'
	);
	return nws_forecast_widget_markup( $atts );
}
