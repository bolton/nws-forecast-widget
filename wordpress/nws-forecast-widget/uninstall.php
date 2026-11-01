<?php
/**
 * Remove the plugin's single option when it is deleted.
 *
 * @package NwsForecastWidget
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'nws_forecast_widget_options' );
