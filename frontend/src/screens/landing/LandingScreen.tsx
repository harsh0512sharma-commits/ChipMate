import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Modal
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
  RotateCcw,
  X,
  Mail
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
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
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

  const scrollToSection = (sectionId: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const navigateExternalUrl = (path: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = path;
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
      <View style={[styles.topBar, !isDesktop && styles.topBarMobile, { backgroundColor: colors.card, borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.topBarInner}>
          <View style={styles.brandRow}>
            <ChipMateLogo size={isDesktop ? 32 : 26} borderRadius={isDesktop ? 8 : 6} />
            <View style={{ marginLeft: isDesktop ? 10 : 7 }}>
              <ChipMateWordmark size={isDesktop ? 17 : 14} spacing={isDesktop ? 2.5 : 1.5} />
            </View>
          </View>

          {/* Desktop Nav Links (Sequential Order matching Page Layout) */}
          {isDesktop && (
            <View style={styles.desktopNavLinks}>
              <TouchableOpacity onPress={() => scrollToSection('how-it-works')} activeOpacity={0.7} style={styles.navLinkItem}>
                <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>How It Works</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('features')} activeOpacity={0.7} style={styles.navLinkItem}>
                <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>Features</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('why-chipmate')} activeOpacity={0.7} style={styles.navLinkItem}>
                <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>Why ChipMate</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('faq')} activeOpacity={0.7} style={styles.navLinkItem}>
                <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>FAQ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsContactModalOpen(true)} activeOpacity={0.7} style={styles.navLinkItem}>
                <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>Contact Us</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Top Bar Right: Theme Toggle Symbol Only + Action Buttons */}
          <View style={[styles.topBarRight, !isDesktop && styles.topBarRightMobile]}>
            {/* Theme Toggle Button (Symbol Only) */}
            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.themeToggleSymbolBtn,
                !isDesktop && styles.themeToggleSymbolBtnMobile,
                {
                  backgroundColor: colors.cardRaised,
                  borderColor: colors.borderDark
                }
              ]}
              activeOpacity={0.75}
              accessibilityLabel={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            >
              {isDark ? (
                <Sun size={isDesktop ? 17 : 15} color="#FBBF24" />
              ) : (
                <Moon size={isDesktop ? 17 : 15} color="#2563EB" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onEnterApp}
              style={[styles.loginBtn, !isDesktop && styles.loginBtnMobile, { borderColor: colors.borderSubtle }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.loginBtnText, !isDesktop && styles.loginBtnTextMobile, { color: colors.text }]}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onEnterApp}
              style={[styles.launchAppBtn, !isDesktop && styles.launchAppBtnMobile, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Sparkles size={isDesktop ? 14 : 11} color="#FFF" style={{ marginRight: isDesktop ? 6 : 4 }} />
              <Text style={[styles.launchAppBtnText, !isDesktop && styles.launchAppBtnTextMobile]}>
                {isDesktop ? 'Start Playing' : 'Play'}
              </Text>
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
        {/* HERO SECTION - SPLIT LAYOUT (HERO COPY + PORTRAIT SMARTPHONE MOCKUP) */}
        <View style={styles.heroSection}>
          <View style={[styles.heroRow, isDesktop ? styles.heroRowDesktop : styles.heroRowMobile]}>
            {/* Left Column: Hero Copy & Actions */}
            <View style={[styles.heroLeftCol, { alignItems: isDesktop ? 'flex-start' : 'center' }]}>
              {/* Single Clear H1 for SEO & Accessibility */}
              <Text
                // @ts-ignore
                accessibilityRole="header"
                aria-level={1}
                style={[styles.heroH1Text, { color: colors.primary, textAlign: isDesktop ? 'left' : 'center' }]}
              >
                ChipMate – Poker &amp; Teen Patti Settlement Calculator
              </Text>

              {/* Eyebrow Pill */}
              <View style={[styles.heroPill, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
                <Sparkles size={13} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.heroPillText, { color: colors.primary }]}>
                  THE ZERO-SUM CHIP LEDGER &amp; SETTLEMENT ENGINE
                </Text>
              </View>

              {/* Big Headline */}
              <Text style={[styles.heroHeadline, { color: colors.text, textAlign: isDesktop ? 'left' : 'center' }]}>
                Throw away the spreadsheet.{'\n'}
                <Text style={{ color: colors.primary }}>Never argue over chips again.</Text>
              </Text>

              {/* Subtitle with Natural Explanation */}
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary, textAlign: isDesktop ? 'left' : 'center' }]}>
                The free real-time chip ledger and debt settlement calculator for home Poker and Teen Patti games. Effortlessly track player buy-ins, physical chip bank vaults, borrowed chips, and player balances with automated zero-sum verification and 1-tap WhatsApp settlements.
              </Text>

              {/* Hero CTAs */}
              <View style={[styles.heroCtasRow, { justifyContent: isDesktop ? 'flex-start' : 'center' }]}>
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
              <View style={[styles.trustBadgesRow, { justifyContent: isDesktop ? 'flex-start' : 'center' }]}>
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
            </View>

            {/* Right Column: High-End Portrait Smartphone Device (Zero Cropping!) */}
            <View style={styles.heroPhoneColumn}>
              {/* Outer Ambient Glow */}
              <View
                style={[
                  styles.phoneAmbientGlow,
                  { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.18)' : 'rgba(234, 88, 12, 0.10)' }
                ]}
              />

              {/* Smartphone Chassis Frame */}
              <View style={[styles.phoneChassis, { borderColor: isDark ? '#262D3D' : '#1F2937' }]}>
                {/* 9:16 Portrait Screen Glass */}
                <View style={styles.phoneScreenGlass}>
                  {/* Top Dynamic Island / Speaker Pill */}
                  <View style={styles.dynamicIslandPill}>
                    <View style={styles.dynamicIslandCamera} />
                  </View>

                  {/* Top Live Engine Badge */}
                  <View style={styles.phoneTopBadge}>
                    <View style={styles.phoneLiveDot} />
                    <Text style={styles.phoneLiveText}>LIVE ENGINE DEMO</Text>
                  </View>

                  {/* Native Portrait 9:16 Video Player - Zero Cropping */}
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
                        height: '100%',
                        backgroundColor: '#000000',
                        objectFit: 'contain'
                      }}
                    />
                  )}

                  {/* Floating Frosted Glass Video Controls */}
                  <View style={styles.phoneFloatingControls}>
                    <TouchableOpacity
                      onPress={toggleVideoPlayback}
                      style={styles.phoneGlassBtn}
                      activeOpacity={0.7}
                      accessibilityLabel={isVideoPlaying ? 'Pause Video' : 'Play Video'}
                    >
                      {isVideoPlaying ? (
                        <View style={styles.pauseIconBars}>
                          <View style={styles.pauseBar} />
                          <View style={styles.pauseBar} />
                        </View>
                      ) : (
                        <Play size={11} color="#FFFFFF" fill="#FFFFFF" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={restartVideo}
                      style={styles.phoneGlassBtn}
                      activeOpacity={0.7}
                      accessibilityLabel="Replay Video"
                    >
                      <RotateCcw size={11} color="#FFFFFF" />
                    </TouchableOpacity>

                    <Text style={styles.phoneControlHint}>
                      {isVideoPlaying ? 'Playing' : 'Paused'}
                    </Text>
                  </View>

                  {/* Bottom Home Indicator Bar */}
                  <View style={styles.homeIndicatorBar} />
                </View>
              </View>

              {/* Device Caption */}
              <Text style={[styles.phoneCaptionText, { color: colors.textMuted }]}>
                ChipMate Mobile Ledger Preview • 9:16 Portrait
              </Text>
            </View>
          </View>
        </View>

        {/* 1. HOW IT WORKS (4 STEPS) */}
        <View nativeID="how-it-works" {...({ id: 'how-it-works' } as any)} style={styles.sectionWrap}>
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

        {/* 2. CORE FEATURES GRID */}
        <View nativeID="features" {...({ id: 'features' } as any)} style={styles.sectionWrap}>
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

        {/* 3. WHY CHIPMATE (COMPARISON: CHIPMATE VS OTHERS) */}
        <View nativeID="why-chipmate" {...({ id: 'why-chipmate' } as any)} style={styles.sectionWrap}>
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

        {/* 4. FREQUENTLY ASKED QUESTIONS */}
        <View nativeID="faq" {...({ id: 'faq' } as any)} style={styles.sectionWrap}>
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

        {/* 5. FINAL CALL TO ACTION */}
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

        {/* 6. FOOTER WITH HRVA SOLUTIONS CREDIT & POLICY LINKS */}
        <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
          <View style={styles.footerBrandRow}>
            <ChipMateLogo size={28} borderRadius={6} />
            <View style={{ marginLeft: 8 }}>
              <ChipMateWordmark size={14} spacing={2} />
            </View>
          </View>

          {/* Calculators & Guides SEO Directory */}
          <View style={styles.footerDirectorySection}>
            <View style={styles.footerDirCol}>
              <Text style={[styles.footerDirHeader, { color: colors.text }]}>Settlement Calculators</Text>
              <TouchableOpacity onPress={() => navigateExternalUrl('/teen-patti-settlement-calculator')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>Teen Patti Settlement Calculator</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateExternalUrl('/poker-settlement-calculator')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>Poker Settlement Calculator</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateExternalUrl('/poker-chip-calculator')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>Poker Chip Calculator</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateExternalUrl('/teen-patti-chip-calculator')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>Teen Patti Chip Calculator</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerDirCol}>
              <Text style={[styles.footerDirHeader, { color: colors.text }]}>Game Settlement Guides</Text>
              <TouchableOpacity onPress={() => navigateExternalUrl('/guides/how-to-calculate-teen-patti-settlement')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>How to Calculate Teen Patti Settlement</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateExternalUrl('/guides/how-to-calculate-poker-settlement')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>How to Calculate Poker Settlement</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateExternalUrl('/guides/how-poker-chips-buy-ins-and-settlement-work')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>How Poker Chips &amp; Buy-ins Work</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateExternalUrl('/guides/how-to-track-borrowed-poker-chips')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>How to Track Borrowed Poker Chips</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateExternalUrl('/guides/how-to-settle-a-home-poker-game')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>How to Settle a Home Poker Game</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerDirCol}>
              <Text style={[styles.footerDirHeader, { color: colors.text }]}>Resources &amp; Company</Text>
              <TouchableOpacity onPress={() => navigateExternalUrl('/about')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>About ChipMate</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateExternalUrl('/how-it-works')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>How ChipMate Works</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateExternalUrl('/faq')} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>ChipMate FAQ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsPrivacyModalOpen(true)} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsContactModalOpen(true)} style={styles.footerDirLinkTouch}>
                <Text style={[styles.footerDirLinkText, { color: colors.textSecondary }]}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Footer Links */}
          <View style={styles.footerLinksRow}>
            <TouchableOpacity onPress={() => setIsPrivacyModalOpen(true)} activeOpacity={0.7} style={styles.footerLinkTouch}>
              <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={[styles.footerDot, { color: colors.textMuted }]}>•</Text>
            <TouchableOpacity onPress={() => setIsContactModalOpen(true)} activeOpacity={0.7} style={styles.footerLinkTouch}>
              <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Contact Us</Text>
            </TouchableOpacity>
            <Text style={[styles.footerDot, { color: colors.textMuted }]}>•</Text>
            <TouchableOpacity onPress={() => scrollToSection('faq')} activeOpacity={0.7} style={styles.footerLinkTouch}>
              <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>FAQ</Text>
            </TouchableOpacity>
          </View>

          {/* Official Attribution requested by user */}
          <Text style={[styles.footerHrvaCredit, { color: colors.textSecondary }]}>
            Made with <Text style={{ color: '#EF4444' }}>❤️</Text> by <Text style={{ fontWeight: '800', color: colors.text }}>HRVS</Text>
          </Text>

          <Text style={[styles.footerTagline, { color: colors.textMuted }]}>
            CALCULATE . SETTLE . PLAY.
          </Text>
          <Text style={[styles.footerCopyright, { color: colors.textMuted }]}>
            © 2026 ChipMate. All rights reserved. • Build v{APP_BUILD_VERSION}
          </Text>
        </View>
      </ScrollView>

      {/* CONTACT US MODAL */}
      <Modal
        transparent
        visible={isContactModalOpen}
        animationType="fade"
        onRequestClose={() => setIsContactModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Mail size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Contact ChipMate</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsContactModalOpen(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.cardRaised }]}
                activeOpacity={0.7}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Have feedback, questions about game settlements, or need assistance for your poker club? We would love to hear from you.
            </Text>

            <View style={[styles.contactCard, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.contactLabel, { color: colors.textMuted }]}>OFFICIAL SUPPORT EMAIL</Text>
              <Text style={[styles.contactValue, { color: colors.primary }]}>support@chipmate.online</Text>
              <Text style={[styles.contactNote, { color: colors.textSecondary }]}>
                Direct inquiries & assistance for hosts and players.
              </Text>
              <TouchableOpacity
                style={[styles.contactActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.location.href = 'mailto:support@chipmate.online?subject=ChipMate%20Inquiry';
                  }
                }}
                activeOpacity={0.8}
              >
                <Mail size={14} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.contactActionBtnText}>Send Us an Email</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.contactMetaBox, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.contactMetaText, { color: colors.textMuted }]}>
                ChipMate is engineered and maintained with pride by <Text style={{ color: colors.text, fontWeight: '700' }}>HRVS</Text>.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* PRIVACY POLICY MODAL */}
      <Modal
        transparent
        visible={isPrivacyModalOpen}
        animationType="fade"
        onRequestClose={() => setIsPrivacyModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.privacyModalCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>ChipMate Privacy Policy</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPrivacyModalOpen(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.cardRaised }]}
                activeOpacity={0.7}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.privacyScroll} showsVerticalScrollIndicator={true}>
              <Text style={[styles.privacySectionTitle, { color: colors.text }]}>1. Overview &amp; Commitment</Text>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                ChipMate (developed by HRVS) is built on the foundation of user privacy and transparency. We do not sell user data, run advertising trackers, or share private table details with third parties.
              </Text>

              <Text style={[styles.privacySectionTitle, { color: colors.text }]}>2. Host Account Data</Text>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                Table hosts register using a 10-digit mobile number, player display name, and email address for secure OTP verification. This information is used strictly for authentication and account security.
              </Text>

              <Text style={[styles.privacySectionTitle, { color: colors.text }]}>3. Guest Player Privacy</Text>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                Guest players do NOT need an account, do NOT need to provide an email or phone number, and do NOT need to download an application. Guest statistics are scoped exclusively to the table host's private game group.
              </Text>

              <Text style={[styles.privacySectionTitle, { color: colors.text }]}>4. Zero Financial &amp; Gambling Transactions</Text>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                ChipMate is an authoritative scorekeeping, physical chip inventory, and debt minimization calculator. ChipMate does NOT process money transfers, does NOT hold player funds, does NOT store bank account or credit card credentials, and does NOT operate as an online gambling service. All settlements generated are mathematical summaries for private peer-to-peer settlement.
              </Text>

              <Text style={[styles.privacySectionTitle, { color: colors.text }]}>5. Local Device Storage</Text>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                We utilize browser local storage solely to remember authentication session tokens and theme preferences (Day/Night mode) on your device.
              </Text>

              <Text style={[styles.privacySectionTitle, { color: colors.text }]}>6. Data Contact &amp; Controller</Text>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                If you have questions regarding data privacy or wish to request data deletion, contact HRVS directly at support@chipmate.online.
              </Text>
            </ScrollView>

            <View style={[styles.modalFooterRow, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={[styles.modalCloseDoneBtn, { backgroundColor: colors.primary }]}
                onPress={() => setIsPrivacyModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseDoneBtnText}>I Understand</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  topBarMobile: {
    paddingVertical: 10,
    paddingHorizontal: 12
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
    gap: 20
  },
  navLinkItem: {
    paddingVertical: 4
  },
  navLinkText: {
    fontSize: 13,
    fontWeight: '600'
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  topBarRightMobile: {
    gap: 6
  },
  themeToggleSymbolBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  themeToggleSymbolBtnMobile: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  loginBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1
  },
  loginBtnMobile: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '700'
  },
  loginBtnTextMobile: {
    fontSize: 12
  },
  launchAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  launchAppBtnMobile: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  launchAppBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF'
  },
  launchAppBtnTextMobile: {
    fontSize: 12
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
    maxWidth: 1140,
    width: '100%',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20
  },
  heroRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  heroRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 48
  },
  heroRowMobile: {
    flexDirection: 'column',
    gap: 36
  },
  heroLeftCol: {
    flex: 1,
    maxWidth: 620,
    width: '100%'
  },
  heroH1Text: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10
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
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: 16
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 580,
    marginBottom: 28
  },
  heroCtasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
    gap: 12,
    marginBottom: 8
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
  heroPhoneColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  phoneAmbientGlow: {
    position: 'absolute',
    width: 280,
    height: 380,
    borderRadius: 140,
    top: 40,
    alignSelf: 'center',
    zIndex: -1
  },
  phoneChassis: {
    borderRadius: 42,
    borderWidth: 9,
    backgroundColor: '#000000',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12
  },
  phoneScreenGlass: {
    width: 280,
    height: 498,
    position: 'relative',
    backgroundColor: '#000000',
    borderRadius: 33,
    overflow: 'hidden'
  },
  dynamicIslandPill: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 76,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10
  },
  dynamicIslandCamera: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B'
  },
  phoneTopBadge: {
    position: 'absolute',
    top: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)'
  },
  phoneLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981'
  },
  phoneLiveText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8
  },
  phoneFloatingControls: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)'
  },
  phoneGlassBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pauseIconBars: {
    flexDirection: 'row',
    gap: 2.5
  },
  pauseBar: {
    width: 2.5,
    height: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 1
  },
  phoneControlHint: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600'
  },
  homeIndicatorBar: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    width: 90,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    zIndex: 20
  },
  phoneCaptionText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 0.2
  },
  sectionWrap: {
    maxWidth: 1040,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { scrollMarginTop: 80 } : {})
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
  footerDirectorySection: {
    width: '100%',
    maxWidth: 960,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 24,
    paddingVertical: 24,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)'
  },
  footerDirCol: {
    flex: 1,
    minWidth: 200,
    gap: 10
  },
  footerDirHeader: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  footerDirLinkTouch: {
    paddingVertical: 3
  },
  footerDirLinkText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500'
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 4
  },
  footerLinkTouch: {
    paddingVertical: 4,
    paddingHorizontal: 6
  },
  footerLinkText: {
    fontSize: 12,
    fontWeight: '600'
  },
  footerDot: {
    fontSize: 12
  },
  footerHrvaCredit: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
    textAlign: 'center'
  },
  footerTagline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2
  },
  footerCopyright: {
    fontSize: 11,
    marginTop: 4
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 1000
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  privacyModalCard: {
    maxHeight: '85%'
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16
  },
  contactCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6
  },
  contactNote: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14
  },
  contactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  contactActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF'
  },
  contactMetaBox: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 6
  },
  contactMetaText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16
  },
  privacyScroll: {
    maxHeight: 380,
    marginVertical: 10
  },
  privacySectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 4
  },
  privacyText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8
  },
  modalFooterRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
    alignItems: 'flex-end'
  },
  modalCloseDoneBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8
  },
  modalCloseDoneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF'
  }
});
