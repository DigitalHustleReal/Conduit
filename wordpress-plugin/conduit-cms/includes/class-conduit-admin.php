<?php
/**
 * Conduit CMS Admin Settings
 *
 * Registers the settings page, handles manual sync/test actions,
 * and renders the admin UI.
 *
 * @package Conduit_CMS
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Conduit_Admin
 */
class Conduit_Admin {

	/**
	 * Constructor. Registers hooks.
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'admin_init', array( $this, 'handle_actions' ) );
	}

	/**
	 * Add the settings page under the Settings menu.
	 */
	public function add_menu() {
		add_options_page(
			__( 'Conduit CMS', 'conduit-cms' ),
			__( 'Conduit CMS', 'conduit-cms' ),
			'manage_options',
			'conduit-cms',
			array( $this, 'render_page' )
		);
	}

	/**
	 * Enqueue admin CSS on the plugin settings page.
	 *
	 * @param string $hook_suffix The current admin page.
	 */
	public function enqueue_assets( $hook_suffix ) {
		if ( 'settings_page_conduit-cms' !== $hook_suffix ) {
			return;
		}

		wp_enqueue_style(
			'conduit-cms-admin',
			CONDUIT_CMS_PLUGIN_URL . 'assets/admin.css',
			array(),
			CONDUIT_CMS_VERSION
		);
	}

	/**
	 * Register plugin settings with the WordPress Settings API.
	 */
	public function register_settings() {
		// API connection settings.
		register_setting( 'conduit_cms_settings', 'conduit_api_url', array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
			'default'           => 'https://conduit-woad.vercel.app/api',
		) );
		register_setting( 'conduit_cms_settings', 'conduit_workspace_id', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
		) );
		register_setting( 'conduit_cms_settings', 'conduit_api_key', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
		) );
		register_setting( 'conduit_cms_settings', 'conduit_webhook_secret', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
		) );

		// Sync settings.
		register_setting( 'conduit_cms_settings', 'conduit_auto_sync', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => '1',
		) );
		register_setting( 'conduit_cms_settings', 'conduit_sync_interval', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_key',
			'default'           => 'fifteen_minutes',
		) );
		register_setting( 'conduit_cms_settings', 'conduit_default_status', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_key',
			'default'           => 'draft',
		) );
		register_setting( 'conduit_cms_settings', 'conduit_default_cat', array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 0,
		) );

		// ---- Sections ---- //

		add_settings_section(
			'conduit_connection',
			__( 'API Connection', 'conduit-cms' ),
			array( $this, 'section_connection_cb' ),
			'conduit-cms'
		);

		add_settings_section(
			'conduit_sync_options',
			__( 'Sync Options', 'conduit-cms' ),
			array( $this, 'section_sync_cb' ),
			'conduit-cms'
		);

		// ---- Fields ---- //

		add_settings_field( 'conduit_api_url', __( 'API URL', 'conduit-cms' ), array( $this, 'field_api_url' ), 'conduit-cms', 'conduit_connection' );
		add_settings_field( 'conduit_workspace_id', __( 'Workspace ID', 'conduit-cms' ), array( $this, 'field_workspace_id' ), 'conduit-cms', 'conduit_connection' );
		add_settings_field( 'conduit_api_key', __( 'API Key', 'conduit-cms' ), array( $this, 'field_api_key' ), 'conduit-cms', 'conduit_connection' );
		add_settings_field( 'conduit_webhook_secret', __( 'Webhook Secret', 'conduit-cms' ), array( $this, 'field_webhook_secret' ), 'conduit-cms', 'conduit_connection' );

		add_settings_field( 'conduit_auto_sync', __( 'Auto-Sync', 'conduit-cms' ), array( $this, 'field_auto_sync' ), 'conduit-cms', 'conduit_sync_options' );
		add_settings_field( 'conduit_sync_interval', __( 'Sync Interval', 'conduit-cms' ), array( $this, 'field_sync_interval' ), 'conduit-cms', 'conduit_sync_options' );
		add_settings_field( 'conduit_default_status', __( 'Default Post Status', 'conduit-cms' ), array( $this, 'field_default_status' ), 'conduit-cms', 'conduit_sync_options' );
		add_settings_field( 'conduit_default_cat', __( 'Default Category', 'conduit-cms' ), array( $this, 'field_default_cat' ), 'conduit-cms', 'conduit_sync_options' );
	}

	/* ─── Section callbacks ─── */

	/**
	 * Render the connection section description.
	 */
	public function section_connection_cb() {
		echo '<p>' . esc_html__( 'Enter your Conduit CMS API credentials. Find these in your Conduit workspace settings.', 'conduit-cms' ) . '</p>';
	}

	/**
	 * Render the sync options section description.
	 */
	public function section_sync_cb() {
		echo '<p>' . esc_html__( 'Configure how content is synced from Conduit to WordPress.', 'conduit-cms' ) . '</p>';
	}

	/* ─── Field renderers ─── */

	/**
	 * Render the API URL field.
	 */
	public function field_api_url() {
		$value = get_option( 'conduit_api_url', 'https://conduit-woad.vercel.app/api' );
		printf(
			'<input type="url" id="conduit_api_url" name="conduit_api_url" value="%s" class="regular-text" />',
			esc_attr( $value )
		);
		echo '<p class="description">' . esc_html__( 'Base URL of the Conduit API (usually ends with /api).', 'conduit-cms' ) . '</p>';
	}

	/**
	 * Render the Workspace ID field.
	 */
	public function field_workspace_id() {
		$value = get_option( 'conduit_workspace_id', '' );
		printf(
			'<input type="text" id="conduit_workspace_id" name="conduit_workspace_id" value="%s" class="regular-text" />',
			esc_attr( $value )
		);
	}

	/**
	 * Render the API Key field.
	 */
	public function field_api_key() {
		$value = get_option( 'conduit_api_key', '' );
		printf(
			'<input type="password" id="conduit_api_key" name="conduit_api_key" value="%s" class="regular-text" autocomplete="off" />',
			esc_attr( $value )
		);
	}

	/**
	 * Render the Webhook Secret field.
	 */
	public function field_webhook_secret() {
		$value = get_option( 'conduit_webhook_secret', '' );
		printf(
			'<input type="password" id="conduit_webhook_secret" name="conduit_webhook_secret" value="%s" class="regular-text" autocomplete="off" />',
			esc_attr( $value )
		);
		echo '<p class="description">' . esc_html__( 'Used to verify incoming webhook requests from Conduit.', 'conduit-cms' ) . '</p>';
	}

	/**
	 * Render the Auto-Sync checkbox.
	 */
	public function field_auto_sync() {
		$value = get_option( 'conduit_auto_sync', '1' );
		printf(
			'<label><input type="checkbox" name="conduit_auto_sync" value="1" %s /> %s</label>',
			checked( '1', $value, false ),
			esc_html__( 'Automatically sync content on the schedule below', 'conduit-cms' )
		);
	}

	/**
	 * Render the Sync Interval dropdown.
	 */
	public function field_sync_interval() {
		$value   = get_option( 'conduit_sync_interval', 'fifteen_minutes' );
		$options = array(
			'fifteen_minutes' => __( 'Every 15 minutes', 'conduit-cms' ),
			'thirty_minutes'  => __( 'Every 30 minutes', 'conduit-cms' ),
			'hourly'          => __( 'Every hour', 'conduit-cms' ),
			'six_hours'       => __( 'Every 6 hours', 'conduit-cms' ),
		);

		echo '<select name="conduit_sync_interval" id="conduit_sync_interval">';
		foreach ( $options as $key => $label ) {
			printf(
				'<option value="%s" %s>%s</option>',
				esc_attr( $key ),
				selected( $value, $key, false ),
				esc_html( $label )
			);
		}
		echo '</select>';
	}

	/**
	 * Render the Default Post Status dropdown.
	 */
	public function field_default_status() {
		$value = get_option( 'conduit_default_status', 'draft' );
		echo '<select name="conduit_default_status" id="conduit_default_status">';
		printf( '<option value="draft" %s>%s</option>', selected( 'draft', $value, false ), esc_html__( 'Draft', 'conduit-cms' ) );
		printf( '<option value="publish" %s>%s</option>', selected( 'publish', $value, false ), esc_html__( 'Publish', 'conduit-cms' ) );
		echo '</select>';
	}

	/**
	 * Render the Default Category dropdown.
	 */
	public function field_default_cat() {
		$value = (int) get_option( 'conduit_default_cat', 0 );
		wp_dropdown_categories(
			array(
				'name'             => 'conduit_default_cat',
				'id'               => 'conduit_default_cat',
				'selected'         => $value,
				'show_option_none' => __( '-- None --', 'conduit-cms' ),
				'hide_empty'       => false,
			)
		);
	}

	/* ─── Manual actions ─── */

	/**
	 * Handle manual Sync Now and Test Connection actions.
	 */
	public function handle_actions() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		// Sync Now.
		if ( isset( $_POST['conduit_sync_now'] ) ) {
			check_admin_referer( 'conduit_sync_now_action' );

			$api    = new Conduit_API();
			$sync   = new Conduit_Sync( $api );
			$result = $sync->sync_all();

			$message = is_array( $result ) && isset( $result['error'] )
				? $result['error']
				: sprintf(
					/* translators: 1: created count, 2: updated count, 3: skipped count */
					__( 'Sync complete: %1$d created, %2$d updated, %3$d skipped.', 'conduit-cms' ),
					isset( $result['created'] ) ? $result['created'] : 0,
					isset( $result['updated'] ) ? $result['updated'] : 0,
					isset( $result['skipped'] ) ? $result['skipped'] : 0
				);

			add_settings_error( 'conduit_cms_messages', 'sync_result', $message, 'updated' );
		}

		// Test Connection.
		if ( isset( $_POST['conduit_test_connection'] ) ) {
			check_admin_referer( 'conduit_test_connection_action' );

			$api    = new Conduit_API();
			$result = $api->test_connection();

			if ( is_wp_error( $result ) ) {
				add_settings_error(
					'conduit_cms_messages',
					'test_failed',
					__( 'Connection failed: ', 'conduit-cms' ) . $result->get_error_message(),
					'error'
				);
			} else {
				add_settings_error(
					'conduit_cms_messages',
					'test_success',
					__( 'Connection successful! Conduit API is reachable.', 'conduit-cms' ),
					'updated'
				);
			}
		}
	}

	/* ─── Page renderer ─── */

	/**
	 * Render the full settings page.
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$last_sync  = get_option( 'conduit_last_sync', '' );
		$sync_log   = get_option( 'conduit_sync_log', array() );
		$webhook_url = rest_url( 'conduit/v1/webhook' );

		?>
		<div class="wrap conduit-cms-wrap">
			<h1><?php esc_html_e( 'Conduit CMS Settings', 'conduit-cms' ); ?></h1>

			<?php settings_errors( 'conduit_cms_messages' ); ?>

			<div class="conduit-cms-grid">
				<!-- Settings Form -->
				<div class="conduit-cms-main">
					<form method="post" action="options.php">
						<?php
						settings_fields( 'conduit_cms_settings' );
						do_settings_sections( 'conduit-cms' );
						submit_button( __( 'Save Settings', 'conduit-cms' ) );
						?>
					</form>

					<hr />

					<h2><?php esc_html_e( 'Sync Direction', 'conduit-cms' ); ?></h2>
					<p class="description">
						<?php esc_html_e( 'Content flows one way: Conduit CMS to WordPress. Articles created or updated in Conduit are synced to your WordPress posts.', 'conduit-cms' ); ?>
					</p>

					<hr />

					<h2><?php esc_html_e( 'Webhook URL', 'conduit-cms' ); ?></h2>
					<p class="description">
						<?php esc_html_e( 'Add this URL in your Conduit webhook settings for real-time sync:', 'conduit-cms' ); ?>
					</p>
					<code id="conduit-webhook-url"><?php echo esc_url( $webhook_url ); ?></code>
				</div>

				<!-- Sidebar -->
				<div class="conduit-cms-sidebar">
					<!-- Actions -->
					<div class="conduit-cms-card">
						<h3><?php esc_html_e( 'Actions', 'conduit-cms' ); ?></h3>

						<form method="post">
							<?php wp_nonce_field( 'conduit_sync_now_action' ); ?>
							<p>
								<button type="submit" name="conduit_sync_now" class="button button-primary" style="width:100%;">
									<?php esc_html_e( 'Sync Now', 'conduit-cms' ); ?>
								</button>
							</p>
						</form>

						<form method="post">
							<?php wp_nonce_field( 'conduit_test_connection_action' ); ?>
							<p>
								<button type="submit" name="conduit_test_connection" class="button" style="width:100%;">
									<?php esc_html_e( 'Test Connection', 'conduit-cms' ); ?>
								</button>
							</p>
						</form>

						<?php if ( $last_sync ) : ?>
							<p class="conduit-last-sync">
								<?php
								printf(
									/* translators: %s: last sync time */
									esc_html__( 'Last sync: %s', 'conduit-cms' ),
									esc_html( $last_sync )
								);
								?>
							</p>
						<?php endif; ?>
					</div>

					<!-- Sync Log -->
					<div class="conduit-cms-card">
						<h3><?php esc_html_e( 'Sync Log', 'conduit-cms' ); ?></h3>

						<?php if ( empty( $sync_log ) ) : ?>
							<p class="conduit-empty-log"><?php esc_html_e( 'No sync activity yet.', 'conduit-cms' ); ?></p>
						<?php else : ?>
							<ul class="conduit-sync-log">
								<?php foreach ( $sync_log as $entry ) : ?>
									<li class="conduit-log-<?php echo esc_attr( $entry['type'] ); ?>">
										<span class="conduit-log-time"><?php echo esc_html( $entry['time'] ); ?></span>
										<span class="conduit-log-msg"><?php echo esc_html( $entry['message'] ); ?></span>
									</li>
								<?php endforeach; ?>
							</ul>
						<?php endif; ?>
					</div>
				</div>
			</div>
		</div>
		<?php
	}
}
