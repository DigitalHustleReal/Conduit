<?php
/**
 * Conduit API Client
 *
 * Handles all communication with the Conduit CMS API.
 *
 * @package Conduit_CMS
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Conduit_API
 *
 * Provides methods to interact with the Conduit CMS REST API.
 */
class Conduit_API {

	/**
	 * Base URL for the Conduit API.
	 *
	 * @var string
	 */
	private $api_url;

	/**
	 * Workspace ID in Conduit.
	 *
	 * @var string
	 */
	private $workspace_id;

	/**
	 * API key for authentication.
	 *
	 * @var string
	 */
	private $api_key;

	/**
	 * Webhook secret for HMAC verification.
	 *
	 * @var string
	 */
	private $webhook_secret;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->api_url        = rtrim( get_option( 'conduit_api_url', 'https://conduit-woad.vercel.app/api' ), '/' );
		$this->workspace_id   = get_option( 'conduit_workspace_id', '' );
		$this->api_key        = get_option( 'conduit_api_key', '' );
		$this->webhook_secret = get_option( 'conduit_webhook_secret', '' );
	}

	/**
	 * Check whether the API is configured with all required credentials.
	 *
	 * @return bool True if all credentials are set.
	 */
	public function is_configured() {
		return ! empty( $this->api_url )
			&& ! empty( $this->workspace_id )
			&& ! empty( $this->api_key );
	}

	/**
	 * Build default request headers.
	 *
	 * @return array Associative array of headers.
	 */
	private function get_headers() {
		return array(
			'Authorization' => 'Bearer ' . $this->api_key,
			'Content-Type'  => 'application/json',
			'X-Workspace'   => $this->workspace_id,
		);
	}

	/**
	 * Make a GET request to the Conduit API.
	 *
	 * @param string $endpoint Relative endpoint path.
	 * @param array  $query    Optional query parameters.
	 * @return array|WP_Error Decoded response body or WP_Error.
	 */
	private function get( $endpoint, $query = array() ) {
		$url = $this->api_url . '/' . ltrim( $endpoint, '/' );

		if ( ! empty( $query ) ) {
			$url = add_query_arg( $query, $url );
		}

		$response = wp_remote_get(
			$url,
			array(
				'headers' => $this->get_headers(),
				'timeout' => 30,
			)
		);

		return $this->parse_response( $response );
	}

	/**
	 * Make a POST request to the Conduit API.
	 *
	 * @param string $endpoint Relative endpoint path.
	 * @param array  $body     Request body data.
	 * @return array|WP_Error Decoded response body or WP_Error.
	 */
	private function post( $endpoint, $body = array() ) {
		$url = $this->api_url . '/' . ltrim( $endpoint, '/' );

		$response = wp_remote_post(
			$url,
			array(
				'headers' => $this->get_headers(),
				'body'    => wp_json_encode( $body ),
				'timeout' => 30,
			)
		);

		return $this->parse_response( $response );
	}

	/**
	 * Parse an HTTP response into a usable array or WP_Error.
	 *
	 * @param array|WP_Error $response Raw response from wp_remote_*.
	 * @return array|WP_Error Decoded JSON body or error.
	 */
	private function parse_response( $response ) {
		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( $code < 200 || $code >= 300 ) {
			$message = isset( $data['error'] ) ? $data['error'] : 'API request failed';
			return new WP_Error(
				'conduit_api_error',
				sprintf( '%s (HTTP %d)', $message, $code ),
				array( 'status' => $code )
			);
		}

		return $data;
	}

	/**
	 * Fetch a paginated list of published articles.
	 *
	 * @param int $page  Page number (1-based).
	 * @param int $limit Number of articles per page.
	 * @return array|WP_Error List of articles or error.
	 */
	public function get_articles( $page = 1, $limit = 50 ) {
		return $this->get(
			'content',
			array(
				'workspace' => $this->workspace_id,
				'status'    => 'published',
				'page'      => absint( $page ),
				'limit'     => absint( $limit ),
			)
		);
	}

	/**
	 * Fetch a single article by its slug.
	 *
	 * @param string $slug The article slug.
	 * @return array|WP_Error Article data or error.
	 */
	public function get_article_by_slug( $slug ) {
		return $this->get(
			'content/' . sanitize_title( $slug ),
			array(
				'workspace' => $this->workspace_id,
			)
		);
	}

	/**
	 * Test the connection to the Conduit API.
	 *
	 * @return array|WP_Error Connection test result.
	 */
	public function test_connection() {
		if ( ! $this->is_configured() ) {
			return new WP_Error(
				'conduit_not_configured',
				__( 'API credentials are not configured.', 'conduit-cms' )
			);
		}

		return $this->get(
			'content',
			array(
				'workspace' => $this->workspace_id,
				'limit'     => 1,
			)
		);
	}

	/**
	 * Verify an incoming webhook signature using HMAC-SHA256.
	 *
	 * @param string $signature The signature from the X-Conduit-Signature header.
	 * @param string $body      The raw request body.
	 * @return bool True if the signature is valid.
	 */
	public function verify_webhook( $signature, $body ) {
		if ( empty( $this->webhook_secret ) || empty( $signature ) ) {
			return false;
		}

		$expected = hash_hmac( 'sha256', $body, $this->webhook_secret );

		return hash_equals( $expected, $signature );
	}
}
