-- Contact Backend D1 Database Schema
-- Migration: 0001_init.sql
-- Created: 2024-01-01

-- Submissions table: stores all contact form submissions
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  origin TEXT,
  ip_hash TEXT NOT NULL,
  dedupe_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  moderation_verdict TEXT NOT NULL,
  moderation_reason TEXT,
  github_issue_url TEXT,
  github_status TEXT NOT NULL DEFAULT 'FAIL',
  telegram_status TEXT NOT NULL DEFAULT 'SKIP',
  status TEXT NOT NULL
);

-- Index on dedupe_hash for fast duplicate detection
CREATE INDEX IF NOT EXISTS idx_dedupe_hash ON submissions(dedupe_hash);

-- Index on created_at for TTL queries and cleanup
CREATE INDEX IF NOT EXISTS idx_created_at ON submissions(created_at);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_status ON submissions(status);

-- Compound index for rate limiting queries (ip_hash + created_at)
CREATE INDEX IF NOT EXISTS idx_ip_created ON submissions(ip_hash, created_at);
