// HTTPS proxy for RNZ National's live MP3 stream.
// RNZ only serves the stream over HTTP, so browsers block it as mixed content
// on HTTPS sites. This edge function fetches the upstream and streams the
// bytes back over HTTPS with the correct audio/mpeg content-type.
//
// Source: https://www.rnz.co.nz/listen/audiohelp

import { corsHeaders } from '../_shared/cors.ts'

const UPSTREAM = 'http://radionz-ice.streamguys.com/national.mp3'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const upstream = await fetch(UPSTREAM, {
      headers: {
        'User-Agent': 'cyclone-vaianu/1.0 (rnz-stream-proxy)',
      },
    })

    if (!upstream.ok || !upstream.body) {
      return new Response('Upstream unavailable', {
        status: 502,
        headers: corsHeaders,
      })
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Accept-Ranges': 'none',
      },
    })
  } catch (err) {
    console.error('rnz-stream proxy error', err)
    return new Response('Proxy error', { status: 500, headers: corsHeaders })
  }
})
