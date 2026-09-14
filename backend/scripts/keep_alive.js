/**
 * ChipMate Render Keep-Alive Daemon
 * 
 * Pings https://chipmate-h96z.onrender.com/health every 10 minutes
 * between 4:00 PM IST (16:00) and 6:00 AM IST (06:00) to keep the Render
 * free-tier container active during card playing hours.
 * 
 * Usage:
 *   npm run keepalive              (runs continuously in the background)
 *   npm run keepalive -- --once    (pings once and exits)
 *   npm run keepalive -- --force   (pings immediately even outside active window)
 */

const TARGET_URL = process.env.RENDER_HEALTH_URL || 'https://chipmate-h96z.onrender.com/health';
const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const args = process.argv.slice(2);
const runOnce = args.includes('--once');
const forceRun = args.includes('--force');

function getIstTime(date = new Date()) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 5.5);
}

function isInActiveWindow(date = new Date()) {
  if (forceRun) return true;
  const ist = getIstTime(date);
  const hour = ist.getHours();
  const min = ist.getMinutes();
  const totalMin = hour * 60 + min;

  // Active from 16:00 (4:00 PM) to 06:00 (6:00 AM) IST
  // 16 * 60 = 960 min, 6 * 60 = 360 min
  return totalMin >= 960 || totalMin <= 360;
}

function formatTime(date = new Date()) {
  const ist = getIstTime(date);
  return ist.toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST';
}

async function pingBackend() {
  const now = new Date();
  const timeStr = formatTime(now);

  if (!isInActiveWindow(now)) {
    console.log(`[${timeStr}] ⏸️ Outside active window (4:00 PM - 6:00 AM IST). Skipping ping.`);
    return;
  }

  const start = Date.now();
  try {
    const response = await fetch(TARGET_URL, {
      headers: { 'User-Agent': 'ChipMate-KeepAlive/1.0' },
      signal: AbortSignal.timeout(15000)
    });

    const elapsed = Date.now() - start;
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log(`[${timeStr}] 🟢 Ping successful: HTTP ${response.status} (${elapsed}ms) - Version: ${data.version || 'unknown'}`);
    } else {
      console.warn(`[${timeStr}] ⚠️ Ping returned status HTTP ${response.status} (${elapsed}ms)`);
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`[${timeStr}] 🔴 Ping failed after ${elapsed}ms: ${err.message}`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('🚀 ChipMate Render Keep-Alive Service');
  console.log(`🎯 Target: ${TARGET_URL}`);
  console.log('⏰ Active Hours: 4:00 PM to 6:00 AM IST (every 10 min)');
  console.log(`🕒 Current Time: ${formatTime()}`);
  console.log('====================================================');

  if (runOnce) {
    await pingBackend();
    return;
  }

  // Initial ping on start
  await pingBackend();

  // Recurring interval
  const intervalId = setInterval(pingBackend, INTERVAL_MS);

  const shutdown = () => {
    console.log('\n🛑 Stopping keep-alive service...');
    clearInterval(intervalId);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(console.error);
