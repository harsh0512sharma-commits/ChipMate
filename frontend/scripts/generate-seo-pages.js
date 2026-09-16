const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const DOMAIN = 'https://chipmate.online';
const TODAY = new Date().toISOString().split('T')[0];

// Shared styles for SEO pages
const sharedStyles = `
  :root {
    --cm-bg: #080C16;
    --cm-surface: #0F172A;
    --cm-card: #111827;
    --cm-card-border: #1F2937;
    --cm-primary: #EA580C;
    --cm-primary-hover: #F97316;
    --cm-emerald: #10B981;
    --cm-text: #F8FAFC;
    --cm-text-secondary: #94A3B8;
    --cm-text-muted: #64748B;
    --cm-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: var(--cm-bg);
    color: var(--cm-text);
    font-family: var(--cm-font);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; text-decoration: none; }
  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(8, 12, 22, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--cm-card-border);
    padding: 14px 24px;
  }
  .header-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: -0.5px;
  }
  .logo-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
  }
  .logo-orange { color: var(--cm-primary); }
  .nav-links {
    display: flex;
    gap: 20px;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
    color: var(--cm-text-secondary);
  }
  .nav-links a:hover { color: var(--cm-text); }
  .cta-btn-sm {
    background: linear-gradient(135deg, #EA580C, #F97316);
    color: #FFF !important;
    font-weight: 800;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    transition: transform 0.15s ease, opacity 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .cta-btn-sm:hover { opacity: 0.95; transform: translateY(-1px); }
  .container {
    max-width: 860px;
    margin: 0 auto;
    padding: 40px 20px 80px 20px;
  }
  .breadcrumbs {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: var(--cm-text-muted);
    margin-bottom: 24px;
    align-items: center;
  }
  .breadcrumbs a { color: var(--cm-text-secondary); }
  .breadcrumbs a:hover { color: var(--cm-text); }
  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--cm-primary);
    background: rgba(234, 88, 12, 0.12);
    border: 1px solid rgba(234, 88, 12, 0.25);
    padding: 5px 12px;
    border-radius: 20px;
    margin-bottom: 16px;
  }
  h1 {
    font-size: 34px;
    font-weight: 800;
    line-height: 1.25;
    letter-spacing: -0.5px;
    margin-bottom: 16px;
    color: var(--cm-text);
  }
  .lead-p {
    font-size: 17px;
    color: var(--cm-text-secondary);
    line-height: 1.7;
    margin-bottom: 32px;
  }
  h2 {
    font-size: 22px;
    font-weight: 700;
    margin-top: 36px;
    margin-bottom: 16px;
    color: var(--cm-text);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 8px;
  }
  h3 {
    font-size: 17px;
    font-weight: 700;
    margin-top: 24px;
    margin-bottom: 10px;
    color: var(--cm-text);
  }
  p {
    font-size: 15px;
    color: #CBD5E1;
    line-height: 1.75;
    margin-bottom: 18px;
  }
  ul, ol {
    margin-left: 24px;
    margin-bottom: 24px;
    color: #CBD5E1;
    font-size: 15px;
    line-height: 1.8;
  }
  li { margin-bottom: 8px; }
  strong { color: var(--cm-text); font-weight: 700; }
  code {
    background: #1E293B;
    color: #38BDF8;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13.5px;
    font-family: monospace;
  }
  .card-box {
    background: var(--cm-surface);
    border: 1px solid var(--cm-card-border);
    border-radius: 14px;
    padding: 24px;
    margin: 28px 0;
  }
  .formula-box {
    background: rgba(16, 185, 129, 0.06);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 12px;
    padding: 20px;
    margin: 24px 0;
  }
  .formula-title {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--cm-emerald);
    margin-bottom: 8px;
  }
  .formula-math {
    font-size: 18px;
    font-weight: 700;
    color: #FFF;
    font-family: monospace;
  }
  .cta-banner {
    background: linear-gradient(135deg, rgba(234, 88, 12, 0.15), rgba(15, 23, 42, 0.9));
    border: 1px solid rgba(234, 88, 12, 0.4);
    border-radius: 16px;
    padding: 36px 28px;
    text-align: center;
    margin: 48px 0;
  }
  .cta-banner h3 {
    font-size: 24px;
    margin-bottom: 12px;
    color: #FFF;
  }
  .cta-banner p {
    color: var(--cm-text-secondary);
    max-width: 580px;
    margin: 0 auto 24px auto;
    font-size: 15px;
  }
  .cta-btn-lg {
    background: linear-gradient(135deg, #EA580C, #F97316);
    color: #FFF !important;
    font-weight: 800;
    font-size: 16px;
    padding: 14px 32px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 20px rgba(234, 88, 12, 0.4);
  }
  .cta-btn-lg:hover { opacity: 0.92; }
  .table-wrap {
    overflow-x: auto;
    margin: 24px 0;
    border: 1px solid var(--cm-card-border);
    border-radius: 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    text-align: left;
  }
  th {
    background: #1E293B;
    color: var(--cm-text);
    padding: 12px 16px;
    font-weight: 700;
  }
  td {
    padding: 12px 16px;
    border-top: 1px solid var(--cm-card-border);
    color: #CBD5E1;
  }
  tr:nth-child(even) { background: rgba(255, 255, 255, 0.02); }
  .related-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin: 24px 0;
  }
  .related-card {
    background: var(--cm-card);
    border: 1px solid var(--cm-card-border);
    border-radius: 12px;
    padding: 18px;
    display: block;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }
  .related-card:hover {
    border-color: var(--cm-primary);
    transform: translateY(-2px);
  }
  .related-card-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--cm-text);
    margin-bottom: 6px;
  }
  .related-card-desc {
    font-size: 13px;
    color: var(--cm-text-secondary);
    line-height: 1.5;
  }
  footer {
    background: #050811;
    border-top: 1px solid var(--cm-card-border);
    padding: 48px 24px 32px 24px;
    color: var(--cm-text-muted);
    font-size: 13px;
  }
  .footer-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 32px;
    margin-bottom: 40px;
  }
  .footer-col h4 {
    color: var(--cm-text);
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .footer-col ul { list-style: none; margin: 0; padding: 0; }
  .footer-col li { margin-bottom: 8px; }
  .footer-col a { color: var(--cm-text-secondary); }
  .footer-col a:hover { color: var(--cm-text); }
  .footer-bottom {
    max-width: 1100px;
    margin: 0 auto;
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .hrvs-credit {
    font-size: 13px;
    color: var(--cm-text-secondary);
    margin-bottom: 6px;
  }
  .hrvs-credit strong { color: var(--cm-text); font-weight: 800; }
  @media (max-width: 640px) {
    h1 { font-size: 26px; }
    .header-inner { flex-direction: row; }
    .nav-links a.hide-mobile { display: none; }
    .container { padding: 24px 16px 60px 16px; }
  }
`;

function renderPageLayout({
  title,
  description,
  canonicalPath,
  h1,
  tagPill,
  leadP,
  breadcrumbs,
  bodyHtml,
  jsonLd
}) {
  const canonicalUrl = `${DOMAIN}${canonicalPath}`;
  const breadcrumbItems = [
    { name: 'Home', url: `${DOMAIN}/` },
    ...breadcrumbs
  ];

  const breadcrumbsHtml = breadcrumbItems
    .map((b, i) => {
      if (i === breadcrumbItems.length - 1) {
        return `<span>${b.name}</span>`;
      }
      return `<a href="${b.url}">${b.name}</a> <span>&gt;</span>`;
    })
    .join(' ');

  const fullJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${DOMAIN}/#org`,
        'name': 'ChipMate by HRVS',
        'url': `${DOMAIN}/`,
        'logo': `${DOMAIN}/icon.png`
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumbs`,
        'itemListElement': breadcrumbItems.map((b, i) => ({
          '@type': 'ListItem',
          'position': i + 1,
          'name': b.name,
          'item': b.url
        }))
      },
      ...(Array.isArray(jsonLd) ? jsonLd : (jsonLd ? [jsonLd] : []))
    ]
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
  <title>${title}</title>
  <meta name="title" content="${title}" />
  <meta name="description" content="${description}" />
  <meta name="author" content="HRVS" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="ChipMate" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${DOMAIN}/icon.png" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${canonicalUrl}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${DOMAIN}/icon.png" />

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <style>${sharedStyles}</style>

  <script type="application/ld+json">
  ${JSON.stringify(fullJsonLd, null, 2)}
  </script>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="/" class="logo">
        <img src="/icon.png" alt="ChipMate Logo" class="logo-icon" />
        <span><span class="logo-orange">CHIP</span>MATE</span>
      </a>
      <nav class="nav-links">
        <a href="/poker-settlement-calculator" class="hide-mobile">Poker</a>
        <a href="/teen-patti-settlement-calculator" class="hide-mobile">Teen Patti</a>
        <a href="/guides/how-to-settle-a-home-poker-game" class="hide-mobile">Guides</a>
        <a href="/faq">FAQ</a>
        <a href="/" class="cta-btn-sm">Launch App &rarr;</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <div class="breadcrumbs">
      ${breadcrumbsHtml}
    </div>

    ${tagPill ? `<div class="tag-pill">${tagPill}</div>` : ''}

    <h1>${h1}</h1>

    <p class="lead-p">${leadP}</p>

    ${bodyHtml}

    <div class="cta-banner">
      <h3>Ready to settle your home game in 30 seconds?</h3>
      <p>Stop arguing over missing chips and confusing late-night math. ChipMate gives you real-time chip counts, zero-sum verification, and 1-tap WhatsApp debt settlement.</p>
      <a href="/" class="cta-btn-lg">Start Free Game on ChipMate &rarr;</a>
    </div>
  </main>

  <footer>
    <div class="footer-inner">
      <div class="footer-col">
        <h4>Settlement Calculators</h4>
        <ul>
          <li><a href="/teen-patti-settlement-calculator">Teen Patti Settlement Calculator</a></li>
          <li><a href="/poker-settlement-calculator">Poker Settlement Calculator</a></li>
          <li><a href="/poker-chip-calculator">Poker Chip Calculator</a></li>
          <li><a href="/teen-patti-chip-calculator">Teen Patti Chip Calculator</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Home Game Guides</h4>
        <ul>
          <li><a href="/guides/how-to-calculate-teen-patti-settlement">How to Calculate Teen Patti Settlement</a></li>
          <li><a href="/guides/how-to-calculate-poker-settlement">How to Calculate Poker Settlement</a></li>
          <li><a href="/guides/how-poker-chips-buy-ins-and-settlement-work">How Poker Chips & Buy-ins Work</a></li>
          <li><a href="/guides/how-to-track-borrowed-poker-chips">How to Track Borrowed Chips</a></li>
          <li><a href="/guides/how-to-settle-a-home-poker-game">How to Settle a Home Poker Game</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Product & Company</h4>
        <ul>
          <li><a href="/">ChipMate Home</a></li>
          <li><a href="/how-it-works">How It Works</a></li>
          <li><a href="/faq">Frequently Asked Questions</a></li>
          <li><a href="/about">About ChipMate</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="hrvs-credit">Made with <span style="color: #ef4444;">❤️</span> by <strong>HRVS</strong></p>
      <p>&copy; 2026 ChipMate. All rights reserved. 100% Free Home Game Chip Ledger.</p>
    </div>
  </footer>
</body>
</html>`;
}

// -------------------------------------------------------------
// PAGES DEFINITIONS
// -------------------------------------------------------------

const pages = [
  // 1. Teen Patti Settlement Calculator
  {
    route: '/teen-patti-settlement-calculator',
    title: 'Teen Patti Settlement Calculator – ChipMate',
    description: 'Free online Teen Patti settlement calculator. Track player buy-ins, boot amounts, chaal rebuys, borrowed chips, and automate final zero-sum payouts for Diwali and home games.',
    tagPill: 'Teen Patti Engine',
    h1: 'Teen Patti Settlement Calculator & Chip Ledger',
    leadP: 'Track boots, continuous chaal rebuys, borrowed chips, and automate final zero-sum payouts for your Diwali and home Teen Patti games without spreadsheets or arguments.',
    breadcrumbs: [{ name: 'Teen Patti Settlement Calculator', url: `${DOMAIN}/teen-patti-settlement-calculator` }],
    jsonLd: {
      '@type': 'SoftwareApplication',
      'name': 'ChipMate Teen Patti Settlement Calculator',
      'applicationCategory': 'GameApplication, UtilityApplication',
      'operatingSystem': 'All (Web, iOS, Android)',
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      'description': 'Free online Teen Patti settlement calculator and chip ledger for home games.'
    },
    bodyHtml: `
      <h2>What Is a Teen Patti Settlement Calculator?</h2>
      <p>A Teen Patti settlement calculator is a financial accounting tool designed specifically for Indian 3-Patti card games. Unlike Western poker which typically features structured, fixed-depth stacks, home Teen Patti games involve high frequency, rapid rebuys, variable boot sizes, blind vs. seen betting rounds, and casual side loans between friends.</p>
      <p>At the end of a long session, hosts are usually left with crumpled sheets of paper, unrecorded chaal loans, and players arguing about who owes what. A dedicated Teen Patti calculator solves this by maintaining a strict, continuous balance ledger throughout the game and computing net payouts automatically.</p>

      <h2>How the Teen Patti Settlement Formula Works</h2>
      <p>Every home game operates under the fundamental mathematical rule of a <strong>zero-sum system</strong>: chips cannot appear from thin air, and total buy-in cash in the bank must exactly equal the total cash value of chips remaining on the table.</p>

      <div class="formula-box">
        <div class="formula-title">The Zero-Sum Invariant Formula</div>
        <div class="formula-math">Net Player Profit = Final Chips Value - Total Buy-Ins</div>
        <div class="formula-math" style="margin-top: 6px; font-size: 15px; color: #10B981;">&Sigma; (All Net Profits) &equiv; 0</div>
      </div>

      <p>If the sum of all net profits is greater than zero, someone bought in without paying or extra chips were introduced. If the sum is less than zero, chips were lost under the sofa or a player cashed out early without recording it. ChipMate automatically alerts the host if the table fails this verification.</p>

      <h2>Real-World Example: 5-Player Home Game Settlement</h2>
      <p>Consider a typical ₹500 boot Teen Patti game with 5 friends:</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Initial Buy-In</th>
              <th>Rebuys</th>
              <th>Total Invested</th>
              <th>Final Chips</th>
              <th>Net Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Amit</strong></td>
              <td>₹1,000</td>
              <td>₹1,000</td>
              <td>₹2,000</td>
              <td>₹4,500</td>
              <td style="color: #10B981; font-weight: 700;">+₹2,500 (Winner)</td>
            </tr>
            <tr>
              <td><strong>Rahul</strong></td>
              <td>₹1,000</td>
              <td>₹0</td>
              <td>₹1,000</td>
              <td>₹1,800</td>
              <td style="color: #10B981; font-weight: 700;">+₹800 (Winner)</td>
            </tr>
            <tr>
              <td><strong>Priya</strong></td>
              <td>₹1,000</td>
              <td>₹1,000</td>
              <td>₹2,000</td>
              <td>₹1,200</td>
              <td style="color: #EF4444; font-weight: 700;">-₹800 (Loser)</td>
            </tr>
            <tr>
              <td><strong>Vikram</strong></td>
              <td>₹1,000</td>
              <td>₹2,000</td>
              <td>₹3,000</td>
              <td>₹1,500</td>
              <td style="color: #EF4444; font-weight: 700;">-₹1,500 (Loser)</td>
            </tr>
            <tr>
              <td><strong>Sneha</strong></td>
              <td>₹1,000</td>
              <td>₹0</td>
              <td>₹1,000</td>
              <td>₹0</td>
              <td style="color: #EF4444; font-weight: 700;">-₹1,000 (Loser)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-box">
        <h3>How ChipMate Minimizes Payouts:</h3>
        <p>In traditional manual settlements, 3 losers would make messy cross-payments to 2 winners. ChipMate resolves this into the <strong>absolute minimum peer-to-peer transfers</strong>:</p>
        <ul style="margin-bottom: 0;">
          <li><strong>Vikram pays Amit:</strong> ₹1,500 via UPI</li>
          <li><strong>Sneha pays Amit:</strong> ₹1,000 via UPI</li>
          <li><strong>Priya pays Rahul:</strong> ₹800 via UPI</li>
        </ul>
        <p style="margin-top: 12px; margin-bottom: 0; font-size: 13px; color: #10B981;">Total transactions reduced from 6 messy transfers down to just 3 direct payments!</p>
      </div>

      <h2>Common Teen Patti Settlement Mistakes to Avoid</h2>
      <ul>
        <li><strong>Informal Chip Borrowing:</strong> Never let a player hand 200 chips directly from their stack to a neighbor during a heated chaal. All rebuys must be issued by the table banker so the ledger stays accurate.</li>
        <li><strong>Unrecorded Cash-Outs:</strong> When a player leaves early, record their cash-out immediately before they walk out the door.</li>
        <li><strong>Circular UPI Payments:</strong> Never let Player A pay Player B, who then pays Player C. Use ChipMate's debt minimizer to collapse circular debts into single payments.</li>
      </ul>

      <h2>Related Calculators & Guides</h2>
      <div class="related-grid">
        <a href="/teen-patti-chip-calculator" class="related-card">
          <div class="related-card-title">Teen Patti Chip Calculator</div>
          <div class="related-card-desc">Calculate starting stacks, chip colors, and boot denominations for your chip tray.</div>
        </a>
        <a href="/guides/how-to-calculate-teen-patti-settlement" class="related-card">
          <div class="related-card-title">How to Settle Teen Patti Step-by-Step</div>
          <div class="related-card-desc">Full comprehensive tutorial on boot pots, side lending, and payment dispatch.</div>
        </a>
      </div>
    `
  },

  // 2. Poker Settlement Calculator
  {
    route: '/poker-settlement-calculator',
    title: 'Poker Settlement Calculator – ChipMate',
    description: 'Free Texas Hold\'em poker settlement calculator. Eliminate post-game spreadsheet math, resolve multiple buy-ins, and minimize player debts into the fewest peer-to-peer transfers.',
    tagPill: 'Poker Settlement Engine',
    h1: 'Poker Settlement Calculator for Home Games',
    leadP: 'Eliminate post-game spreadsheet math. Record multiple buy-ins, track physical chip stacks, and minimize player debts into the fewest peer-to-peer payments for Texas Hold\'em cash games.',
    breadcrumbs: [{ name: 'Poker Settlement Calculator', url: `${DOMAIN}/poker-settlement-calculator` }],
    jsonLd: {
      '@type': 'SoftwareApplication',
      'name': 'ChipMate Poker Settlement Calculator',
      'applicationCategory': 'GameApplication, UtilityApplication',
      'operatingSystem': 'All (Web, iOS, Android)',
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      'description': 'Free home poker settlement calculator and debt minimizer.'
    },
    bodyHtml: `
      <h2>Why You Need a Dedicated Poker Settlement Calculator</h2>
      <p>Every home poker game host knows the dreaded "post-game spreadsheet hour." After four hours of intense Texas Hold'em, the cards are folded, but the headache begins: players bought in twice, someone borrowed ₹1,000 from the host, two players cashed out early, and the remaining chips don't match the money in the pot.</p>
      <p>A poker settlement calculator solves this by managing table transactions in real time and automatically executing a mathematical debt minimization algorithm when the session concludes.</p>

      <h2>How Poker Settlement Works</h2>
      <p>At the end of a cash game, each player's net position is calculated:</p>

      <div class="formula-box">
        <div class="formula-title">Net Poker P&amp;L Formula</div>
        <div class="formula-math">Net Winnings = Cash Out Chips - (Initial Buy-in + Total Rebuys)</div>
      </div>

      <p>Players with positive balances are creditors (winners). Players with negative balances are debtors (losers). Because home poker is a zero-sum game, the total money owed by losers strictly equals the total money won by winners.</p>

      <h2>The Debt Minimization Algorithm Explained</h2>
      <p>In a 7-player game where 4 players lost and 3 players won, there are theoretically 12 different payment relationships. If everyone tries to pay the host or pay each other arbitrarily, people end up making multiple transactions, paying the wrong amount, or forgetting who they paid.</p>
      <p>ChipMate applies a greedy bipartite graph resolution algorithm: it pairs the largest debtor with the largest creditor first. This reduces the number of payments from $N \\times (N-1)$ down to at most $N - 1$. In almost all home games, 6 or 7 players can settle all accounts in just 3 or 4 simple direct payments.</p>

      <h2>Key Features of ChipMate's Poker Calculator</h2>
      <ul>
        <li><strong>Physical Chip Set Bank Vault:</strong> Assign chip values (e.g. White ₹10, Red ₹50, Green ₹200) and track chip tray inventory to prevent unauthorized chips from entering play.</li>
        <li><strong>Live Spectator Link:</strong> Friends can follow the live chip ledger on their own phones without installing an app or registering an account.</li>
        <li><strong>Zero-Sum Validation:</strong> Protects the host by verifying that total buy-in cash equals total chip value before allowing the game to finalize.</li>
        <li><strong>1-Tap WhatsApp Summary:</strong> Formats player balances and settlement instructions into a clean message with UPI IDs for instant group chat distribution.</li>
      </ul>

      <h2>Related Calculators & Guides</h2>
      <div class="related-grid">
        <a href="/poker-chip-calculator" class="related-card">
          <div class="related-card-title">Poker Chip Calculator</div>
          <div class="related-card-desc">Calculate starting stacks, chip counts, and blind distributions for home poker.</div>
        </a>
        <a href="/guides/how-to-settle-a-home-poker-game" class="related-card">
          <div class="related-card-title">How to Settle a Home Poker Game</div>
          <div class="related-card-desc">The complete host checklist for wrapping up cash games without disputes.</div>
        </a>
      </div>
    `
  },

  // 3. Poker Chip Calculator
  {
    route: '/poker-chip-calculator',
    title: 'Poker Chip Calculator & Bank Vault – ChipMate',
    description: 'Calculate poker chip values, denominations, starting stack distributions, and physical chip bank limits for Texas Hold\'em home games. 100% free poker tool.',
    tagPill: 'Chip Set Management',
    h1: 'Poker Chip Calculator & Denomination Manager',
    leadP: 'Calculate poker chip values, starting stack distributions, and physical chip bank limits for your home Texas Hold\'em games. Prevent ghost chips and table imbalances.',
    breadcrumbs: [{ name: 'Poker Chip Calculator', url: `${DOMAIN}/poker-chip-calculator` }],
    jsonLd: {
      '@type': 'SoftwareApplication',
      'name': 'ChipMate Poker Chip Calculator',
      'applicationCategory': 'GameApplication, UtilityApplication',
      'operatingSystem': 'All (Web, iOS, Android)',
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      'description': 'Free poker chip calculator, denomination distribution manager, and bank vault tracker.'
    },
    bodyHtml: `
      <h2>The Importance of Proper Poker Chip Distribution</h2>
      <p>One of the most common issues during home Texas Hold'em games is running out of low-value chips during blind rounds or having too many small chips cluttering the table during large river pots. A poker chip calculator helps the host balance chip values, allocate starting stacks, and maintain a physical bank vault.</p>

      <h2>Standard Chip Denominations & Colors</h2>
      <p>Most standard 300-piece and 500-piece poker sets come in five classic colors. Here are the recommended configurations for home cash games:</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Chip Color</th>
              <th>Standard Count (500 Set)</th>
              <th>Low Stakes (₹10/₹20 Blinds)</th>
              <th>Mid Stakes (₹25/₹50 Blinds)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>White</strong></td>
              <td>150 chips</td>
              <td>₹10</td>
              <td>₹25</td>
            </tr>
            <tr>
              <td><strong>Red</strong></td>
              <td>150 chips</td>
              <td>₹50</td>
              <td>₹100</td>
            </tr>
            <tr>
              <td><strong>Blue</strong></td>
              <td>100 chips</td>
              <td>₹100</td>
              <td>₹250</td>
            </tr>
            <tr>
              <td><strong>Green</strong></td>
              <td>50 chips</td>
              <td>₹500</td>
              <td>₹500</td>
            </tr>
            <tr>
              <td><strong>Black</strong></td>
              <td>50 chips</td>
              <td>₹1,000</td>
              <td>₹1,000 / ₹2,000</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>How to Calculate a 50-BB Starting Stack</h2>
      <p>For a ₹10/₹20 blind cash game with a ₹1,000 buy-in (50 Big Blinds), an optimal starting stack provides enough chips for small blind increments while keeping the physical stack manageable:</p>
      <ul>
        <li><strong>10 &times; White (₹10)</strong> = ₹100</li>
        <li><strong>10 &times; Red (₹50)</strong> = ₹500</li>
        <li><strong>4 &times; Blue (₹100)</strong> = ₹400</li>
        <li><strong>Total Stack:</strong> 24 physical chips = ₹1,000</li>
      </ul>

      <h2>The "Bank Vault" Principle: Preventing Ghost Chips</h2>
      <p>In home games with multiple rebuys, hosts often reach into the chip case without keeping track of how many chips are left. If someone accidentally drops an extra black chip onto the felt or a player pulls an unbought chip out of their pocket, the table becomes inflated.</p>
      <p>ChipMate features a built-in <strong>Physical Chip Bank Vault</strong>: you set your physical set count (e.g. 100 reds, 50 greens), and the app will warn you before issuing a rebuy if that color is exhausted in the box.</p>

      <h2>Related Calculators & Guides</h2>
      <div class="related-grid">
        <a href="/poker-settlement-calculator" class="related-card">
          <div class="related-card-title">Poker Settlement Calculator</div>
          <div class="related-card-desc">Calculate end-of-game net balances and minimize peer-to-peer transfers.</div>
        </a>
        <a href="/guides/how-poker-chips-buy-ins-and-settlement-work" class="related-card">
          <div class="related-card-title">How Poker Chips & Buy-ins Work</div>
          <div class="related-card-desc">A complete host guide to starting stacks, chip counts, and cash-outs.</div>
        </a>
      </div>
    `
  },

  // 4. Teen Patti Chip Calculator
  {
    route: '/teen-patti-chip-calculator',
    title: 'Teen Patti Chip Calculator – ChipMate',
    description: 'Calculate Teen Patti chip values, boot stack distributions, blind limits, and rebuy values for Indian 3-Patti home games. Fast, accurate, and free.',
    tagPill: '3-Patti Chip Manager',
    h1: 'Teen Patti Chip Calculator & Boot Manager',
    leadP: 'Calculate Teen Patti chip values, boot stack distributions, and fast rebuy packs for 3-Patti home games. Keep blind rounds flowing smoothly without chip shortages.',
    breadcrumbs: [{ name: 'Teen Patti Chip Calculator', url: `${DOMAIN}/teen-patti-chip-calculator` }],
    jsonLd: {
      '@type': 'SoftwareApplication',
      'name': 'ChipMate Teen Patti Chip Calculator',
      'applicationCategory': 'GameApplication, UtilityApplication',
      'operatingSystem': 'All (Web, iOS, Android)',
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      'description': 'Free Teen Patti chip calculator and boot stack distribution engine.'
    },
    bodyHtml: `
      <h2>Why Teen Patti Requires Unique Chip Calculations</h2>
      <p>Teen Patti has a very different chip velocity than Texas Hold'em. In poker, only two players post blinds each hand. In Teen Patti, <strong>every single player posts a boot amount before every hand</strong>. In a 7-player game, 7 chips enter the pot on every deal, meaning small-denomination chips circulate at triple the speed of a poker table.</p>
      <p>If you don't calculate your chip tray properly, the table will run out of small chips within 45 minutes, stalling the game while people exchange bills or make change.</p>

      <h2>Recommended Chip Structure for Home 3-Patti</h2>
      <p>For a standard Diwali or weekend game with ₹100 or ₹200 buy-in packs and ₹5 or ₹10 boots:</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Chip Color</th>
              <th>Recommended Value</th>
              <th>Purpose in Teen Patti</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>White</strong></td>
              <td>₹5 or ₹10</td>
              <td>Boot Pot & Blind Bets (Keep at least 150 chips in bank)</td>
            </tr>
            <tr>
              <td><strong>Red</strong></td>
              <td>₹25 or ₹50</td>
              <td>Chaal & Double Chaal rounds</td>
            </tr>
            <tr>
              <td><strong>Blue / Green</strong></td>
              <td>₹100 or ₹200</td>
              <td>Sideshows, Deep Showdowns & Large Pots</td>
            </tr>
            <tr>
              <td><strong>Black</strong></td>
              <td>₹500</td>
              <td>High Rebuy Reserves (kept in the Host Bank)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Standardized Rebuy Packs for Fast Play</h2>
      <p>To avoid pausing the game every time a player busts out, hosts should pre-bundle standardized <strong>Rebuy Packs</strong>. When a player says "rebuy", the host taps 1 button in ChipMate and hands them an identical pre-counted bundle:</p>
      <ul>
        <li><strong>Standard ₹500 Pack:</strong> 10 Whites (₹100) + 8 Reds (₹200) + 2 Blues (₹200).</li>
        <li><strong>Fast Rebuy in ChipMate:</strong> The host logs the buy-in with one click, updating the player's balance without disrupting the current hand.</li>
      </ul>

      <h2>Related Calculators & Guides</h2>
      <div class="related-grid">
        <a href="/teen-patti-settlement-calculator" class="related-card">
          <div class="related-card-title">Teen Patti Settlement Calculator</div>
          <div class="related-card-desc">Calculate end-of-night net profit/loss and minimize UPI payments.</div>
        </a>
        <a href="/guides/how-to-calculate-teen-patti-settlement" class="related-card">
          <div class="related-card-title">How to Calculate Teen Patti Settlement</div>
          <div class="related-card-desc">Step-by-step accounting guide for boots, rebuys, and zero-sum payouts.</div>
        </a>
      </div>
    `
  },

  // 5. How It Works
  {
    route: '/how-it-works',
    title: 'How It Works – ChipMate Poker & Teen Patti Ledger',
    description: 'Learn how ChipMate simplifies home poker and Teen Patti games in 4 easy steps: table creation, real-time buy-in tracking, zero-sum verification, and 1-tap WhatsApp settlements.',
    tagPill: 'Product Architecture',
    h1: 'How ChipMate Works: The Zero-Sum Game Ledger',
    leadP: 'From opening the chip case to the final WhatsApp payment summary, discover how ChipMate manages home poker and Teen Patti game accounting with zero friction.',
    breadcrumbs: [{ name: 'How It Works', url: `${DOMAIN}/how-it-works` }],
    jsonLd: {
      '@type': 'SoftwareApplication',
      'name': 'ChipMate Architecture & Workflow',
      'description': 'Four-step zero-sum chip ledger and debt settlement workflow for card games.'
    },
    bodyHtml: `
      <h2>The 4-Step Home Game Lifecycle</h2>
      <div class="card-box">
        <h3>Step 1: Create Table & Set Chip Rules</h3>
        <p>Choose between Texas Hold'em Poker or Teen Patti. Choose either Equal Chip Value mode (e.g. 1 chip = ₹1) or Custom Colored Denominations (White, Red, Blue, Green, Black). Set your physical chip bank vault limits so you never issue more chips than you own.</p>
      </div>

      <div class="card-box">
        <h3>Step 2: Seat Players & Track Real-Time Rebuys</h3>
        <p>Seat players with 1 tap. Friends don't need to create accounts or install an app—they can participate as saved guests. Share your table's live spectator link so everyone can follow player stacks and rebuys on their own mobile devices.</p>
      </div>

      <div class="card-box">
        <h3>Step 3: Cash Out & Zero-Sum Invariant Check</h3>
        <p>When the cards are folded, count each player's remaining chips. ChipMate's engine verifies that <code>Total Buy-Ins == Total Cash-Outs</code>. If there is any discrepancy, the app alerts the host before any player pays or leaves.</p>
      </div>

      <div class="card-box">
        <h3>Step 4: 1-Tap Debt Minimization & WhatsApp Dispatch</h3>
        <p>Instead of 8 players exchanging 12 confusing cross-payments, our bipartite settling algorithm computes the fewest direct payments possible. Generate a polished WhatsApp message containing exact amounts and player UPI IDs with 1 tap.</p>
      </div>

      <h2>The Zero-Sum Mathematical Guarantee</h2>
      <p>ChipMate is built on the mathematical principle that closed home card games are strictly zero-sum. The platform never holds player funds, handles financial transactions, or facilitates online gambling. It functions solely as a mathematical auditor and record-keeper for your private table.</p>

      <h2>Explore ChipMate Calculators</h2>
      <div class="related-grid">
        <a href="/poker-settlement-calculator" class="related-card">
          <div class="related-card-title">Poker Settlement Calculator &rarr;</div>
          <div class="related-card-desc">Resolve Texas Hold'em cash games into minimal peer-to-peer transfers.</div>
        </a>
        <a href="/teen-patti-settlement-calculator" class="related-card">
          <div class="related-card-title">Teen Patti Settlement Calculator &rarr;</div>
          <div class="related-card-desc">Automate Diwali and weekend 3-Patti payouts and chaal rebuys.</div>
        </a>
      </div>
    `
  },

  // 6. FAQ
  {
    route: '/faq',
    title: 'ChipMate FAQ – Poker & Teen Patti Settlement Questions',
    description: 'Frequently asked questions about ChipMate. Learn how our free poker and Teen Patti chip calculator, debt minimizer, spectator links, and guest tracking work.',
    tagPill: 'Questions & Answers',
    h1: 'Frequently Asked Questions About ChipMate',
    leadP: 'Find clear, accurate answers about how ChipMate tracks chips, buy-ins, borrowed credit, and debt minimization for home Poker and Teen Patti games.',
    breadcrumbs: [{ name: 'FAQ', url: `${DOMAIN}/faq` }],
    jsonLd: {
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'What is ChipMate?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'ChipMate is a free web and mobile application designed for home game hosts. It acts as a real-time chip ledger, bank vault tracker, and debt settlement engine for Texas Hold\'em Poker and Teen Patti.'
          }
        },
        {
          '@type': 'Question',
          'name': 'What is a poker settlement calculator?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'A poker settlement calculator is a tool that computes each player\'s net winnings (Cash Out minus Buy-ins) and applies debt minimization algorithms to reduce the total number of peer-to-peer payments needed to settle the table.'
          }
        },
        {
          '@type': 'Question',
          'name': 'How does a Teen Patti settlement calculator work?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'It tracks boot amounts, rebuys, and player cash-outs during 3-Patti home games, verifying that total money put into the game equals total chip values, then calculating direct UPI payments between losers and winners.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Can ChipMate track player buy-ins and rebuys?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes! Hosts can add initial buy-ins and unlimited rebuys for any player in real time with a single tap.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Can ChipMate track borrowed chips?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes. ChipMate allows recording host credit rebuys and tracks player-to-player balances so loans are settled accurately without corrupting table balance.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Can multiple players view the same game live?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes! The host can share a read-only live spectator link so players can follow stacks, rebuys, and balances in real time on their own phones.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Does ChipMate support both Poker and Teen Patti?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes! ChipMate natively supports Texas Hold\'em poker (with blinds and chip set denominations) and Teen Patti (with boot amounts and fast-paced rebuys).'
          }
        },
        {
          '@type': 'Question',
          'name': 'Is ChipMate free?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes, ChipMate is 100% free forever for all players and hosts, with no paid tiers, subscriptions, or intrusive third-party ads.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Do guest players need to install an app or register?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'No. Only the host needs an account to create the table. Friends can be added as guests in 1 tap and can view the game via web browser without downloading anything.'
          }
        }
      ]
    },
    bodyHtml: `
      <h2>Core Application Questions</h2>

      <div class="card-box">
        <h3>What is ChipMate?</h3>
        <p>ChipMate is a free web and mobile application that acts as an authoritative chip ledger, bank vault, and debt settlement engine for home poker and Teen Patti games. Developed by HRVS, it replaces spreadsheets and napkins with real-time tracking and automated zero-sum math.</p>
      </div>

      <div class="card-box">
        <h3>What is a poker settlement calculator?</h3>
        <p>A poker settlement calculator is an automated accounting engine that tracks player buy-ins, rebuys, and cash-outs. At game conclusion, it computes net profit/loss and minimizes the number of peer-to-peer transfers needed so players don't have to make multiple messy payments.</p>
      </div>

      <div class="card-box">
        <h3>How does a Teen Patti settlement calculator work?</h3>
        <p>It records all boot money, chaal rebuys, and chip distributions throughout a 3-Patti session. At cash-out, it verifies that total money bought matches total chips collected and generates a clean UPI settlement summary.</p>
      </div>

      <div class="card-box">
        <h3>Can ChipMate track player buy-ins and rebuys?</h3>
        <p>Yes. The host can record initial buy-ins and subsequent rebuys in 1 tap. Players can also be seated with custom chip denominations or equal-value chips.</p>
      </div>

      <div class="card-box">
        <h3>Can ChipMate track borrowed chips?</h3>
        <p>Yes. ChipMate accommodates host credit and player loans, ensuring that any borrowed chips are accounted for in the central bank without artificially inflating table totals.</p>
      </div>

      <div class="card-box">
        <h3>Can multiple players use the same game?</h3>
        <p>Yes! Every table has a live spectator link. Any player or bystander can open the link in their browser to view the real-time chip counts and ledger without logging in.</p>
      </div>

      <div class="card-box">
        <h3>Does ChipMate support Poker and Teen Patti?</h3>
        <p>Yes. Both games are fully supported with dedicated table modes, chip denomination settings, and settlement formatting tailored to each game's rules.</p>
      </div>

      <div class="card-box">
        <h3>Is ChipMate free to use?</h3>
        <p>Yes, ChipMate is 100% free forever for private home game hosts and players. There are no fees, subscriptions, or intrusive third-party ads.</p>
      </div>

      <div class="card-box">
        <h3>Do all players need an account?</h3>
        <p>No! Only the table host needs an account to create and manage the game. Other players can be added as saved guests with a single tap.</p>
      </div>
    `
  },

  // 7. About
  {
    route: '/about',
    title: 'About ChipMate – Zero-Sum Card Ledger by HRVS',
    description: 'Learn about ChipMate, developed by HRVS. Built to eliminate home poker disputes, messy spreadsheets, and confusing debt settlements with mathematical precision.',
    tagPill: 'Company & Mission',
    h1: 'About ChipMate: Built for Fair, Transparent Home Games',
    leadP: 'ChipMate was engineered by HRVS with a single purpose: to eliminate end-of-night spreadsheet arguments, missing chips, and chaotic settlement math for home card games.',
    breadcrumbs: [{ name: 'About', url: `${DOMAIN}/about` }],
    jsonLd: {
      '@type': 'Organization',
      'name': 'HRVS',
      'url': `${DOMAIN}`,
      'logo': `${DOMAIN}/icon.png`,
      'description': 'Creator and maintainer of ChipMate, the free zero-sum chip ledger for home poker and Teen Patti games.'
    },
    bodyHtml: `
      <h2>The Story Behind ChipMate</h2>
      <p>If you've ever hosted a Texas Hold'em poker night or a festive Diwali Teen Patti session, you know how the night ends. The cards are great, the snacks are finished, but at 3:00 AM someone is staring at a phone calculator, someone's UPI isn't working, two people bought in on credit, and the total money collected doesn't match the chips on the table.</p>
      <p>We built ChipMate to solve this problem once and for all. By combining real-time ledger accounting with a strict mathematical <strong>zero-sum verification engine</strong> and greedy debt minimization, ChipMate turns 30 minutes of frustrating math into a 10-second WhatsApp message.</p>

      <h2>Our Core Principles</h2>
      <ul>
        <li><strong>100% Free Forever:</strong> We believe home game hosts shouldn't have to pay a subscription or watch video ads just to settle chips with their friends.</li>
        <li><strong>Zero Real-Money Gambling:</strong> ChipMate does not process payments, does not hold player funds, and does not operate an online gambling platform. We are strictly a scorekeeping and mathematical ledger utility.</li>
        <li><strong>Zero Friction for Guests:</strong> We believe asking 8 friends to download an app and create accounts just to play cards is bad design. On ChipMate, only the host needs an account; everyone else joins as a guest.</li>
        <li><strong>Engineered by HRVS:</strong> Maintained with high engineering standards, instant cloud sync, offline resiliency, and responsive performance on every device.</li>
      </ul>

      <h2>Get in Touch</h2>
      <p>Have suggestions for new features, feedback on our settlement engine, or questions about using ChipMate for your private club? Contact HRVS directly at <a href="mailto:support@chipmate.online" style="color: #EA580C; font-weight: 700;">support@chipmate.online</a>.</p>
    `
  },

  // 8. Guide: How to Calculate Teen Patti Settlement
  {
    route: '/guides/how-to-calculate-teen-patti-settlement',
    title: 'How to Calculate Teen Patti Settlement: Step-by-Step Guide – ChipMate',
    description: 'Learn how to calculate Teen Patti settlements for home games. Complete formula for boot pots, rebuys, net profit/loss, and minimizing multi-player cash transfers.',
    tagPill: 'Settlement Strategy Guide',
    h1: 'How to Calculate Teen Patti Settlement for Home Games',
    leadP: 'A complete host walkthrough on calculating boot amounts, managing fast chaal rebuys, verifying the zero-sum balance, and minimizing multi-player payments.',
    breadcrumbs: [
      { name: 'Guides', url: `${DOMAIN}/guides/how-to-settle-a-home-poker-game` },
      { name: 'Calculate Teen Patti Settlement', url: `${DOMAIN}/guides/how-to-calculate-teen-patti-settlement` }
    ],
    jsonLd: {
      '@type': 'Article',
      'headline': 'How to Calculate Teen Patti Settlement for Home Games',
      'description': 'A complete host walkthrough on calculating boot amounts, managing rebuys, and settling Teen Patti games.',
      'author': { '@type': 'Organization', 'name': 'HRVS' },
      'publisher': { '@type': 'Organization', 'name': 'ChipMate by HRVS', 'logo': { '@type': 'ImageObject', 'url': `${DOMAIN}/icon.png` } },
      'datePublished': '2026-09-16'
    },
    bodyHtml: `
      <h2>1. The Anatomy of Teen Patti Home Accounting</h2>
      <p>In a home Teen Patti session, chip movements happen rapidly. Unlike tournament poker where players start with a stack and play until elimination, Teen Patti cash games involve:</p>
      <ul>
        <li><strong>Mandatory Boots:</strong> Every seated player contributes a fixed boot to the center pot before cards are dealt.</li>
        <li><strong>Variable Betting (Blind vs. Seen):</strong> Blind players bet standard amounts; seen players bet double.</li>
        <li><strong>Frequent Rebuys:</strong> Players who bust out re-enter immediately by taking another chip pack.</li>
        <li><strong>Early Departures:</strong> Guests who need to leave at midnight cash out while others continue playing.</li>
      </ul>

      <h2>2. Step-by-Step Settlement Formula</h2>
      <p>To calculate settlements accurately without relying on memory, the host must enforce two simple rules:</p>
      <ol>
        <li><strong>Central Bank Rule:</strong> All chips must be issued by the designated banker. No player may sell chips directly from their stack to another player.</li>
        <li><strong>Net P&amp;L Calculation:</strong> At the end of the session, each player's net balance is:</li>
      </ol>

      <div class="formula-box">
        <div class="formula-title">Net Profit/Loss Formula</div>
        <div class="formula-math">Net Balance = (Final Chip Count &times; Chip Value) - Total Buy-In Amount</div>
      </div>

      <p>A positive result is a <strong>profit</strong> (money to receive). A negative result is a <strong>loss</strong> (money to pay).</p>

      <h2>3. Handling Early Cash-Outs</h2>
      <p>If a player leaves early, the host must record their final chip count and subtract their buy-ins immediately. Their net profit or loss must be locked in the ledger before their chips are returned to the central bank. If the host forgets this, the table will be out of balance at 3 AM.</p>

      <h2>4. Minimizing Payment Confusion</h2>
      <p>Rather than having every loser pay every winner, use ChipMate's settlement algorithm. It groups all players into debtors and creditors and pairs them to minimize the number of UPI payments. One player sends one payment, and everyone is settled.</p>

      <div class="card-box">
        <h3>Use the Free Online Calculator</h3>
        <p>Skip manual calculations. Use our dedicated <a href="/teen-patti-settlement-calculator" style="color: #EA580C; font-weight: 700;">Teen Patti Settlement Calculator</a> to manage your game in real time.</p>
      </div>
    `
  },

  // 9. Guide: How to Calculate Poker Settlement
  {
    route: '/guides/how-to-calculate-poker-settlement',
    title: 'How to Calculate Poker Settlement & Net Winnings – ChipMate',
    description: 'Step-by-step guide on calculating home poker game settlements, player balances, and minimizing payment debts after Texas Hold\'em cash games.',
    tagPill: 'Poker Host Guide',
    h1: 'How to Calculate Poker Settlement & Net Player Winnings',
    leadP: 'Learn how to calculate player balances, reconcile cash-out stacks with buy-ins, and use debt minimization algorithms to settle Texas Hold\'em cash games effortlessly.',
    breadcrumbs: [
      { name: 'Guides', url: `${DOMAIN}/guides/how-to-settle-a-home-poker-game` },
      { name: 'Calculate Poker Settlement', url: `${DOMAIN}/guides/how-to-calculate-poker-settlement` }
    ],
    jsonLd: {
      '@type': 'Article',
      'headline': 'How to Calculate Poker Settlement & Net Player Winnings',
      'description': 'Learn how to calculate player balances and minimize debt payments after Texas Hold\'em home games.',
      'author': { '@type': 'Organization', 'name': 'HRVS' },
      'publisher': { '@type': 'Organization', 'name': 'ChipMate by HRVS', 'logo': { '@type': 'ImageObject', 'url': `${DOMAIN}/icon.png` } },
      'datePublished': '2026-09-16'
    },
    bodyHtml: `
      <h2>1. The Fundamentals of Cash Game Accounting</h2>
      <p>In a home poker cash game, chips have direct monetary value. When the host calls "last hand," the accounting process begins:</p>
      <ul>
        <li><strong>Step A:</strong> Count each player's physical chip stack by denomination.</li>
        <li><strong>Step B:</strong> Multiply each chip count by its assigned value to determine total cash-out value.</li>
        <li><strong>Step C:</strong> Subtract total buy-in cash (initial buy-in + rebuys) from cash-out value.</li>
      </ul>

      <h2>2. Verifying the Zero-Sum Condition</h2>
      <p>Before any money changes hands, verify the golden rule of poker math:</p>

      <div class="formula-box">
        <div class="formula-title">Table Balance Invariant</div>
        <div class="formula-math">&Sigma; (All Buy-In Money) &equiv; &Sigma; (All Cash-Out Chip Values)</div>
      </div>

      <p>If there is an imbalance, common causes include:</p>
      <ul>
        <li>A rebuy that was handed to a player but never written down.</li>
        <li>Chips knocked off the table onto the floor.</li>
        <li>A player miscounting their stack during cash-out.</li>
      </ul>

      <h2>3. Resolving Debts with Greedy Bipartite Matching</h2>
      <p>Consider a game with 4 players: Alice (+₹3,000), Bob (+₹1,000), Charlie (-₹2,500), and David (-₹1,500). Instead of Charlie paying Alice ₹2,500, David paying Alice ₹500, and David paying Bob ₹1,000, ChipMate's algorithm computes:</p>
      <ul>
        <li>Charlie pays Alice ₹2,500</li>
        <li>David pays Bob ₹1,000</li>
        <li>David pays Alice ₹500</li>
      </ul>
      <p>This ensures everyone receives exactly their winnings with zero intermediate accounts.</p>

      <div class="card-box">
        <h3>Launch the Free Poker Calculator</h3>
        <p>Save 20 minutes of math at the end of every game. Try our <a href="/poker-settlement-calculator" style="color: #EA580C; font-weight: 700;">Poker Settlement Calculator</a> right in your browser.</p>
      </div>
    `
  },

  // 10. Guide: How Poker Chips, Buy-ins, and Settlements Work
  {
    route: '/guides/how-poker-chips-buy-ins-and-settlement-work',
    title: 'How Poker Chips, Buy-ins, and Settlements Work – ChipMate',
    description: 'Complete beginner to host guide on how poker chips work: assign chip values, structure starting stacks, track buy-ins and rebuys, and cash out cleanly.',
    tagPill: 'Beginner to Host',
    h1: 'How Poker Chips, Buy-ins, and Settlements Work: A Host\'s Guide',
    leadP: 'Everything you need to know about setting chip values, structuring starting stacks, issuing rebuys, and managing post-game settlements for private poker games.',
    breadcrumbs: [
      { name: 'Guides', url: `${DOMAIN}/guides/how-to-settle-a-home-poker-game` },
      { name: 'How Poker Chips & Buy-ins Work', url: `${DOMAIN}/guides/how-poker-chips-buy-ins-and-settlement-work` }
    ],
    jsonLd: {
      '@type': 'Article',
      'headline': 'How Poker Chips, Buy-ins, and Settlements Work: A Host\'s Guide',
      'description': 'Comprehensive guide on assigning chip values, starting stacks, and cash-outs for home poker games.',
      'author': { '@type': 'Organization', 'name': 'HRVS' },
      'publisher': { '@type': 'Organization', 'name': 'ChipMate by HRVS', 'logo': { '@type': 'ImageObject', 'url': `${DOMAIN}/icon.png` } },
      'datePublished': '2026-09-16'
    },
    bodyHtml: `
      <h2>1. Why Use Chips Instead of Cash on the Table?</h2>
      <p>Using physical poker chips instead of cash bills provides three key advantages: it standardizes bet sizes, makes pot counting fast and visual, and protects paper currency from beverage spills during home games.</p>

      <h2>2. Assigning Chip Values for Your Game Stakes</h2>
      <p>Always align your chip denominations with your blind structure. If your small blind is ₹10 and big blind is ₹25, you need plenty of ₹10 and ₹25 chips so players don't struggle to make change.</p>
      <ul>
        <li><strong>White (Lowest):</strong> Used for Small Blind and post-flop betting increments.</li>
        <li><strong>Red (Middle):</strong> Standard betting chip; represents 2 to 4 big blinds.</li>
        <li><strong>Green / Blue (Large):</strong> Used for pre-flop raises and all-in pots.</li>
        <li><strong>Black (Vault Reserve):</strong> Kept in the host's tray for ₹1,000+ rebuys.</li>
      </ul>

      <h2>3. The Buy-in & Rebuy Process</h2>
      <p>When a player arrives, they exchange cash or UPI for a starting stack. The host records the buy-in in ChipMate. If a player loses their stack, they can request a "rebuy." The host issues a fresh bundle of chips from the bank vault and records the rebuy in the ledger.</p>

      <h2>4. The Cash-Out Protocol</h2>
      <p>When a player is ready to leave, they stack their chips by color. The host verifies the count, converts the chips back into cash value, and records the cash-out in the ledger. ChipMate guarantees that all buy-ins and cash-outs match perfectly before the final summary is generated.</p>
    `
  },

  // 11. Guide: How to Track Borrowed Poker Chips
  {
    route: '/guides/how-to-track-borrowed-poker-chips',
    title: 'How to Track Borrowed Poker Chips & Player Loans – ChipMate',
    description: 'Learn how to track borrowed chips, host credit, and player-to-player loans in home poker and Teen Patti games without losing money or causing arguments.',
    tagPill: 'Host Best Practices',
    h1: 'How to Track Borrowed Poker Chips in Home Games',
    leadP: 'Prevent table inflation and heated financial arguments. Discover the right way to manage credit buy-ins, player-to-player chip loans, and settlement repayments.',
    breadcrumbs: [
      { name: 'Guides', url: `${DOMAIN}/guides/how-to-settle-a-home-poker-game` },
      { name: 'Track Borrowed Chips', url: `${DOMAIN}/guides/how-to-track-borrowed-poker-chips` }
    ],
    jsonLd: {
      '@type': 'Article',
      'headline': 'How to Track Borrowed Poker Chips in Home Games',
      'description': 'How to handle host credit, borrowed chips, and player loans cleanly in private card games.',
      'author': { '@type': 'Organization', 'name': 'HRVS' },
      'publisher': { '@type': 'Organization', 'name': 'ChipMate by HRVS', 'logo': { '@type': 'ImageObject', 'url': `${DOMAIN}/icon.png` } },
      'datePublished': '2026-09-16'
    },
    bodyHtml: `
      <h2>1. The #1 Cause of Home Game Disputes: Borrowed Chips</h2>
      <p>Almost every disputed home game settlement traces back to casual borrowing: "Hey, give me 500 chips for this hand, I'll pay you back," or "Host, give me another buy-in on credit, I'll UPI you tomorrow."</p>
      <p>When these agreements happen informally, three major problems arise:</p>
      <ol>
        <li>The table total no longer balances with the money paid into the pot.</li>
        <li>The lender and borrower disagree on whether the loan was in cash or chips.</li>
        <li>If the borrower loses everything, the host is left trying to collect from the wrong person.</li>
      </ol>

      <h2>2. The Two Safe Methods for Handling Loans</h2>
      <h3>Method A: Host Credit (Recommended)</h3>
      <p>If a player wants to play on credit, the host records a formal buy-in under that player's name in ChipMate, marked as credit. The chips come directly from the bank vault. At the end of the night, ChipMate's settlement summary includes the borrowed amount in that player's final net debt.</p>

      <h3>Method B: Direct Player-to-Player Stack Transfer</h3>
      <p>If Player A lends chips directly to Player B from their own active stack, <strong>no new chips are added to the table</strong>. However, the host must record this in the ledger so that Player B's final cash-out reflects the debt repayment to Player A automatically.</p>

      <h2>3. Golden Rules for Table Hosts</h2>
      <ul>
        <li>Never allow chips from an external set to be introduced as a "loan."</li>
        <li>Always confirm credit buy-ins aloud before handing over chips.</li>
        <li>Use ChipMate's live spectator view so every player can see their recorded buy-in balance on their own phone throughout the night.</li>
      </ul>
    `
  },

  // 12. Guide: How to Settle a Home Poker Game
  {
    route: '/guides/how-to-settle-a-home-poker-game',
    title: 'How to Settle a Home Poker Game: Complete Host Checklist – ChipMate',
    description: 'The ultimate checklist for settling home poker games quickly, cleanly, and without arguments. Chip counts, zero-sum verification, and payment dispatch.',
    tagPill: 'The Ultimate Checklist',
    h1: 'How to Settle a Home Poker Game: The Host\'s Complete Checklist',
    leadP: 'Follow this proven 6-step checklist to wrap up your home Texas Hold\'em or Teen Patti cash game in minutes, ensuring zero missing chips and seamless UPI settlements.',
    breadcrumbs: [
      { name: 'Guides', url: `${DOMAIN}/guides/how-to-settle-a-home-poker-game` },
      { name: 'Host Settlement Checklist', url: `${DOMAIN}/guides/how-to-settle-a-home-poker-game` }
    ],
    jsonLd: {
      '@type': 'Article',
      'headline': 'How to Settle a Home Poker Game: The Host\'s Complete Checklist',
      'description': 'The ultimate host checklist for wrapping up home card games cleanly without arguments.',
      'author': { '@type': 'Organization', 'name': 'HRVS' },
      'publisher': { '@type': 'Organization', 'name': 'ChipMate by HRVS', 'logo': { '@type': 'ImageObject', 'url': `${DOMAIN}/icon.png` } },
      'datePublished': '2026-09-16'
    },
    bodyHtml: `
      <h2>1. The 15-Minute Pre-Settlement Warning</h2>
      <p>Never end a game abruptly. Announce "Three more orbits" or "Final hand in 15 minutes." This gives short stacks time to push or prepare their cash-out, and prevents players from complaining that they didn't have time to recover losses.</p>

      <h2>2. Lock the Buy-In Ledger</h2>
      <p>As soon as the final hand is dealt, announce that the bank is closed. No further rebuys or chip exchanges are allowed. Having an open bank while counting chips is the fastest way to create an accounting discrepancy.</p>

      <h2>3. Stack Chips in Clean Denominations</h2>
      <p>Have each player stack their chips in stacks of 10 or 20 by color. This makes verification fast and transparent to everyone at the table.</p>

      <h2>4. Perform the Zero-Sum Invariant Check</h2>
      <p>Enter the chip counts into ChipMate. The engine immediately checks:</p>
      <div class="formula-box">
        <div class="formula-title">Balance Check</div>
        <div class="formula-math">Total Table Chip Value &minus; Total Buy-In Money = ₹0</div>
      </div>
      <p>If the difference is ₹0, your table is in perfect mathematical balance.</p>

      <h2>5. Generate the Debt Minimization Plan</h2>
      <p>Click "Settle Table." ChipMate analyzes all net balances and generates the fewest possible payment instructions (e.g. 3 payments instead of 12).</p>

      <h2>6. Dispatch to WhatsApp & Verify UPI Receipts</h2>
      <p>Tap "Share via WhatsApp" to post the formatted settlement instructions into your group chat. Have players execute their UPI transfers on the spot before leaving the venue.</p>
    `
  }
];

// -------------------------------------------------------------
// 404 PAGE DEFINITION
// -------------------------------------------------------------
function render404Page() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
  <title>Page Not Found (404) – ChipMate</title>
  <meta name="robots" content="noindex, follow" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <style>${sharedStyles}</style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="/" class="logo">
        <img src="/icon.png" alt="ChipMate Logo" class="logo-icon" />
        <span><span class="logo-orange">CHIP</span>MATE</span>
      </a>
      <nav class="nav-links">
        <a href="/">Home</a>
        <a href="/faq">FAQ</a>
        <a href="/" class="cta-btn-sm">Launch App &rarr;</a>
      </nav>
    </div>
  </header>

  <main class="container" style="text-align: center; padding: 80px 20px;">
    <div class="tag-pill" style="margin-bottom: 24px;">404 Error</div>
    <h1 style="font-size: 40px; margin-bottom: 16px;">This Card Has Been Folded</h1>
    <p class="lead-p" style="max-width: 520px; margin: 0 auto 36px auto;">The page you are looking for does not exist or has been moved. Choose an option below to get back in the action:</p>

    <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; margin-bottom: 48px;">
      <a href="/" class="cta-btn-lg">Return to Homepage &rarr;</a>
      <a href="/poker-settlement-calculator" class="cta-btn-sm" style="padding: 14px 24px; font-size: 15px; background: #1E293B; border: 1px solid #334155;">Poker Calculator</a>
      <a href="/teen-patti-settlement-calculator" class="cta-btn-sm" style="padding: 14px 24px; font-size: 15px; background: #1E293B; border: 1px solid #334155;">Teen Patti Calculator</a>
    </div>

    <div class="card-box" style="text-align: left; max-width: 600px; margin: 0 auto;">
      <h3 style="margin-top: 0;">Looking for Game Guides?</h3>
      <ul style="margin-bottom: 0;">
        <li><a href="/guides/how-to-settle-a-home-poker-game" style="color: #38BDF8;">How to Settle a Home Poker Game</a></li>
        <li><a href="/guides/how-to-calculate-teen-patti-settlement" style="color: #38BDF8;">How to Calculate Teen Patti Settlement</a></li>
        <li><a href="/guides/how-to-track-borrowed-poker-chips" style="color: #38BDF8;">How to Track Borrowed Poker Chips</a></li>
        <li><a href="/faq" style="color: #38BDF8;">Frequently Asked Questions</a></li>
      </ul>
    </div>
  </main>

  <footer>
    <div class="footer-bottom" style="border-top: none;">
      <p class="hrvs-credit">Made with <span style="color: #ef4444;">❤️</span> by <strong>HRVS</strong></p>
      <p>&copy; 2026 ChipMate. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
}

// -------------------------------------------------------------
// SITEMAP GENERATOR
// -------------------------------------------------------------
function generateSitemapXml(allRoutes) {
  const urls = allRoutes.map(route => {
    const loc = `${DOMAIN}${route === '/' ? '/' : route}`;
    const priority = route === '/' ? '1.00' : (route.startsWith('/guides/') ? '0.80' : '0.90');
    const changefreq = route === '/' ? 'daily' : 'weekly';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>
`;
}

// -------------------------------------------------------------
// EXECUTE GENERATION
// -------------------------------------------------------------
function run() {
  console.log('--- Generating Production SEO Pages for ChipMate ---');

  const generatedRoutes = ['/'];

  pages.forEach(page => {
    const htmlContent = renderPageLayout({
      title: page.title,
      description: page.description,
      canonicalPath: page.route,
      h1: page.h1,
      tagPill: page.tagPill,
      leadP: page.leadP,
      breadcrumbs: page.breadcrumbs,
      bodyHtml: page.bodyHtml,
      jsonLd: page.jsonLd
    });

    const cleanRoute = page.route.replace(/^\//, ''); // e.g. "teen-patti-settlement-calculator"
    const targetFolder = path.join(PUBLIC_DIR, cleanRoute);
    const targetFolderIndex = path.join(targetFolder, 'index.html');
    const targetHtmlFile = path.join(PUBLIC_DIR, `${cleanRoute}.html`);

    // Ensure folder exists and write index.html
    fs.mkdirSync(targetFolder, { recursive: true });
    fs.writeFileSync(targetFolderIndex, htmlContent, 'utf8');

    // Also write .html file at root for direct clean URL routing
    fs.writeFileSync(targetHtmlFile, htmlContent, 'utf8');

    generatedRoutes.push(page.route);
    console.log(`✓ Generated ${page.route} (folder & .html)`);
  });

  // Write 404.html
  const fourOhFourHtml = render404Page();
  fs.writeFileSync(path.join(PUBLIC_DIR, '404.html'), fourOhFourHtml, 'utf8');
  console.log('✓ Generated 404.html');

  // Write sitemap.xml
  const sitemapXml = generateSitemapXml(generatedRoutes);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
  console.log('✓ Updated sitemap.xml with all 13 public routes');

  console.log('--- All SEO Pages successfully created! ---');
}

run();
