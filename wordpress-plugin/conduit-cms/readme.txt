=== Conduit CMS ===
Contributors: conduit
Tags: cms, content sync, headless cms, content distribution, publishing
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Sync content from Conduit CMS to WordPress. Publish once, distribute everywhere.

== Description ==

Conduit CMS is an AI-native content operations platform. This plugin connects your WordPress site to Conduit so that articles created in Conduit are automatically published to WordPress.

**Key Features:**

* **One-way sync** -- Content flows from Conduit to WordPress automatically.
* **Webhook support** -- Articles are synced in real time when published or updated in Conduit.
* **Scheduled sync** -- Configurable cron-based sync (every 15 min to 6 hours).
* **Field mapping** -- Title, body (Markdown to HTML), slug, tags, categories, featured image, and publish date are all mapped.
* **SEO meta** -- Automatically sets Yoast SEO and RankMath meta title and description when those plugins are active.
* **Conflict detection** -- Posts edited locally in WordPress are not overwritten unless you force a sync.
* **Sync log** -- View the last 20 sync operations directly in the settings page.

== Installation ==

1. Download the plugin ZIP file.
2. In your WordPress admin, go to **Plugins > Add New > Upload Plugin**.
3. Upload the ZIP file and click **Install Now**.
4. Activate the plugin.
5. Go to **Settings > Conduit CMS** to configure your API credentials.

== Configuration ==

1. Enter your **Conduit API URL** (default is already set).
2. Enter your **Workspace ID** from Conduit.
3. Enter your **API Key** from your Conduit workspace settings.
4. Optionally enter a **Webhook Secret** for real-time sync verification.
5. Enable **Auto-Sync** and choose a sync interval.
6. Choose the default post status and category for synced content.
7. Copy the **Webhook URL** displayed on the settings page and paste it into your Conduit webhook configuration.

== Frequently Asked Questions ==

= Does this sync content from WordPress to Conduit? =

No. This plugin is one-way only: Conduit to WordPress. Content is created and managed in Conduit, then distributed to WordPress.

= What happens if I edit a synced post in WordPress? =

The plugin detects local modifications. If a post was edited in WordPress after the last sync, it will be skipped during automatic sync to avoid overwriting your changes. You can force a sync using the Sync Now button.

= Does it support Gutenberg? =

Yes. Markdown content from Conduit is converted to HTML, which works with both the Classic Editor and Gutenberg.

= Which SEO plugins are supported? =

The plugin sets meta title and description for Yoast SEO and RankMath if either is installed and active.

= What is the webhook URL for? =

The webhook URL enables real-time sync. When you publish or update an article in Conduit, it sends a webhook to your WordPress site, which immediately syncs that specific article. Add the webhook URL in your Conduit workspace settings.

== Changelog ==

= 1.0.0 =
* Initial release.
* One-way content sync from Conduit CMS to WordPress.
* Webhook endpoint for real-time sync.
* WP-Cron scheduled sync with configurable intervals.
* Markdown to HTML conversion.
* Yoast SEO and RankMath meta support.
* Featured image download and attachment.
* Conflict detection for locally modified posts.
* Admin settings page with sync log.

== Upgrade Notice ==

= 1.0.0 =
Initial release of Conduit CMS for WordPress.
