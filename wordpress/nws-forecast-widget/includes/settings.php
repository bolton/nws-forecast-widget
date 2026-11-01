<?php
/**
 * Settings → NWS Forecast: site-wide units and the opt-in credit link.
 *
 * @package NwsForecastWidget
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'admin_init',
	function () {
		register_setting(
			'nws_forecast_widget',
			NWS_FORECAST_WIDGET_OPTION,
			array(
				'type'              => 'object',
				'sanitize_callback' => 'nws_forecast_widget_sanitize_options',
				'default'           => array(
					'units'  => 'us',
					'credit' => false,
				),
			)
		);

		add_settings_section( 'nws_forecast_widget_defaults', '', '__return_false', 'nws-forecast-widget' );

		add_settings_field(
			'units',
			__( 'Default units', 'nws-forecast-widget' ),
			function () {
				$options = nws_forecast_widget_options();
				printf( '<select name="%s[units]" id="nws-forecast-widget-units">', esc_attr( NWS_FORECAST_WIDGET_OPTION ) );
				printf( '<option value="us" %s>%s</option>', selected( $options['units'], 'us', false ), esc_html__( 'Fahrenheit, mph', 'nws-forecast-widget' ) );
				printf( '<option value="si" %s>%s</option>', selected( $options['units'], 'si', false ), esc_html__( 'Celsius, km/h', 'nws-forecast-widget' ) );
				echo '</select>';
				echo '<p class="description">' . esc_html__( 'Used when a block or shortcode does not choose its own units.', 'nws-forecast-widget' ) . '</p>';
			},
			'nws-forecast-widget',
			'nws_forecast_widget_defaults',
			array( 'label_for' => 'nws-forecast-widget-units' )
		);

		add_settings_field(
			'credit',
			__( 'Credit link', 'nws-forecast-widget' ),
			function () {
				$options = nws_forecast_widget_options();
				printf(
					'<label><input type="checkbox" name="%s[credit]" value="1" %s> %s</label>',
					esc_attr( NWS_FORECAST_WIDGET_OPTION ),
					checked( $options['credit'], true, false ),
					esc_html__( 'Show a small "Widget by beexploring.com" link under each forecast', 'nws-forecast-widget' )
				);
				echo '<p class="description">' . esc_html__( 'Off by default. The National Weather Service data credit is always shown.', 'nws-forecast-widget' ) . '</p>';
			},
			'nws-forecast-widget',
			'nws_forecast_widget_defaults'
		);
	}
);

/**
 * @param mixed $input Submitted option value.
 * @return array{units: string, credit: bool}
 */
function nws_forecast_widget_sanitize_options( $input ) {
	$input = is_array( $input ) ? $input : array();
	return array(
		'units'  => ( isset( $input['units'] ) && 'si' === $input['units'] ) ? 'si' : 'us',
		'credit' => ! empty( $input['credit'] ),
	);
}

add_action(
	'admin_menu',
	function () {
		add_options_page(
			__( 'NWS Forecast', 'nws-forecast-widget' ),
			__( 'NWS Forecast', 'nws-forecast-widget' ),
			'manage_options',
			'nws-forecast-widget',
			'nws_forecast_widget_settings_page'
		);
	}
);

function nws_forecast_widget_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'NWS Forecast', 'nws-forecast-widget' ); ?></h1>
		<form action="options.php" method="post">
			<?php
			settings_fields( 'nws_forecast_widget' );
			do_settings_sections( 'nws-forecast-widget' );
			submit_button();
			?>
		</form>
		<h2><?php esc_html_e( 'Adding a forecast', 'nws-forecast-widget' ); ?></h2>
		<p><?php esc_html_e( 'In the block editor, add the "NWS Forecast" block and enter a latitude and longitude. Anywhere else, use the shortcode:', 'nws-forecast-widget' ); ?></p>
		<p><code>[nws_forecast lat="47.6062" lng="-122.3321" days="5"]</code></p>
		<p>
			<?php
			echo wp_kses(
				__( 'Optional attributes: <code>units="si"</code> for Celsius, <code>heading="My trailhead"</code> to replace the title. Forecasts cover the United States and its territories.', 'nws-forecast-widget' ),
				array( 'code' => array() )
			);
			?>
		</p>
	</div>
	<?php
}

add_filter(
	'plugin_action_links_' . plugin_basename( dirname( __DIR__ ) . '/nws-forecast-widget.php' ),
	function ( $links ) {
		array_unshift(
			$links,
			sprintf( '<a href="%s">%s</a>', esc_url( admin_url( 'options-general.php?page=nws-forecast-widget' ) ), esc_html__( 'Settings', 'nws-forecast-widget' ) )
		);
		return $links;
	}
);
