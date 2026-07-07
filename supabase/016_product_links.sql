-- ============================================================
-- PDP URLs moved from /jersey/[slug] to /product/[slug].
-- Full-page loads are covered by a 308 redirect in next.config,
-- but client-side <Link> navigations bypass config redirects —
-- so rewrite the hrefs stored in seeded homepage content too.
-- ============================================================

update site_content
set data = replace(data::text, '"/jersey/', '"/product/')::jsonb
where data::text like '%"/jersey/%';
