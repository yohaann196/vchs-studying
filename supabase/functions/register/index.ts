// Supabase Edge Function — rate-limited account registration
// Deno runtime (TypeScript)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Rate-limit tiers ────────────────────────────────────────────────────────
// Evaluated from most-severe to least-severe.
// If `threshold` attempts occur within `windowMs`, block for `blockMs`.
const RATE_TIERS = [
  { windowMs: 24 * 60 * 60_000, threshold: 10, blockMs: 7 * 24 * 60 * 60_000 }, // 10 in 24 h  → 7 days
  { windowMs:  6 * 60 * 60_000, threshold:  7, blockMs:     24 * 60 * 60_000 }, // 7  in  6 h  → 24 hours
  { windowMs:      60 * 60_000, threshold:  5, blockMs:  3 * 60 * 60_000 },      // 5  in  1 h  → 3 hours
  { windowMs:  15 * 60_000,     threshold:  3, blockMs:     45 * 60_000 },        // 3  in 15 m  → 45 minutes
] as const;

// Base cooldown: at most 1 registration per 5 minutes from the same IP.
const BASE_COOLDOWN_MS = 5 * 60_000; // 1 per 5 minutes

// ── Profanity word list ─────────────────────────────────────────────────────
// Checked against a normalized (leetspeak-stripped) version of the username.
const BAD_WORDS: ReadonlySet<string> = new Set([
  // Common profanity
  'fuck', 'fuk', 'fck', 'fucker', 'fucking', 'fucked', 'motherfucker',
  'shit', 'sht', 'bullshit', 'shitty',
  'ass', 'asshole', 'arsehole', 'arse',
  'bitch', 'biatch',
  'cunt',
  'dick', 'dickhead',
  'pussy',
  'cock', 'cocksucker',
  'piss', 'pissed',
  'bastard',
  'damn',
  'crap',
  'prick',
  'twat',
  'wank', 'wanker',
  'bollocks',
  'bugger',
  // Slurs
  'nigger', 'nigga',
  'faggot', 'fagg', 'fag',
  'dyke',
  'tranny',
  'retard', 'retarded',
  'spic', 'spick',
  'kike',
  'chink',
  'gook',
  'wetback',
  'cracker',
  'coon',
  'honky',
  'spook',
  // Sexual
  'porn', 'porno',
  'penis', 'peni',
  'vagina',
  'dildo',
  'cum', 'cumshot',
  'jizz',
  'boobs', 'titties', 'tits',
  'anal',
  'blowjob',
  'handjob',
  'horny',
  'slut',
  'whore',
]);

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise a username for profanity checking (strip leetspeak, underscores, etc.). */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/\+/g, 't')
    .replace(/_/g, '');
}

/** Returns true if the username (after normalisation) contains a bad word. */
function containsBadWord(username: string): boolean {
  const normalized = normalizeName(username);
  for (const word of BAD_WORDS) {
    if (normalized.includes(word)) return true;
  }
  return false;
}

/** Hash an IP address with a per-deployment salt for privacy. */
async function hashIP(ip: string): Promise<string> {
  const salt = Deno.env.get('IP_HASH_SALT') ?? 'vchs-study-default-salt';
  const data = new TextEncoder().encode(ip + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Extract the real client IP from proxy headers. */
function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  );
}

/** Convert seconds to a human-readable duration string. */
function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { username, password } = body as { username?: unknown; password?: unknown };

    // ── Input validation ───────────────────────────────────────────────────

    if (typeof username !== 'string' || username.trim() === '') {
      return new Response(JSON.stringify({ error: 'Username is required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const trimmed = username.trim();

    if (trimmed.length > 20) {
      return new Response(JSON.stringify({ error: 'Username must be 20 characters or fewer.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return new Response(JSON.stringify({ error: 'Username can only contain letters, numbers, and underscores.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (containsBadWord(trimmed)) {
      return new Response(JSON.stringify({ error: 'Username contains inappropriate language.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Rate limiting ──────────────────────────────────────────────────────

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const rawIP = getClientIP(req);
    const ipHash = await hashIP(rawIP);
    const now = Date.now();

    // Look back far enough to cover the longest possible block window.
    const lookbackMs = 8 * 24 * 60 * 60_000;
    const lookbackISO = new Date(now - lookbackMs).toISOString();

    const { data: rows, error: dbErr } = await supabaseAdmin
      .from('registration_attempts')
      .select('created_at')
      .eq('ip_hash', ipHash)
      .gte('created_at', lookbackISO)
      .order('created_at', { ascending: false });

    if (dbErr) {
      console.error('DB error fetching registration attempts:', dbErr);
      return new Response(JSON.stringify({ error: 'Registration service temporarily unavailable.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Timestamps of past attempts, newest first.
    const attemptTs = (rows ?? []).map((r: { created_at: string }) => new Date(r.created_at).getTime());

    // Check progressive rate-limit tiers (most severe first).
    for (const tier of RATE_TIERS) {
      const inWindow = attemptTs.filter(ts => now - ts < tier.windowMs);
      if (inWindow.length >= tier.threshold) {
        // The block is measured from the time of the Nth most-recent attempt in the window.
        const triggerTs = inWindow[tier.threshold - 1];
        const unblockTs = triggerTs + tier.blockMs;
        if (now < unblockTs) {
          const waitSec = Math.ceil((unblockTs - now) / 1000);
          return new Response(JSON.stringify({
            error: `Too many account registrations from this network. Please try again in ${formatWait(waitSec)}.`,
            retryAfter: unblockTs,
          }), {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(waitSec),
            },
          });
        }
      }
    }

    // Base cooldown: 1 per 5 minutes.
    if (attemptTs.length > 0) {
      const nextAllowed = attemptTs[0] + BASE_COOLDOWN_MS;
      if (now < nextAllowed) {
        const waitSec = Math.ceil((nextAllowed - now) / 1000);
        return new Response(JSON.stringify({
          error: `Please wait ${formatWait(waitSec)} before creating another account from this network.`,
          retryAfter: nextAllowed,
        }), {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(waitSec),
          },
        });
      }
    }

    // ── Record the attempt ────────────────────────────────────────────────
    // Insert before creating the account so the slot is consumed even if
    // creation fails, preventing rapid retries on transient errors.

    const { error: insertErr } = await supabaseAdmin
      .from('registration_attempts')
      .insert({ ip_hash: ipHash });

    if (insertErr) {
      // Log but don't block — a logging failure shouldn't prevent registration.
      console.error('Failed to record registration attempt:', insertErr);
    }

    // ── Create the account ────────────────────────────────────────────────

    const email = `${trimmed}@vchs-study.local`;
    const { error: signUpErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { username: trimmed },
      email_confirm: true, // Confirm immediately (no real email is sent for local addresses)
    });

    if (signUpErr) {
      return new Response(JSON.stringify({
        error: signUpErr.message || 'Registration failed. Username may already be taken.',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error in register function:', err);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
