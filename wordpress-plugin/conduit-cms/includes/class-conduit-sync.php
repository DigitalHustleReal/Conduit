<?php
/**
 * Conduit Sync Engine
 *
 * Handles syncing content from Conduit CMS to WordPress posts.
 *
 * @package Conduit_CMS
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Conduit_Sync
 *
 * Creates and updates WordPress posts from Conduit article data.
 */
class Conduit_Sync {

	/**
	 * API client instance.
	 *
	 * @var Conduit_API
	 */
	private $api;

	/**
	 * Maximum number of entries kept in the sync log.
	 *
	 * @var int
	 */
	const LOG_MAX_ENTRIES = 20;

	/**
	 * Constructor.
	 *
	 * @param Conduit_API $api API client instance.
	 */
	public function __construct( Conduit_API $api ) {
		$this->api = $api;
	}

	/**
	 * Sync all published articles from Conduit into WordPress.
	 *
	 * Iterates through paginated API results and creates or updates
	 * a WordPress post for each article.
	 *
	 * @return array Summary with counts of created, updated, skipped, and failed items.
	 */
	public function sync_all() {
		if ( ! $this->api->is_configured() ) {
			return array( 'error' => 'API not configured' );
		}

		$page    = 1;
		$limit   = 50;
		$created = 0;
		$updated = 0;
		$skipped = 0;
		$failed  = 0;

		do {
			$response = $this->api->get_articles( $page, $limit );

			if ( is_wp_error( $response ) ) {
				$this->log_entry( 'Sync failed: ' . $response->get_error_message(), 'error' );
				break;
			}

			$articles = isset( $response['data'] ) ? $response['data'] : $response;

			if ( ! is_array( $articles ) || empty( $articles ) ) {
				break;
			}

			foreach ( $articles as $article ) {
				$result = $this->sync_single( $article );

				switch ( $result['status'] ) {
					case 'created':
						$created++;
						break;
					case 'updated':
						$updated++;
						break;
					case 'skipped':
						$skipped++;
						break;
					default:
						$failed++;
						break;
				}
			}

			$page++;

			$has_more = isset( $response['has_more'] ) ? $response['has_more'] : ( count( $articles ) >= $limit );
		} while ( $has_more );

		update_option( 'conduit_last_sync', current_time( 'mysql' ) );

		$summary = sprintf(
			'Sync complete: %d created, %d updated, %d skipped, %d failed',
			$created,
			$updated,
			$skipped,
			$failed
		);
		$this->log_entry( $summary, 'success' );

		return array(
			'created' => $created,
			'updated' => $updated,
			'skipped' => $skipped,
			'failed'  => $failed,
		);
	}

	/**
	 * Sync a single Conduit article to a WordPress post.
	 *
	 * Creates a new post or updates an existing one based on the
	 * Conduit ID stored in post meta. Skips posts that have been
	 * edited locally in WordPress since the last sync.
	 *
	 * @param array $article Conduit article data.
	 * @param bool  $force   Whether to overwrite local changes.
	 * @return array Result with 'status' key (created|updated|skipped|failed) and optional 'post_id'.
	 */
	public function sync_single( $article, $force = false ) {
		if ( empty( $article['id'] ) ) {
			return array( 'status' => 'failed', 'message' => 'Missing article ID' );
		}

		$conduit_id = sanitize_text_field( $article['id'] );
		$title      = isset( $article['title'] ) ? sanitize_text_field( $article['title'] ) : '';
		$body       = isset( $article['body'] ) ? $article['body'] : '';
		$slug       = isset( $article['slug'] ) ? sanitize_title( $article['slug'] ) : sanitize_title( $title );

		// Convert markdown body to HTML.
		$content = $this->markdown_to_html( $body );

		// Determine post status.
		$default_status = get_option( 'conduit_default_status', 'draft' );
		$conduit_status = isset( $article['status'] ) ? $article['status'] : '';
		if ( 'published' === $conduit_status ) {
			$post_status = 'publish';
		} elseif ( 'draft' === $conduit_status ) {
			$post_status = 'draft';
		} else {
			$post_status = $default_status;
		}

		// Check whether this article was already synced.
		$existing_id = $this->get_post_by_conduit_id( $conduit_id );

		// Conflict detection: skip if the WP post was modified after the last sync.
		if ( $existing_id && ! $force ) {
			$last_sync   = get_post_meta( $existing_id, '_conduit_last_sync', true );
			$wp_modified = get_post_field( 'post_modified_gmt', $existing_id );

			if ( $last_sync && $wp_modified && strtotime( $wp_modified ) > strtotime( $last_sync ) ) {
				$this->log_entry(
					sprintf( 'Skipped "%s" — modified locally in WordPress', $title ),
					'skipped'
				);
				return array(
					'status'  => 'skipped',
					'post_id' => $existing_id,
					'reason'  => 'Modified locally after last sync',
				);
			}
		}

		// Build the post data array.
		$post_data = array(
			'post_title'   => $title,
			'post_content' => $content,
			'post_name'    => $slug,
			'post_status'  => $post_status,
			'post_type'    => 'post',
		);

		// Set publish date if provided.
		if ( ! empty( $article['publish_date'] ) ) {
			$post_data['post_date']     = gmdate( 'Y-m-d H:i:s', strtotime( $article['publish_date'] ) );
			$post_data['post_date_gmt'] = gmdate( 'Y-m-d H:i:s', strtotime( $article['publish_date'] ) );
		}

		if ( $existing_id ) {
			// Update existing post.
			$post_data['ID'] = $existing_id;
			$post_id         = wp_update_post( $post_data, true );
		} else {
			// Create new post.
			$post_id = wp_insert_post( $post_data, true );
		}

		if ( is_wp_error( $post_id ) ) {
			$this->log_entry(
				sprintf( 'Failed to sync "%s": %s', $title, $post_id->get_error_message() ),
				'error'
			);
			return array( 'status' => 'failed', 'message' => $post_id->get_error_message() );
		}

		// Store Conduit metadata.
		update_post_meta( $post_id, '_conduit_id', $conduit_id );
		update_post_meta( $post_id, '_conduit_last_sync', current_time( 'mysql', true ) );

		// Assign tags.
		if ( ! empty( $article['tags'] ) && is_array( $article['tags'] ) ) {
			$tag_names = array_map( 'sanitize_text_field', $article['tags'] );
			wp_set_post_tags( $post_id, $tag_names, false );
		}

		// Assign category from collection or default.
		$this->assign_category( $post_id, $article );

		// Set featured image.
		if ( ! empty( $article['featured_image'] ) ) {
			$this->set_featured_image( $post_id, $article['featured_image'], $title );
		}

		// SEO meta (Yoast / RankMath).
		$this->set_seo_meta( $post_id, $article );

		$action = $existing_id ? 'updated' : 'created';
		$this->log_entry(
			sprintf( '%s "%s"', ucfirst( $action ), $title ),
			'success'
		);

		return array(
			'status'  => $action,
			'post_id' => $post_id,
		);
	}

	/**
	 * Handle an incoming webhook payload.
	 *
	 * Processes create, update, and delete events.
	 *
	 * @param array $payload Webhook payload from Conduit.
	 * @return array Result of the operation.
	 */
	public function handle_webhook( $payload ) {
		$event   = isset( $payload['event'] ) ? sanitize_text_field( $payload['event'] ) : '';
		$article = isset( $payload['data'] ) ? $payload['data'] : array();

		switch ( $event ) {
			case 'content.published':
			case 'content.updated':
				if ( empty( $article ) ) {
					return array( 'error' => 'No article data in payload' );
				}
				return $this->sync_single( $article, true );

			case 'content.unpublished':
				if ( ! empty( $article['id'] ) ) {
					$post_id = $this->get_post_by_conduit_id( sanitize_text_field( $article['id'] ) );
					if ( $post_id ) {
						wp_update_post(
							array(
								'ID'          => $post_id,
								'post_status' => 'draft',
							)
						);
						$this->log_entry(
							sprintf( 'Unpublished "%s" via webhook', get_the_title( $post_id ) ),
							'success'
						);
						return array( 'status' => 'unpublished', 'post_id' => $post_id );
					}
				}
				return array( 'status' => 'skipped', 'reason' => 'Post not found' );

			case 'content.deleted':
				if ( ! empty( $article['id'] ) ) {
					$post_id = $this->get_post_by_conduit_id( sanitize_text_field( $article['id'] ) );
					if ( $post_id ) {
						wp_trash_post( $post_id );
						$this->log_entry(
							sprintf( 'Trashed "%s" via webhook', get_the_title( $post_id ) ),
							'success'
						);
						return array( 'status' => 'trashed', 'post_id' => $post_id );
					}
				}
				return array( 'status' => 'skipped', 'reason' => 'Post not found' );

			default:
				return array( 'status' => 'ignored', 'event' => $event );
		}
	}

	/**
	 * Find a WordPress post ID by its Conduit article ID.
	 *
	 * @param string $conduit_id The Conduit article ID.
	 * @return int|null Post ID or null if not found.
	 */
	private function get_post_by_conduit_id( $conduit_id ) {
		$posts = get_posts(
			array(
				'post_type'      => 'post',
				'post_status'    => 'any',
				'meta_key'       => '_conduit_id',
				'meta_value'     => $conduit_id,
				'posts_per_page' => 1,
				'fields'         => 'ids',
			)
		);

		return ! empty( $posts ) ? (int) $posts[0] : null;
	}

	/**
	 * Assign a category to a post based on the Conduit collection field.
	 *
	 * Creates the category if it does not exist. Falls back to the
	 * default category configured in plugin settings.
	 *
	 * @param int   $post_id Post ID.
	 * @param array $article Conduit article data.
	 */
	private function assign_category( $post_id, $article ) {
		$category_id = 0;

		if ( ! empty( $article['collection'] ) ) {
			$collection_name = sanitize_text_field( $article['collection'] );
			$term            = get_term_by( 'name', $collection_name, 'category' );

			if ( $term ) {
				$category_id = $term->term_id;
			} else {
				$new_term = wp_insert_term( $collection_name, 'category' );
				if ( ! is_wp_error( $new_term ) ) {
					$category_id = $new_term['term_id'];
				}
			}
		}

		if ( ! $category_id ) {
			$category_id = (int) get_option( 'conduit_default_cat', 0 );
		}

		if ( $category_id ) {
			wp_set_post_categories( $post_id, array( $category_id ) );
		}
	}

	/**
	 * Download a remote image and set it as the post's featured image.
	 *
	 * Skips if the post already has a featured image with the same URL
	 * stored in attachment meta.
	 *
	 * @param int    $post_id  Post ID.
	 * @param string $image_url Remote image URL.
	 * @param string $title     Fallback title for the attachment.
	 */
	private function set_featured_image( $post_id, $image_url, $title = '' ) {
		$image_url = esc_url_raw( $image_url );
		if ( empty( $image_url ) ) {
			return;
		}

		// Skip if the current thumbnail already matches.
		$current_thumb = get_post_thumbnail_id( $post_id );
		if ( $current_thumb ) {
			$existing_url = get_post_meta( $current_thumb, '_conduit_source_url', true );
			if ( $existing_url === $image_url ) {
				return;
			}
		}

		// Require media handling functions.
		if ( ! function_exists( 'media_sideload_image' ) ) {
			require_once ABSPATH . 'wp-admin/includes/media.php';
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/image.php';
		}

		$attachment_id = media_sideload_image( $image_url, $post_id, $title, 'id' );

		if ( ! is_wp_error( $attachment_id ) ) {
			set_post_thumbnail( $post_id, $attachment_id );
			update_post_meta( $attachment_id, '_conduit_source_url', $image_url );
		}
	}

	/**
	 * Set SEO meta fields for Yoast SEO and RankMath if either is active.
	 *
	 * @param int   $post_id Post ID.
	 * @param array $article Conduit article data.
	 */
	private function set_seo_meta( $post_id, $article ) {
		$meta_title       = isset( $article['meta_title'] ) ? sanitize_text_field( $article['meta_title'] ) : '';
		$meta_description = isset( $article['meta_description'] ) ? sanitize_text_field( $article['meta_description'] ) : '';

		if ( empty( $meta_title ) && empty( $meta_description ) ) {
			return;
		}

		// Yoast SEO.
		if ( defined( 'WPSEO_VERSION' ) ) {
			if ( $meta_title ) {
				update_post_meta( $post_id, '_yoast_wpseo_title', $meta_title );
			}
			if ( $meta_description ) {
				update_post_meta( $post_id, '_yoast_wpseo_metadesc', $meta_description );
			}
		}

		// RankMath.
		if ( class_exists( 'RankMath' ) ) {
			if ( $meta_title ) {
				update_post_meta( $post_id, 'rank_math_title', $meta_title );
			}
			if ( $meta_description ) {
				update_post_meta( $post_id, 'rank_math_description', $meta_description );
			}
		}
	}

	/**
	 * Convert a Markdown string to HTML.
	 *
	 * Handles headings, bold, italic, links, images, unordered/ordered
	 * lists, blockquotes, inline code, fenced code blocks, horizontal
	 * rules, and paragraphs.
	 *
	 * @param string $markdown Raw markdown text.
	 * @return string Converted HTML.
	 */
	private function markdown_to_html( $markdown ) {
		if ( empty( $markdown ) ) {
			return '';
		}

		$html = $markdown;

		// Fenced code blocks (```...```).
		$html = preg_replace( '/```(\w*)\n([\s\S]*?)```/m', '<pre><code class="language-$1">$2</code></pre>', $html );

		// Headings (# through ######).
		$html = preg_replace( '/^######\s+(.+)$/m', '<h6>$1</h6>', $html );
		$html = preg_replace( '/^#####\s+(.+)$/m', '<h5>$1</h5>', $html );
		$html = preg_replace( '/^####\s+(.+)$/m', '<h4>$1</h4>', $html );
		$html = preg_replace( '/^###\s+(.+)$/m', '<h3>$1</h3>', $html );
		$html = preg_replace( '/^##\s+(.+)$/m', '<h2>$1</h2>', $html );
		$html = preg_replace( '/^#\s+(.+)$/m', '<h1>$1</h1>', $html );

		// Bold and italic.
		$html = preg_replace( '/\*\*\*(.+?)\*\*\*/', '<strong><em>$1</em></strong>', $html );
		$html = preg_replace( '/\*\*(.+?)\*\*/', '<strong>$1</strong>', $html );
		$html = preg_replace( '/\*(.+?)\*/', '<em>$1</em>', $html );

		// Inline code.
		$html = preg_replace( '/`([^`]+)`/', '<code>$1</code>', $html );

		// Images.
		$html = preg_replace( '/!\[([^\]]*)\]\(([^)]+)\)/', '<img src="$2" alt="$1" />', $html );

		// Links.
		$html = preg_replace( '/\[([^\]]+)\]\(([^)]+)\)/', '<a href="$2">$1</a>', $html );

		// Blockquotes.
		$html = preg_replace( '/^>\s+(.+)$/m', '<blockquote>$1</blockquote>', $html );

		// Horizontal rules.
		$html = preg_replace( '/^---$/m', '<hr />', $html );

		// Unordered lists.
		$html = preg_replace( '/^[\-\*]\s+(.+)$/m', '<li>$1</li>', $html );
		$html = preg_replace( '/(<li>.*<\/li>\n?)+/', '<ul>$0</ul>', $html );

		// Ordered lists.
		$html = preg_replace( '/^\d+\.\s+(.+)$/m', '<li>$1</li>', $html );

		// Paragraphs: wrap remaining lines that are not already wrapped in block elements.
		$lines  = explode( "\n", $html );
		$output = array();
		$block_tags = array( '<h', '<ul', '<ol', '<li', '<pre', '<blockquote', '<hr', '</ul', '</ol' );

		foreach ( $lines as $line ) {
			$trimmed = trim( $line );
			if ( '' === $trimmed ) {
				$output[] = '';
				continue;
			}

			$is_block = false;
			foreach ( $block_tags as $tag ) {
				if ( 0 === strpos( $trimmed, $tag ) ) {
					$is_block = true;
					break;
				}
			}

			$output[] = $is_block ? $trimmed : '<p>' . $trimmed . '</p>';
		}

		$html = implode( "\n", $output );

		// Clean up empty paragraphs.
		$html = preg_replace( '/<p>\s*<\/p>/', '', $html );

		return $html;
	}

	/**
	 * Append an entry to the sync log stored in wp_options.
	 *
	 * Keeps only the most recent LOG_MAX_ENTRIES entries.
	 *
	 * @param string $message Log message.
	 * @param string $type    Entry type (success|error|skipped).
	 */
	private function log_entry( $message, $type = 'info' ) {
		$log = get_option( 'conduit_sync_log', array() );
		if ( ! is_array( $log ) ) {
			$log = array();
		}

		array_unshift(
			$log,
			array(
				'time'    => current_time( 'mysql' ),
				'message' => sanitize_text_field( $message ),
				'type'    => sanitize_key( $type ),
			)
		);

		// Trim to max entries.
		$log = array_slice( $log, 0, self::LOG_MAX_ENTRIES );

		update_option( 'conduit_sync_log', $log );
	}
}
