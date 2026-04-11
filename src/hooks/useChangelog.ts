import { useQuery } from '@tanstack/react-query'

// Public unauthenticated access is rate-limited to 60/hr/IP. We cache
// aggressively to stay well under that — one fetch every 15 minutes is
// plenty for a changelog view.
const REPO = 'adam91holt/cyclone.vaianu'
const ENDPOINT = `https://api.github.com/repos/${REPO}/commits?per_page=100`

export interface ChangelogEntry {
  sha: string
  shortSha: string
  subject: string
  body: string
  dateIso: string
  authorName: string
  authorAvatarUrl: string | null
  htmlUrl: string
}

interface GitHubCommit {
  sha: string
  html_url: string
  commit: {
    author: { name: string; email: string; date: string } | null
    message: string
  }
  author: { login: string; avatar_url: string } | null
}

function stripCoAuthor(message: string): { subject: string; body: string } {
  // Drop the Co-Authored-By trailer and empty lines at the end
  const lines = message.split('\n')
  const filtered = lines.filter((l) => !l.toLowerCase().startsWith('co-authored-by:'))
  const subject = filtered[0] ?? ''
  // Body = everything after the blank line following the subject
  const bodyLines: string[] = []
  let started = false
  for (let i = 1; i < filtered.length; i++) {
    if (!started && filtered[i].trim() === '') continue
    started = true
    bodyLines.push(filtered[i])
  }
  // Trim trailing empty lines
  while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === '') {
    bodyLines.pop()
  }
  return { subject, body: bodyLines.join('\n') }
}

export function useChangelog() {
  return useQuery({
    queryKey: ['changelog', REPO],
    queryFn: async (): Promise<ChangelogEntry[]> => {
      const res = await fetch(ENDPOINT, {
        headers: { Accept: 'application/vnd.github+json' },
      })
      if (!res.ok) {
        throw new Error(`GitHub API ${res.status}`)
      }
      const raw = (await res.json()) as GitHubCommit[]
      return raw.map((c) => {
        const { subject, body } = stripCoAuthor(c.commit.message)
        return {
          sha: c.sha,
          shortSha: c.sha.slice(0, 7),
          subject,
          body,
          dateIso: c.commit.author?.date ?? new Date().toISOString(),
          authorName: c.commit.author?.name ?? 'Unknown',
          authorAvatarUrl: c.author?.avatar_url ?? null,
          htmlUrl: c.html_url,
        }
      })
    },
    staleTime: 15 * 60 * 1000, // 15 min
    gcTime: 60 * 60 * 1000, // 1 hr
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
