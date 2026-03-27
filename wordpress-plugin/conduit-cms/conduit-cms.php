<?php
/**
 * Plugin Name: Conduit CMS
 * Plugin URI: https://getconduit.io/wordpress
 * Description: Sync content from Conduit CMS to WordPress. Publish once, distribute everywhere.
 * Version: 1.0.0
 * Author: Conduit
 * Author URI: https://getconduit.io
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: conduit-cms
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Tested up to: 6.7
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CONDUIT_CMS_VERSION', '1.0.0' );
define( 'CONDUIT_CMS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'CONDUIT_CMS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'CONDUIT_CMS_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

/**
 * Include required class files.
 */
require_once CONDUIT_CMS_PLUGIN_DIR . 'includes/class-conduit-api.php';
require_once CONDUIT_CMS_PLUGIN_DIR . 'includes/class-conduit-sync.php';
require_once CONDUIT_CMS_PLUGIN_DIR . 'includes/class-conduit-admin.php';

/**
 * Plugin activation hook.
 */
function conduit_cms_activate() {
	// Set default options.
	$defaults = array(
		'conduit_api_url'        => 'https://conduit-woad.vercel.app/api',
		'conduit_workspace_id'   => '',
		'conduit_api_key'        => '',
		'conduit_webhook_secret' => '',
		'conduit_auto_sync'      => '1',
		'conduit_sync_interval'  => 'fifteen_minutes',
		'conduit_default_status' => 'draft',
		'conduit_default_cat'    => 0,
		'conduit_sync_log'       => array(),
		'conduit_last_sync'      => '',
	);

	foreach ( $defaults as $key => $value ) {
		if ( false === get_option( $key ) ) {
			update_option( $key, $value );
		}
	}

	// Schedule cron event.
	$interval = get_option( 'conduit_sync_interval', 'fifteen_minutes' );
	if ( ! wp_next_scheduled( 'conduit_cms_cron_sync' ) ) {
		wp_schedule_event( time(), $interval, 'conduit_cms_cron_sync' );
	}

	// Flush rewrite rules for REST endpoint.
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'conduit_cms_activate' );

/**
 * Plugin deactivation hook.
 */
function conduit_cms_deactivate() {
	wp_clear_scheduled_hook( 'conduit_cms_cron_sync' );
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'conduit_cms_deactivate' );

/**
 * Register custom cron schedules.
 *
 * @param array $schedules Existing cron schedules.
 * @return array Modified schedules.
 */
function conduit_cms_cron_schedules( $schedules ) {
	$schedules['fifteen_minutes'] = array(
		'interval' => 900,
		'display'  => esc_html__( 'Every 15 Minutes', 'conduit-cms' ),
	);
	$schedules['thirty_minutes'] = array(
		'interval' => 1800,
		'display'  => esc_html__( 'Every 30 Minutes', 'conduit-cms' ),
	);
	$schedules['six_hours'] = array(
		'interval' => 21600,
		'display'  => esc_html__( 'Every 6 Hours', 'conduit-cms' ),
	);
	return $schedules;
}
add_filter( 'cron_schedules', 'conduit_cms_cron_schedules' );

/**
 * Cron sync handler.
 */
function conduit_cms_do_cron_sync() {
	$auto_sync = get_option( 'conduit_auto_sync', '0' );
	if ( '1' !== $auto_sync ) {
		return;
	}

	$api  = new Conduit_API();
	$sync = new Conduit_Sync( $api );
	$sync->sync_all();
}
add_action( 'conduit_cms_cron_sync', 'conduit_cms_do_cron_sync' );

/**
 * Register REST API webhook endpoint.
 */
function conduit_cms_register_rest_routes() {
	register_rest_route(
		'conduit/v1',
		'/webhook',
		array(
			'methods'             => 'POST',
			'callback'            => 'conduit_cms_handle_webhook',
			'permission_callback' => '__return_true',
		)
	);
}
add_action( 'rest_api_init', 'conduit_cms_register_rest_routes' );

/**
 * Handle incoming webhook from Conduit.
 *
 * @param WP_REST_Request $request The REST request.
 * @return WP_REST_Response
 */
function conduit_cms_handle_webhook( WP_REST_Request $request ) {
	$api       = new Conduit_API();
	$signature = $request->get_header( 'X-Conduit-Signature' );
	$body      = $request->get_body();

	if ( ! $api->verify_webhook( $signature, $body ) ) {
		return new WP_REST_Response(
			array( 'error' => 'Invalid signature' ),
			403
		);
	}

	$payload = $request->get_json_params();
	if ( empty( $payload ) ) {
		return new WP_REST_Response(
			array( 'error' => 'Empty payload' ),
			400
		);
	}

	$sync   = new Conduit_Sync( $api );
	$result = $sync->handle_webhook( $payload );

	return new WP_REST_Response( $result, 200 );
}

/**
 * Initialize admin area.
 */
function conduit_cms_init_admin() {
	if ( is_admin() ) {
		new Conduit_Admin();
	}
}
add_action( 'plugins_loaded', 'conduit_cms_init_admin' );

/**
 * Add settings link on plugin listing page.
 *
 * @param array $links Existing action links.
 * @return array Modified links.
 */
function conduit_cms_action_links( $links ) {
	$settings_link = '<a href="' . esc_url( admin_url( 'options-general.php?page=conduit-cms' ) ) . '">'
		. esc_html__( 'Settings', 'conduit-cms' ) . '</a>';
	array_unshift( $links, $settings_link );
	return $links;
}
add_filter( 'plugin_action_links_' . CONDUIT_CMS_PLUGIN_BASENAME, 'conduit_cms_action_links' );
