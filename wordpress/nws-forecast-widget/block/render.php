<?php
/**
 * Front-end output for the NWS Forecast block.
 *
 * @package NwsForecastWidget
 * @var array $attributes Block attributes.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Markup is escaped inside nws_forecast_widget_markup().
echo nws_forecast_widget_markup( $attributes, get_block_wrapper_attributes() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
