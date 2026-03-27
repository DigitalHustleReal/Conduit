# Conduit CMS WordPress Plugin

Sync content from Conduit CMS to your WordPress site. Publish once, distribute everywhere.

## Installation

### Option 1: Upload ZIP

1. Download or build the plugin as a ZIP (the `conduit-cms/` directory).
2. In WordPress admin go to **Plugins > Add New > Upload Plugin**.
3. Upload the ZIP and click **Install Now**, then **Activate**.

### Option 2: Manual Upload

1. Copy the `conduit-cms/` folder into `wp-content/plugins/` on your server.
2. In WordPress admin go to **Plugins** and activate **Conduit CMS**.

## Configuration

Navigate to **Settings > Conduit CMS** in your WordPress admin.

### Required Settings

| Field | Where to find it |
|-------|-----------------|
| **API URL** | Defaults to `https://conduit-woad.vercel.app/api`. Change only if you self-host. |
| **Workspace ID** | Copy from your Conduit workspace settings page. |
| **API Key** | Generate in Conduit under workspace settings. |

### Optional Settings

| Field | Purpose |
|-------|---------|
| **Webhook Secret** | Shared secret for HMAC-SHA256 verification of incoming webhooks. |
| **Auto-Sync** | Enable/disable scheduled background sync. |
| **Sync Interval** | How often the cron job runs (15 min / 30 min / 1 hr / 6 hr). |
| **Default Post Status** | Whether synced posts are created as Draft or Published. |
| **Default Category** | Fallback category when the Conduit collection has no match. |

## How Sync Works

### Scheduled Sync (Cron)

When auto-sync is enabled, WordPress cron fetches all published articles from Conduit at the configured interval. Each article is created as a new post or updates the existing post matched by the stored Conduit ID.

### Webhook (Real-Time)

For instant sync, add the webhook URL shown on the settings page to your Conduit workspace webhook configuration. Conduit sends a POST request whenever an article is published, updated, unpublished, or deleted.

Supported webhook events:

- `content.published` -- creates or updates the WordPress post
- `content.updated` -- updates the WordPress post
- `content.unpublished` -- sets the WordPress post to draft
- `content.deleted` -- moves the WordPress post to trash

The webhook endpoint is:

```
https://yoursite.com/wp-json/conduit/v1/webhook
```

### Field Mapping

| Conduit Field | WordPress Field |
|--------------|----------------|
| title | post_title |
| body (Markdown) | post_content (converted to HTML) |
| slug | post_name |
| meta_title | Yoast `_yoast_wpseo_title` / RankMath `rank_math_title` |
| meta_description | Yoast `_yoast_wpseo_metadesc` / RankMath `rank_math_description` |
| tags | post tags |
| collection | category (created if it does not exist) |
| featured_image | featured image (downloaded and attached) |
| publish_date | post_date |
| status | post_status (published -> publish, draft -> draft) |

### Conflict Detection

If a synced post is edited in WordPress after the last sync timestamp, the automatic sync will skip it to avoid overwriting local changes. Use the **Sync Now** button on the settings page to force-sync all articles.

## Troubleshooting

### "Connection failed" on Test Connection

- Verify the API URL is correct and reachable from your server.
- Confirm the Workspace ID and API Key are entered correctly.
- Check that your server can make outbound HTTPS requests.

### Webhook not triggering sync

- Ensure the webhook URL is entered correctly in Conduit (including `https://`).
- Verify the Webhook Secret matches between Conduit and WordPress.
- Check your server's error log for 403 responses (signature mismatch).
- Confirm the WordPress REST API is accessible (`/wp-json/` should return JSON).

### Posts created as drafts instead of published

- Check the **Default Post Status** setting.
- If the Conduit article has `status: published`, the post will be set to Publish regardless of the default.

### Featured images not appearing

- Ensure the image URL in Conduit is publicly accessible.
- Check that your server allows `media_sideload_image` (some hosts restrict remote downloads).
- Verify the `wp-content/uploads/` directory is writable.

### Cron not running on schedule

- WordPress cron is triggered by site visits. On low-traffic sites, set up a real cron job:
  ```
  */15 * * * * curl -s https://yoursite.com/wp-cron.php > /dev/null 2>&1
  ```
- Alternatively, use the WP Crontrol plugin to inspect scheduled events.

## Requirements

- WordPress 5.8 or later
- PHP 7.4 or later
- Conduit CMS account with API access
