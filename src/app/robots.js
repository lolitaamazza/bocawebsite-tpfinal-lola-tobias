const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4950'

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/mis-remeras', '/mi-xi', '/login', '/api/'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
