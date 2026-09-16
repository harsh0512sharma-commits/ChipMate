import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions
} from 'react-native';
import {
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  MessageSquare,
  BarChart2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Coins,
  Play,
  RotateCcw
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { ChipMateLogo, ChipMateWordmark } from '../../components/ChipMateBrand';
import { APP_BUILD_VERSION } from '../../version';

interface LandingScreenProps {
  onEnterApp: () => void;
  onOpenSampleLedger?: () => void;
}

const HtmlVideo = 'video' as any;

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onEnterApp,
  onOpenSampleLedger
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const videoRef = useRef<any>(null);

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsVideoPlaying(true);
    }
  };

  const faqs = [
    {
      q: 'Do all my friends need to download an app or create an account?',
      a: 'No! Only the game host needs an account to create and manage the table. Friends can be seated as guests in 1 tap, or they can open your table share link to view the live ledger in their browser without signing up.'
    },
    {
      q: 'How does ChipMate debt minimization work?',
      a: 'Instead of having 6 or 8 players make multiple confusing cross-payments, ChipMate uses a zero-sum debt resolution algorithm to consolidate all balances into the fewest possible direct peer-to-peer transfers.'
    },
    {
      q: 'Does it support physical chip sets and custom denominations?',
      a: 'Yes! You can choose Equal Chip Value mode or Custom Physical Denominations (White, Red, Blue, Green, Black chips). ChipMate tracks physical bank vault limits to ensure you never lend or buy more chips than are physically in the box.'
    },
    {
      q: 'How does Teen Patti mode differ from Poker?',
      a: 'Teen Patti features quick re-buys, flexible cash-outs, and optional uncapped credit lending tailored for fast-paced rounds, while Poker includes structured blinds, chip inventory counters, and deep stack ledger tracking.'
    },
    {
      q: 'What if someone leaves or cashes out mid-game?',
      a: 'Hosts can cash out any player early in 2 taps. Their net profit or loss is instantly calculated and locked into the settlement, while the remaining players continue playing with zero ledger distortion.'
    },
    {
      q: 'Is ChipMate completely free to use?',
      a: 'Yes! ChipMate is 100% free for home games and private poker clubs. There are no fees, subscriptions, or intrusive third-party ads.'
    }
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Sticky Top Navigation Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.topBarInner}>
          <View style={styles.brandRow}>
            <ChipMateLogo size={32} borderRadius={8} />
            <View style={{ marginLeft: 10 }}>
              <ChipMateWordmark size={17} spacing={2.5} />
            </View>
          </View>

          {/* Desktop Nav Links */}
          {isDesktop && (
            <View style={styles.desktopNavLinks}>
              <TouchableOpacity onPress={onEnterApp} activeOpacity={0.7} style={styles.navLinkItem}>
                <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>Features</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onEnterApp} activeOpacity={0.7} style={styles.navLinkItem}>
                <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>How It Works</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onEnterApp} activeOpacity={0.7} style={styles.navLinkItem}>
                <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>Poker vs Teen Patti</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onEnterApp} activeOpacity={0.7} style={styles.navLinkItem}>
                <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>FAQ</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Top Bar Right: Theme Toggle Symbol Only + Action Buttons */}
          <View style={styles.topBarRight}>
            {/* Theme Toggle Button (Symbol Only) */}
            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.themeToggleSymbolBtn,
                {
                  backgroundColor: colors.cardRaised,
                  borderColor: colors.borderDark
                }
              ]}
              activeOpacity={0.75}
              accessibilityLabel={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            >
              {isDark ? (
                <Sun size={17} color="#FBBF24" />
              ) : (
                <Moon size={17} color="#2563EB" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onEnterApp}
              style={[styles.loginBtn, { borderColor: colors.borderSubtle }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.loginBtnText, { color: colors.text }]}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onEnterApp}
              style={[styles.launchAppBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Sparkles size={14} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.launchAppBtnText}>Start Playing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          {/* Eyebrow Pill */}
          <View style={[styles.heroPill, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
            <Sparkles size={13} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.heroPillText, { color: colors.primary }]}>
              THE ZERO-SUM CHIP LEDGER & SETTLEMENT ENGINE
            </Text>
          </View>

          {/* Big Headline */}
          <Text style={[styles.heroHeadline, { color: colors.text }]}>
            Throw away the spreadsheet.{'\n'}
            <Text style={{ color: colors.primary }}>Never argue over chips again.</Text>
          </Text>

          {/* Subtitle */}
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Real-time physical chip ledgers, zero-sum debt minimization, and 1-tap WhatsApp settlements for Texas Hold'em and Teen Patti home games.
          </Text>

          {/* Hero CTAs */}
          <View style={styles.heroCtasRow}>
            <TouchableOpacity
              style={[styles.heroPrimaryCta, { backgroundColor: colors.primary }]}
              onPress={onEnterApp}
              activeOpacity={0.85}
            >
              <Text style={styles.heroPrimaryCtaText}>Start a Free Table</Text>
              <ArrowRight size={17} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            {onOpenSampleLedger && (
              <TouchableOpacity
                style={[styles.heroSecondaryCta, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}
                onPress={onOpenSampleLedger}
                activeOpacity={0.75}
              >
                <Text style={[styles.heroSecondaryCtaText, { color: colors.text }]}>View Live Demo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Trust Badges */}
          <View style={styles.trustBadgesRow}>
            <View style={styles.trustBadgeItem}>
              <CheckCircle2 size={15} color={colors.successText} />
              <Text style={[styles.trustBadgeText, { color: colors.textSecondary }]}>100% Free</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustBadgeItem}>
              <ShieldCheck size={15} color={colors.primary} />
              <Text style={[styles.trustBadgeText, { color: colors.textSecondary }]}>Mathematical Zero-Sum</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustBadgeItem}>
              <Zap size={15} color="#FBBF24" />
              <Text style={[styles.trustBadgeText, { color: colors.textSecondary }]}>Instant WhatsApp Share</Text>
            </View>
          </View>

          {/* HERO VIDEO / MEDIA SHOWCASE */}
          <View style={[styles.videoShowcaseWrapper, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={styles.videoHeaderBar}>
              <View style={styles.macDots}>
                <View style={[styles.macDot, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.macDot, { backgroundColor: '#F59E0B' }]} />
                <View style={[styles.macDot, { backgroundColor: '#10B981' }]} />
              </View>
              <View style={styles.videoTitleWrap}>
                <Text style={[styles.videoTitleText, { color: colors.textSecondary }]}>
                  ChipMate Authoritative Engine Preview
                </Text>
              </View>
              <View style={styles.videoControlsRight}>
                <TouchableOpacity onPress={toggleVideoPlayback} style={styles.videoIconBtn} activeOpacity={0.7}>
                  <Play size={13} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={restartVideo} style={styles.videoIconBtn} activeOpacity={0.7}>
                  <RotateCcw size={13} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Embedded Video Player */}
            <View style={styles.videoPlayerBox}>
              {Platform.OS === 'web' && (
                <HtmlVideo
                  ref={videoRef}
                  src="/splash_video_v2.mp4?v=1.0.22"
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: isDesktop ? 480 : 260,
                    backgroundColor: '#000000',
                    objectFit: 'cover'
                  }}
                />
              )}
            </View>
          </View>
        </View>

        {/* COMPARISON: CHIPMATE VS OTHERS */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>WHY PLAYERS CHOOSE CHIPMATE</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Built specifically for Indian & International Home Games
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Generic trackers only handle basic poker math. ChipMate gives you the full suite of physical chips, Teen Patti, and debt settlement.
          </Text>

          <View style={styles.comparisonGrid}>
            <View style={[styles.compCard, { backgroundColor: colors.card, borderColor: colors.primaryBorder }]}>
              <View style={[styles.compHeader, { backgroundColor: colors.primaryLight }]}>
                <ChipMateLogo size={24} borderRadius={6} />
                <Text style={[styles.compTitle, { color: colors.primary }]}>ChipMate</Text>
              </View>
              <View style={styles.compBody}>
                <View style={styles.compRow}>
                  <CheckCircle2 size={16} color={colors.successText} />
                  <Text style={[styles.compRowText, { color: colors.text }]}>Texas Hold'em & Teen Patti Modes</Text>
                </View>
                <View style={styles.compRow}>
                  <CheckCircle2 size={16} color={colors.successText} />
                  <Text style={[styles.compRowText, { color: colors.text }]}>Physical Chip Denominations & Bank Vault</Text>
                </View>
                <View style={styles.compRow}>
                  <CheckCircle2 size={16} color={colors.successText} />
                  <Text style={[styles.compRowText, { color: colors.text }]}>Real-Time WebSocket Sync across all phones</Text>
                </View>
                <View style={styles.compRow}>
                  <CheckCircle2 size={16} color={colors.successText} />
                  <Text style={[styles.compRowText, { color: colors.text }]}>Zero-Sum Invariant (Guaranteed balanced math)</Text>
                </View>
                <View style={styles.compRow}>
                  <CheckCircle2 size={16} color={colors.successText} />
                  <Text style={[styles.compRowText, { color: colors.text }]}>1-Tap WhatsApp Settlements (Min Payments)</Text>
                </View>
                <View style={styles.compRow}>
                  <CheckCircle2 size={16} color={colors.successText} />
                  <Text style={[styles.compRowText, { color: colors.text }]}>Saved Guests (Only host needs account)</Text>
                </View>
              </View>
            </View>

            <View style={[styles.compCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.compHeader, { backgroundColor: colors.cardRaised }]}>
                <Text style={[styles.compTitle, { color: colors.textSecondary }]}>Spreadsheets & Simple Apps</Text>
              </View>
              <View style={styles.compBody}>
                <View style={styles.compRow}>
                  <Text style={styles.compCrossText}>✕</Text>
                  <Text style={[styles.compRowText, { color: colors.textSecondary }]}>Poker only (No Teen Patti support)</Text>
                </View>
                <View style={styles.compRow}>
                  <Text style={styles.compCrossText}>✕</Text>
                  <Text style={[styles.compRowText, { color: colors.textSecondary }]}>No physical chip inventory tracking</Text>
                </View>
                <View style={styles.compRow}>
                  <Text style={styles.compCrossText}>✕</Text>
                  <Text style={[styles.compRowText, { color: colors.textSecondary }]}>Players can't watch live on their own screens</Text>
                </View>
                <View style={styles.compRow}>
                  <Text style={styles.compCrossText}>✕</Text>
                  <Text style={[styles.compRowText, { color: colors.textSecondary }]}>Prone to manual math calculation errors</Text>
                </View>
                <View style={styles.compRow}>
                  <Text style={styles.compCrossText}>✕</Text>
                  <Text style={[styles.compRowText, { color: colors.textSecondary }]}>Confusing circular payments between friends</Text>
                </View>
                <View style={styles.compRow}>
                  <Text style={styles.compCrossText}>✕</Text>
                  <Text style={[styles.compRowText, { color: colors.textSecondary }]}>Forces every player to register or download</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* HOW IT WORKS (4 STEPS) */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>HOW IT WORKS</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Four steps to a stress-free game night</Text>

          <View style={styles.stepsGrid}>
            <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.stepNumBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.stepNumText, { color: colors.primary }]}>01</Text>
              </View>
              <Text style={[styles.stepCardTitle, { color: colors.text }]}>Create Your Table</Text>
              <Text style={[styles.stepCardDesc, { color: colors.textSecondary }]}>
                Choose Texas Hold'em or Teen Patti. Pick Equal Value per chip or customize physical White, Red, Blue, and Green chip values.
              </Text>
            </View>

            <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.stepNumBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.stepNumText, { color: colors.primary }]}>02</Text>
              </View>
              <Text style={[styles.stepCardTitle, { color: colors.text }]}>Seat Players with 1 Tap</Text>
              <Text style={[styles.stepCardDesc, { color: colors.textSecondary }]}>
                Seat registered friends by phone or add guests by name. Only the host records; guests don't even need an account.
              </Text>
            </View>

            <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.stepNumBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.stepNumText, { color: colors.primary }]}>03</Text>
              </View>
              <Text style={[styles.stepCardTitle, { color: colors.text }]}>Track Buy-ins & Credit</Text>
              <Text style={[styles.stepCardDesc, { color: colors.textSecondary }]}>
                Record rebuys, shot loans, and early cash-outs. The live bank vault verifies that physical chips match the money pot.
              </Text>
            </View>

            <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.stepNumBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.stepNumText, { color: colors.primary }]}>04</Text>
              </View>
              <Text style={[styles.stepCardTitle, { color: colors.text }]}>Settle & Share on WhatsApp</Text>
              <Text style={[styles.stepCardDesc, { color: colors.textSecondary }]}>
                ChipMate minimizes debt into the fewest possible payments. Copy or share formatted summaries straight to your WhatsApp group.
              </Text>
            </View>
          </View>
        </View>

        {/* CORE FEATURES GRID */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>ENGINEERED FOR SERIOUS CARD PLAYERS</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Everything you need, nothing you don't</Text>

          <View style={styles.featuresGrid}>
            <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(234, 88, 12, 0.12)' }]}>
                <Coins size={22} color={colors.primary} />
              </View>
              <Text style={[styles.featureCardTitle, { color: colors.text }]}>Physical Chip Bank Vault</Text>
              <Text style={[styles.featureCardDesc, { color: colors.textSecondary }]}>
                Set exact white, red, blue, green, and black chip counts. The ledger decrements bank vault inventory and prevents buying more chips than physically exist in the box.
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <ShieldCheck size={22} color={colors.successText} />
              </View>
              <Text style={[styles.featureCardTitle, { color: colors.text }]}>Mathematical Zero-Sum Audit</Text>
              <Text style={[styles.featureCardDesc, { color: colors.textSecondary }]}>
                The game cannot be finalized if chips and cash-outs don't add up to zero. Every winner's profit is backed 100% by a loser's loss.
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <MessageSquare size={22} color="#FBBF24" />
              </View>
              <Text style={[styles.featureCardTitle, { color: colors.text }]}>1-Tap WhatsApp Settlements</Text>
              <Text style={[styles.featureCardDesc, { color: colors.textSecondary }]}>
                Generates clean, beautifully formatted settlement summaries with debtor-to-creditor payment instructions to paste into your game WhatsApp chat.
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Zap size={22} color="#3B82F6" />
              </View>
              <Text style={[styles.featureCardTitle, { color: colors.text }]}>Live Spectator Links</Text>
              <Text style={[styles.featureCardDesc, { color: colors.textSecondary }]}>
                Friends can open a live public ledger link on their own smartphones without downloading or logging in, watching pots update via WebSockets.
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                <BarChart2 size={22} color="#A855F7" />
              </View>
              <Text style={[styles.featureCardTitle, { color: colors.text }]}>Head-to-Head Rivalry Records</Text>
              <Text style={[styles.featureCardDesc, { color: colors.textSecondary }]}>
                Track lifetime matchups between you and every friend: total games played together, net profit, win rate, and head-to-head dominance.
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(234, 88, 12, 0.12)' }]}>
                <Users size={22} color={colors.primary} />
              </View>
              <Text style={[styles.featureCardTitle, { color: colors.text }]}>Persistent Saved Guests</Text>
              <Text style={[styles.featureCardDesc, { color: colors.textSecondary }]}>
                Guests are remembered across games! Their lifetime stats, total buy-ins, and ranking persist on the guest leaderboard for your game group.
              </Text>
            </View>
          </View>
        </View>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>QUESTIONS & ANSWERS</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>

          <View style={styles.faqList}>
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.faqItem, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                  onPress={() => setOpenFaq(isOpen ? null : idx)}
                  activeOpacity={0.8}
                >
                  <View style={styles.faqQuestionRow}>
                    <Text style={[styles.faqQuestionText, { color: colors.text }]}>{item.q}</Text>
                    {isOpen ? (
                      <ChevronUp size={18} color={colors.primary} />
                    ) : (
                      <ChevronDown size={18} color={colors.textSecondary} />
                    )}
                  </View>
                  {isOpen && (
                    <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
                      {item.a}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* FINAL CALL TO ACTION */}
        <View style={[styles.ctaBanner, { backgroundColor: colors.card, borderColor: colors.primaryBorder }]}>
          <Text style={[styles.ctaBannerTitle, { color: colors.text }]}>
            Ready for your next game night?
          </Text>
          <Text style={[styles.ctaBannerSubtitle, { color: colors.textSecondary }]}>
            Set up your first table in under 60 seconds. No download required. Free forever.
          </Text>
          <TouchableOpacity
            style={[styles.ctaBannerBtn, { backgroundColor: colors.primary }]}
            onPress={onEnterApp}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.ctaBannerBtnText}>Launch ChipMate Now</Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
          <View style={styles.footerBrandRow}>
            <ChipMateLogo size={28} borderRadius={6} />
            <View style={{ marginLeft: 8 }}>
              <ChipMateWordmark size={14} spacing={2} />
            </View>
          </View>
          <Text style={[styles.footerTagline, { color: colors.textMuted }]}>
            CALCULATE . SETTLE . PLAY.
          </Text>
          <Text style={[styles.footerCopyright, { color: colors.textMuted }]}>
            © 2026 ChipMate. All rights reserved. • Build v{APP_BUILD_VERSION}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%'
  },
  topBar: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    zIndex: 100
  },
  topBarInner: {
    maxWidth: 1120,
    width: '100%',
    marginHorizontal: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  desktopNavLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24
  },
  navLinkItem: {
    paddingVertical: 4
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '600'
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  themeToggleSymbolBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  loginBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '700'
  },
  launchAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  launchAppBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF'
  },
  scrollView: {
    flex: 1,
    width: '100%'
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 60
  },
  heroSection: {
    maxWidth: 1040,
    width: '100%',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 20
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  heroHeadline: {
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -1,
    maxWidth: 800,
    marginBottom: 16
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 680,
    marginBottom: 28
  },
  heroCtasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 24
  },
  heroPrimaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4
  },
  heroPrimaryCtaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.2
  },
  heroSecondaryCta: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1
  },
  heroSecondaryCtaText: {
    fontSize: 14,
    fontWeight: '700'
  },
  trustBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 36
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  trustDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B7280'
  },
  videoShowcaseWrapper: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8
  },
  videoHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  macDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  macDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  videoTitleWrap: {
    flex: 1,
    alignItems: 'center'
  },
  videoTitleText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  videoControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  videoIconBtn: {
    padding: 4
  },
  videoPlayerBox: {
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionWrap: {
    maxWidth: 1040,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center'
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 620,
    marginBottom: 32
  },
  comparisonGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center'
  },
  compCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden'
  },
  compHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10
  },
  compTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  compBody: {
    padding: 20,
    gap: 14
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  compRowText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1
  },
  compCrossText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
    width: 16,
    textAlign: 'center'
  },
  stepsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center'
  },
  stepCard: {
    flex: 1,
    minWidth: 220,
    maxWidth: 250,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1
  },
  stepNumBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  stepNumText: {
    fontSize: 14,
    fontWeight: '900'
  },
  stepCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.2
  },
  stepCardDesc: {
    fontSize: 12,
    lineHeight: 18
  },
  featuresGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center'
  },
  featureCard: {
    flex: 1,
    minWidth: 280,
    maxWidth: 330,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.2
  },
  featureCardDesc: {
    fontSize: 12,
    lineHeight: 18
  },
  faqList: {
    width: '100%',
    maxWidth: 760,
    gap: 10
  },
  faqItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.2
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10
  },
  ctaBanner: {
    maxWidth: 960,
    width: '90%',
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40
  },
  ctaBannerTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8
  },
  ctaBannerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 540
  },
  ctaBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12
  },
  ctaBannerBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF'
  },
  footer: {
    width: '100%',
    maxWidth: 1040,
    borderTopWidth: 1,
    paddingTop: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8
  },
  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  footerTagline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2
  },
  footerCopyright: {
    fontSize: 11,
    marginTop: 4
  }
});
