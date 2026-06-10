export type AuditStatus = 'PENDING' | 'CRAWLING' | 'ANALYZING' | 'COMPLETE' | 'FAILED'
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface PageCrawlResult {
  url: string
  statusCode: number
  title?: string
  metaDescription?: string
  h1Tags: string[]
  h2Tags: string[]
  images: ImageData[]
  links: LinkData[]
  hasCanonical: boolean
  canonicalUrl?: string
  isIndexable: boolean
  loadTimeMs?: number
  contentLength?: number
  hasSSL: boolean
  pageText: string
  rawHtml: string
}

export interface ImageData {
  src: string
  alt?: string
  width?: number
  height?: number
}

export interface LinkData {
  href: string
  text: string
  isInternal: boolean
  statusCode?: number
}

export interface AuditFinding {
  category: AuditCategory
  severity: Severity
  title: string
  description: string
  url?: string
  evidence?: string
  fixGuide?: string
  complexity?: 'Low' | 'Medium' | 'High'
  businessImpact?: string
}

export type AuditCategory =
  | 'Site Health'
  | 'Navigation'
  | 'URL Validation'
  | 'Content'
  | 'SEO'
  | 'Accessibility'
  | 'Performance'
  | 'Security'
  | 'Forms & Functionality'

export interface AuditProgress {
  stage: 'idle' | 'crawling' | 'analyzing' | 'complete' | 'failed'
  pagesDiscovered: number
  pagesCrawled: number
  currentUrl?: string
  message: string
  percent: number
}

export interface AuditReport {
  id: string
  url: string
  score: number
  status: AuditStatus
  summary?: string
  crawledPages: number
  totalIssues: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  startedAt: Date
  completedAt?: Date
  findings: AuditFinding[]
  shareLinks?: ShareLinkData[]
}

export interface ShareLinkData {
  id: string
  slug: string
  expiresAt: Date
  createdAt: Date
}

export interface CrawlSummary {
  pages: PageCrawlResult[]
  baseUrl: string
  totalPages: number
  brokenPages: number[]
  devUrlsFound: string[]
}
