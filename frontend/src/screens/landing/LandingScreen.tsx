import React, { useState, useRef, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Coins,
  Play,
  RotateCcw,
  X,
  Mail,
  QrCode,
  Trophy,
  HandCoins,
  Share2,
  Plus,
  Lock,
  Check
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
  const phoneRef = useRef<any>(null);

  // Hero Mobile Phone Interactive Slideshow (Slide 0: Video, Slides 1-4: Live App Features)
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // Auto-cycle through the app demo slides (1, 2, 3, 4) without interrupting the intro video
  useEffect(() => {
    if (activeSlideIndex === 0) return; // Keep video playing on Slide 0
    const interval = setInterval(() => {
      setActiveSlideIndex(prev => {
        if (prev === 0) return 0;
        return prev >= 4 ? 1 : prev + 1;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [activeSlideIndex]);

  const handlePrevSlide = () => {
    setActiveSlideIndex(prev => {
      const nextIdx = prev === 0 ? 4 : prev - 1;
      if (nextIdx === 0) {
        if (videoRef.current) {
          try {
            videoRef.current.play();
            setIsVideoPlaying(true);
          } catch (_) {}
        }
      } else {
        if (videoRef.current) {
          try {
            videoRef.current.pause();
            setIsVideoPlaying(false);
          } catch (_) {}
        }
      }
      return nextIdx;
    });
  };

  const handleNextSlide = () => {
    setActiveSlideIndex(prev => {
      const nextIdx = prev === 4 ? 0 : prev + 1;
      if (nextIdx === 0) {
        if (videoRef.current) {
          try {
            videoRef.current.play();
            setIsVideoPlaying(true);
          } catch (_) {}
        }
      } else {
        if (videoRef.current) {
          try {
            videoRef.current.pause();
            setIsVideoPlaying(false);
          } catch (_) {}
        }
      }
      return nextIdx;
    });
  };

  const handleSelectSlide = (idx: number) => {
    setActiveSlideIndex(idx);
    if (idx === 0) {
      if (videoRef.current) {
        try {
          videoRef.current.play();
          setIsVideoPlaying(true);
        } catch (_) {}
      }
    } else {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          setIsVideoPlaying(false);
        } catch (_) {}
      }
    }
  };

  const handleViewLiveDemo = () => {
    // When clicking "Watch Live Demo", advance to Slide 1 (hypothetical live table)
    setActiveSlideIndex(prev => (prev === 0 ? 1 : prev >= 4 ? 1 : prev + 1));
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      } catch (_) {}
    }
    if (Platform.OS === 'web' && phoneRef.current) {
      try {
        phoneRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (_) {}
    }
  };

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

                <TouchableOpacity
                  style={[styles.heroSecondaryCta, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}
                  onPress={handleViewLiveDemo}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.heroSecondaryCtaText, { color: colors.text }]}>Watch Live Demo ▶</Text>
                </TouchableOpacity>
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

            {/* Right Column: High-End Portrait Smartphone Device with Interactive Slideshow */}
            <View ref={phoneRef} style={styles.heroPhoneColumn}>
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

                  {/* Top Live Engine Badge & Slide Title */}
                  <View style={styles.phoneTopBadge}>
                    <View style={[styles.phoneLiveDot, { backgroundColor: activeSlideIndex === 0 ? '#10B981' : '#FBBF24' }]} />
                    <Text style={styles.phoneLiveText}>
                      {activeSlideIndex === 0
                        ? 'LIVE ENGINE DEMO'
                        : activeSlideIndex === 1
                        ? '2/5 • LIVE TABLE'
                        : activeSlideIndex === 2
                        ? '3/5 • GAME SUMMARY'
                        : activeSlideIndex === 3
                        ? '4/5 • RANKINGS'
                        : '5/5 • FRIENDS'}
                    </Text>
                  </View>

                  {/* Left Navigation Arrow */}
                  <TouchableOpacity
                    style={styles.phoneArrowLeft}
                    onPress={handlePrevSlide}
                    activeOpacity={0.7}
                    accessibilityLabel="Previous Screen"
                  >
                    <ChevronLeft size={16} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Right Navigation Arrow */}
                  <TouchableOpacity
                    style={styles.phoneArrowRight}
                    onPress={handleNextSlide}
                    activeOpacity={0.7}
                    accessibilityLabel="Next Screen"
                  >
                    <ChevronRight size={16} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Slide 0: ChipMate Intro Video (Default View on Landing) */}
                  {activeSlideIndex === 0 && (
                    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
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
                          style={styles.phoneGlassBtn}
                          onPress={toggleVideoPlayback}
                          activeOpacity={0.7}
                          accessibilityLabel={isVideoPlaying ? 'Pause video' : 'Play video'}
                        >
                          {isVideoPlaying ? (
                            <View style={styles.pauseIconBars}>
                              <View style={styles.pauseBar} />
                              <View style={styles.pauseBar} />
                            </View>
                          ) : (
                            <Play size={10} color="#FFFFFF" fill="#FFFFFF" />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.phoneGlassBtn}
                          onPress={restartVideo}
                          activeOpacity={0.7}
                          accessibilityLabel="Replay video"
                        >
                          <RotateCcw size={10} color="#FFFFFF" />
                        </TouchableOpacity>

                        <Text style={styles.phoneControlHint}>
                          {isVideoPlaying ? 'Tap to pause' : 'Tap to play'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Slide 1: Live Table Felt */}
                  {activeSlideIndex === 1 && (
                    <View style={styles.slideContainer}>
                      {/* Table Header Bar */}
                      <View style={styles.slideCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, marginRight: 4 }}>♠</Text>
                          <Text style={styles.slideTableTitle} numberOfLines={1}>Texas Hold'em</Text>
                        </View>
                        <View style={styles.slideCodeBadge}>
                          <Text style={styles.slideCodeText}>#A7K92</Text>
                        </View>
                      </View>

                      {/* Vault Status Box */}
                      <View style={styles.slideVaultBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <Text style={styles.slideVaultLabel}>PHYSICAL BANK VAULT</Text>
                          <Text style={styles.slideReconciledTag}>100% RECONCILED ✓</Text>
                        </View>
                        <View style={styles.slideProgressBar}>
                          <View style={[styles.slideProgressFill, { width: '75%', backgroundColor: '#EA580C' }]} />
                          <View style={[styles.slideProgressFill, { width: '25%', backgroundColor: '#3B82F6' }]} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text style={styles.slideVaultSub}>Play: 75 chips (₹1,500)</Text>
                          <Text style={styles.slideVaultSub}>Vault: 25 chips (₹500)</Text>
                        </View>
                      </View>

                      {/* Table Felt / Pot */}
                      <View style={styles.slidePotFelt}>
                        <Text style={styles.slidePotLabel}>CURRENT TABLE POT</Text>
                        <Text style={styles.slidePotValue}>₹2,000</Text>
                        <Text style={styles.slidePotSub}>Blinds: ₹10 / ₹20</Text>
                      </View>

                      {/* Seated Players Mini Roster */}
                      <View style={styles.slideRoster}>
                        <View style={styles.slideRosterRow}>
                          <Text style={styles.slidePlayerName} numberOfLines={1}>👑 Vikram (Host)</Text>
                          <Text style={styles.slidePlayerChips}>35 chips (₹700)</Text>
                        </View>
                        <View style={styles.slideRosterRow}>
                          <Text style={styles.slidePlayerName} numberOfLines={1}>👤 Rahul (Friend)</Text>
                          <Text style={styles.slidePlayerChips}>25 chips (₹500)</Text>
                        </View>
                        <View style={styles.slideRosterRow}>
                          <Text style={styles.slidePlayerName} numberOfLines={1}>⚡ Amit (Guest)</Text>
                          <Text style={styles.slidePlayerChips}>20 chips (₹400)</Text>
                        </View>
                      </View>

                      {/* Table Action Buttons */}
                      <View style={styles.slideActionsRow}>
                        <View style={[styles.slideMiniBtn, { backgroundColor: '#EA580C' }]}>
                          <Text style={styles.slideMiniBtnText}>+ Buy-In</Text>
                        </View>
                        <View style={styles.slideMiniBtnSec}>
                          <Text style={styles.slideMiniBtnSecText}>🤝 Lend</Text>
                        </View>
                        <View style={styles.slideMiniBtnSec}>
                          <Text style={styles.slideMiniBtnSecText}>🚪 Cash Out</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Slide 2: Game Summary with Detailed Breakdown */}
                  {activeSlideIndex === 2 && (
                    <View style={styles.slideContainer}>
                      {/* Champion Trophy Box */}
                      <View style={styles.slideChampionBox}>
                        <Trophy size={14} color="#FBBF24" style={{ marginRight: 5 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.slideChampLabel}>CHAMPION</Text>
                          <Text style={styles.slideChampName} numberOfLines={1}>Vikram (+₹1,400 Profit)</Text>
                        </View>
                      </View>

                      {/* Detailed Ledger Breakdown Table (Buy-in, Loans, Cash Out, Net) */}
                      <View style={styles.slideSummaryTable}>
                        <View style={styles.slideSummaryHeaderRow}>
                          <Text style={[styles.slideColHdr, { flex: 2 }]}>PLAYER</Text>
                          <Text style={[styles.slideColHdr, { flex: 1.1, textAlign: 'center' }]}>BUY</Text>
                          <Text style={[styles.slideColHdr, { flex: 1.2, textAlign: 'center' }]}>LOAN</Text>
                          <Text style={[styles.slideColHdr, { flex: 1.1, textAlign: 'center' }]}>CASH</Text>
                          <Text style={[styles.slideColHdr, { flex: 1.2, textAlign: 'right' }]}>NET</Text>
                        </View>

                        <View style={styles.slideSummaryDataRow}>
                          <Text style={[styles.slideColTxt, { flex: 2, fontWeight: '700' }]} numberOfLines={1}>Vikram</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.1, textAlign: 'center' }]}>₹500</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.2, textAlign: 'center', color: '#38BDF8' }]}>+₹200L</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.1, textAlign: 'center' }]}>₹2,100</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.2, textAlign: 'right', color: '#10B981', fontWeight: '800' }]}>+₹1,400</Text>
                        </View>

                        <View style={styles.slideSummaryDataRow}>
                          <Text style={[styles.slideColTxt, { flex: 2, fontWeight: '700' }]} numberOfLines={1}>Priya</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.1, textAlign: 'center' }]}>₹500</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.2, textAlign: 'center', color: '#94A3B8' }]}>-</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.1, textAlign: 'center' }]}>₹900</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.2, textAlign: 'right', color: '#10B981', fontWeight: '800' }]}>+₹400</Text>
                        </View>

                        <View style={styles.slideSummaryDataRow}>
                          <Text style={[styles.slideColTxt, { flex: 2, fontWeight: '700' }]} numberOfLines={1}>Amit</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.1, textAlign: 'center' }]}>₹500</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.2, textAlign: 'center', color: '#F87171' }]}>-₹200B</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.1, textAlign: 'center' }]}>₹300</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.2, textAlign: 'right', color: '#EF4444', fontWeight: '800' }]}>-₹400</Text>
                        </View>

                        <View style={[styles.slideSummaryDataRow, { borderBottomWidth: 0 }]}>
                          <Text style={[styles.slideColTxt, { flex: 2, fontWeight: '700' }]} numberOfLines={1}>Rahul</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.1, textAlign: 'center' }]}>₹500</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.2, textAlign: 'center', color: '#F87171' }]}>-₹300B</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.1, textAlign: 'center' }]}>₹0</Text>
                          <Text style={[styles.slideColTxt, { flex: 1.2, textAlign: 'right', color: '#EF4444', fontWeight: '800' }]}>-₹800</Text>
                        </View>
                      </View>

                      {/* Bipartite Debt Minimization Settlement */}
                      <View style={styles.slideSettleBox}>
                        <Text style={styles.slideSettleBoxHdr}>OPTIMIZED ZERO-SUM PAYOFFS</Text>
                        <View style={styles.slideSettleRow}>
                          <Text style={styles.slideSettleText}>Rahul pays Vikram</Text>
                          <Text style={styles.slideSettleAmt}>₹800</Text>
                        </View>
                        <View style={styles.slideSettleRow}>
                          <Text style={styles.slideSettleText}>Amit pays Priya</Text>
                          <Text style={styles.slideSettleAmt}>₹400</Text>
                        </View>
                      </View>

                      {/* WhatsApp Dispatch Button */}
                      <View style={styles.slideWhatsAppBtn}>
                        <MessageSquare size={11} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={styles.slideWhatsAppText}>Share Settlement on WhatsApp</Text>
                      </View>
                    </View>
                  )}

                  {/* Slide 3: Rankings & Leaderboard */}
                  {activeSlideIndex === 3 && (
                    <View style={styles.slideContainer}>
                      <View style={styles.slideRankingHdr}>
                        <Trophy size={14} color="#FBBF24" style={{ marginRight: 5 }} />
                        <Text style={styles.slideRankingTitle}>LEADERBOARD & WIN RATES</Text>
                      </View>

                      <View style={styles.slideFilterPillsRow}>
                        <View style={[styles.slideFilterMiniPill, { backgroundColor: '#EA580C' }]}>
                          <Text style={styles.slideFilterMiniTextActive}>All-Time</Text>
                        </View>
                        <View style={styles.slideFilterMiniPill}>
                          <Text style={styles.slideFilterMiniText}>Monthly</Text>
                        </View>
                        <View style={styles.slideFilterMiniPill}>
                          <Text style={styles.slideFilterMiniText}>Win Rate</Text>
                        </View>
                      </View>

                      <View style={styles.slideRankList}>
                        <View style={styles.slideRankItem}>
                          <Text style={{ fontSize: 12, marginRight: 5 }}>🥇</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.slideRankName} numberOfLines={1}>Vikram</Text>
                            <Text style={styles.slideRankStats}>78% Win Rate • 18 Games</Text>
                          </View>
                          <Text style={styles.slideRankProfit}>+₹14,250</Text>
                        </View>

                        <View style={styles.slideRankItem}>
                          <Text style={{ fontSize: 12, marginRight: 5 }}>🥈</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.slideRankName} numberOfLines={1}>Rohan</Text>
                            <Text style={styles.slideRankStats}>64% Win Rate • 14 Games</Text>
                          </View>
                          <Text style={styles.slideRankProfit}>+₹6,800</Text>
                        </View>

                        <View style={styles.slideRankItem}>
                          <Text style={{ fontSize: 12, marginRight: 5 }}>🥉</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.slideRankName} numberOfLines={1}>Ananya</Text>
                            <Text style={styles.slideRankStats}>55% Win Rate • 11 Games</Text>
                          </View>
                          <Text style={styles.slideRankProfit}>+₹2,100</Text>
                        </View>

                        <View style={[styles.slideRankItem, { borderBottomWidth: 0 }]}>
                          <Text style={{ fontSize: 12, marginRight: 5 }}>4️⃣</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.slideRankName} numberOfLines={1}>Pooja</Text>
                            <Text style={styles.slideRankStats}>48% Win Rate • 9 Games</Text>
                          </View>
                          <Text style={styles.slideRankProfit}>+₹950</Text>
                        </View>
                      </View>

                      <View style={styles.slideBadgeRow}>
                        <View style={styles.slideStreakBadge}>
                          <Text style={styles.slideStreakText}>🔥 5-Game Streak</Text>
                        </View>
                        <View style={styles.slideStreakBadge}>
                          <Text style={styles.slideStreakText}>🏆 High Roller Club</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Slide 4: Friends & Social Groups */}
                  {activeSlideIndex === 4 && (
                    <View style={styles.slideContainer}>
                      <View style={styles.slideRankingHdr}>
                        <Users size={14} color="#38BDF8" style={{ marginRight: 5 }} />
                        <Text style={styles.slideRankingTitle}>FRIENDS & RIVALRIES</Text>
                      </View>

                      <View style={styles.slideFriendsList}>
                        <View style={styles.slideFriendCard}>
                          <View style={styles.slideFriendAvatar}>
                            <Text style={{ fontSize: 11 }}>👤</Text>
                            <View style={styles.slideOnlineDot} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 6 }}>
                            <Text style={styles.slideFriendName}>Rahul</Text>
                            <Text style={styles.slideRivalryText}>H2H: 8W - 3L (+₹2,400)</Text>
                          </View>
                          <View style={styles.slideInviteBtn}>
                            <Text style={styles.slideInviteBtnText}>Invite</Text>
                          </View>
                        </View>

                        <View style={styles.slideFriendCard}>
                          <View style={styles.slideFriendAvatar}>
                            <Text style={{ fontSize: 11 }}>👤</Text>
                            <View style={styles.slideOnlineDot} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 6 }}>
                            <Text style={styles.slideFriendName}>Priya</Text>
                            <Text style={styles.slideRivalryText}>H2H: 6W - 2L (+₹1,100)</Text>
                          </View>
                          <View style={styles.slideInviteBtn}>
                            <Text style={styles.slideInviteBtnText}>Invite</Text>
                          </View>
                        </View>

                        <View style={styles.slideFriendCard}>
                          <View style={styles.slideFriendAvatar}>
                            <Text style={{ fontSize: 11 }}>👤</Text>
                            <View style={[styles.slideOnlineDot, { backgroundColor: '#64748B' }]} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 6 }}>
                            <Text style={styles.slideFriendName}>Amit</Text>
                            <Text style={styles.slideRivalryText}>H2H: 5W - 5L (Even)</Text>
                          </View>
                          <Text style={{ fontSize: 9, color: '#94A3B8' }}>Offline</Text>
                        </View>
                      </View>

                      <View style={styles.slideGroupBox}>
                        <Text style={styles.slideGroupTitle}>SATURDAY NIGHT POKER BOYS</Text>
                        <Text style={styles.slideGroupSub}>6 Active Card Buddies • ₹500 Buy-in</Text>
                      </View>

                      <View style={styles.slideAddFriendBtn}>
                        <Plus size={11} color="#FFF" style={{ marginRight: 3 }} />
                        <Text style={styles.slideAddFriendText}>+ Add Friend by Phone</Text>
                      </View>
                    </View>
                  )}

                  {/* Bottom Navigation Dots */}
                  <View style={styles.phoneDotRow}>
                    {[0, 1, 2, 3, 4].map(idx => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handleSelectSlide(idx)}
                        style={[
                          styles.phoneDot,
                          activeSlideIndex === idx && styles.phoneDotActive
                        ]}
                      />
                    ))}
                  </View>

                  {/* Bottom Home Indicator Bar */}
                  <View style={styles.homeIndicatorBar} />
                </View>
              </View>

              {/* Informative Subtitle Caption under phone */}
              <Text style={[styles.phoneCaptionText, { color: colors.textSecondary }]}>
                {activeSlideIndex === 0
                  ? 'Watch intro demo video or use arrows / "Watch Live Demo" to tour live app features'
                  : 'Tap arrows or dots to tour table, summary ledger, rankings, and friends'}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. HOW IT WORKS (4 STEPS - ALTERNATING FULL-WIDTH SHOWCASE) */}
        <View nativeID="how-it-works" {...({ id: 'how-it-works' } as any)} style={styles.sectionWrap}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>HOW IT WORKS</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Four steps to a stress-free game night</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            From opening the chip case to the final WhatsApp settlement, ChipMate automates every calculation.
          </Text>

          <View style={styles.showcaseRowsContainer}>
            {/* STEP 1: Text Left, Mockup Right */}
            <View style={[styles.showcaseRow, isDesktop ? styles.showcaseRowDesktop : styles.showcaseRowMobile]}>
              {/* Text Column */}
              <View style={styles.showcaseTextCol}>
                <View style={[styles.stepNumBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.stepNumText, { color: colors.primary }]}>01</Text>
                </View>
                <Text style={[styles.showcaseStepEyebrow, { color: colors.primary }]}>STEP 01 • SETUP & VAULT</Text>
                <Text style={[styles.showcaseTitle, { color: colors.text }]}>Create Your Table in Seconds</Text>
                <Text style={[styles.showcaseDesc, { color: colors.textSecondary }]}>
                  Choose Texas Hold'em or Teen Patti. Pick equal value per chip or customize physical White, Red, Blue, Green, and Black chip values. Set your chip box inventory so players can never buy more chips than physically exist on the table.
                </Text>
                <View style={styles.showcaseHighlights}>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>Texas Hold'em & Teen Patti Modes</Text>
                  </View>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>Custom chip colors & values (₹10, ₹20, ₹50, ₹100)</Text>
                  </View>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>Physical Bank Vault chip limits enforced</Text>
                  </View>
                </View>
              </View>

              {/* Mockup Screen Column */}
              <View style={styles.showcaseMockupCol}>
                <View style={[styles.mockupWindow, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                  <View style={[styles.mockupWindowHeader, { backgroundColor: colors.cardRaised, borderBottomColor: colors.borderSubtle }]}>
                    <View style={styles.mockupDots}>
                      <View style={[styles.mockupDot, { backgroundColor: '#EF4444' }]} />
                      <View style={[styles.mockupDot, { backgroundColor: '#FBBF24' }]} />
                      <View style={[styles.mockupDot, { backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={[styles.mockupWindowTitle, { color: colors.textMuted }]}>chipmate.online • Host New Game Table</Text>
                  </View>

                  <View style={styles.mockupBody}>
                    <View style={styles.mockupGameTypeRow}>
                      <View style={[styles.mockupTypePillActive, { backgroundColor: colors.primary }]}>
                        <Text style={styles.mockupTypePillActiveText}>♠ Texas Hold'em</Text>
                      </View>
                      <View style={[styles.mockupTypePillInactive, { borderColor: colors.borderSubtle }]}>
                        <Text style={[styles.mockupTypePillInactiveText, { color: colors.textSecondary }]}>Teen Patti</Text>
                      </View>
                    </View>

                    <View style={[styles.mockupBox, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}>
                      <Text style={[styles.mockupBoxLabel, { color: colors.textMuted }]}>PHYSICAL CHIP BOX CONFIGURATION</Text>
                      <View style={styles.mockupChipGrid}>
                        <View style={styles.mockupChipItem}>
                          <View style={[styles.mockupChipCircle, { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' }]}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#0F172A' }}>₹10</Text>
                          </View>
                          <Text style={[styles.mockupChipCount, { color: colors.text }]}>40 chips</Text>
                        </View>
                        <View style={styles.mockupChipItem}>
                          <View style={[styles.mockupChipCircle, { backgroundColor: '#EF4444', borderColor: '#B91C1C' }]}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>₹20</Text>
                          </View>
                          <Text style={[styles.mockupChipCount, { color: colors.text }]}>30 chips</Text>
                        </View>
                        <View style={styles.mockupChipItem}>
                          <View style={[styles.mockupChipCircle, { backgroundColor: '#3B82F6', borderColor: '#1D4ED8' }]}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>₹50</Text>
                          </View>
                          <Text style={[styles.mockupChipCount, { color: colors.text }]}>20 chips</Text>
                        </View>
                        <View style={styles.mockupChipItem}>
                          <View style={[styles.mockupChipCircle, { backgroundColor: '#10B981', borderColor: '#047857' }]}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>₹100</Text>
                          </View>
                          <Text style={[styles.mockupChipCount, { color: colors.text }]}>10 chips</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.mockupVaultSummary, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
                      <Lock size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.mockupVaultSummaryText, { color: colors.primary }]}>
                        Bank Vault: 100 Chips • ₹3,000 Total Box Inventory
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* STEP 2: Mockup Left, Text Right (Desktop row-reverse: Child 1 Text is Right, Child 2 Mockup is Left) */}
            <View style={[styles.showcaseRow, isDesktop ? styles.showcaseRowDesktopReverse : styles.showcaseRowMobile]}>
              {/* Text Column */}
              <View style={styles.showcaseTextCol}>
                <View style={[styles.stepNumBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.stepNumText, { color: colors.primary }]}>02</Text>
                </View>
                <Text style={[styles.showcaseStepEyebrow, { color: colors.primary }]}>STEP 02 • FRICTIONLESS SEATING</Text>
                <Text style={[styles.showcaseTitle, { color: colors.text }]}>Seat Players with 1 Tap</Text>
                <Text style={[styles.showcaseDesc, { color: colors.textSecondary }]}>
                  Seat registered friends by phone number or add casual guests by name in one tap. Only the table host needs an account — guests don't need to sign up, download any app, or remember passwords.
                </Text>
                <View style={styles.showcaseHighlights}>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>1-Tap Guest Seating with zero signup</Text>
                  </View>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>Share 5-character table code or QR scan</Text>
                  </View>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>Remembers regular poker buddies for instant re-seating</Text>
                  </View>
                </View>
              </View>

              {/* Mockup Screen Column */}
              <View style={styles.showcaseMockupCol}>
                <View style={[styles.mockupWindow, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                  <View style={[styles.mockupWindowHeader, { backgroundColor: colors.cardRaised, borderBottomColor: colors.borderSubtle }]}>
                    <View style={styles.mockupDots}>
                      <View style={[styles.mockupDot, { backgroundColor: '#EF4444' }]} />
                      <View style={[styles.mockupDot, { backgroundColor: '#FBBF24' }]} />
                      <View style={[styles.mockupDot, { backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={[styles.mockupWindowTitle, { color: colors.textMuted }]}>Table #A7K92 • Live Player Roster</Text>
                  </View>

                  <View style={styles.mockupBody}>
                    <View style={styles.mockupTableCodeRow}>
                      <View>
                        <Text style={[styles.mockupCodeLabel, { color: colors.textMuted }]}>TABLE JOIN CODE</Text>
                        <Text style={[styles.mockupCodeValue, { color: colors.primary }]}>#A7K92</Text>
                      </View>
                      <View style={[styles.mockupQrPill, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}>
                        <QrCode size={14} color={colors.text} style={{ marginRight: 4 }} />
                        <Text style={[styles.mockupQrPillText, { color: colors.text }]}>Show QR</Text>
                      </View>
                    </View>

                    <View style={styles.mockupRosterList}>
                      <View style={[styles.mockupRosterItem, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}>
                        <View style={styles.mockupPlayerInfo}>
                          <Text style={{ fontSize: 13, marginRight: 6 }}>👑</Text>
                          <Text style={[styles.mockupPlayerName, { color: colors.text }]}>Vikram (Host)</Text>
                        </View>
                        <Text style={[styles.mockupPlayerChips, { color: colors.successText }]}>25 chips (₹500)</Text>
                      </View>

                      <View style={[styles.mockupRosterItem, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}>
                        <View style={styles.mockupPlayerInfo}>
                          <Text style={{ fontSize: 13, marginRight: 6 }}>👤</Text>
                          <Text style={[styles.mockupPlayerName, { color: colors.text }]}>Rahul (Friend)</Text>
                        </View>
                        <Text style={[styles.mockupPlayerChips, { color: colors.successText }]}>25 chips (₹500)</Text>
                      </View>

                      <View style={[styles.mockupRosterItem, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}>
                        <View style={styles.mockupPlayerInfo}>
                          <Text style={{ fontSize: 13, marginRight: 6 }}>⚡</Text>
                          <Text style={[styles.mockupPlayerName, { color: colors.text }]}>Amit (Guest)</Text>
                        </View>
                        <View style={[styles.mockupGuestBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                          <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: '700' }}>1-Tap Guest</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.mockupActionRow]}>
                      <View style={[styles.mockupAddBtn, { backgroundColor: colors.primary }]}>
                        <Plus size={13} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={styles.mockupAddBtnText}>Seat Guest Player</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* STEP 3: Text Left, Mockup Right */}
            <View style={[styles.showcaseRow, isDesktop ? styles.showcaseRowDesktop : styles.showcaseRowMobile]}>
              {/* Text Column */}
              <View style={styles.showcaseTextCol}>
                <View style={[styles.stepNumBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.stepNumText, { color: colors.primary }]}>03</Text>
                </View>
                <Text style={[styles.showcaseStepEyebrow, { color: colors.primary }]}>STEP 03 • LIVE IN-GAME AUDIT</Text>
                <Text style={[styles.showcaseTitle, { color: colors.text }]}>Track Buy-ins, Loans & Credit</Text>
                <Text style={[styles.showcaseDesc, { color: colors.textSecondary }]}>
                  Record rebuys, shot loans between players, and mid-game cash-outs effortlessly. ChipMate maintains a live 100/100 physical chip reconciliation so no chips can ever disappear without being accounted for.
                </Text>
                <View style={styles.showcaseHighlights}>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>1-Click Rebuys with instant vault deduction</Text>
                  </View>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>Inter-player loan tracking (Rahul owes Vikram)</Text>
                  </View>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>Mathematical zero-sum audit ensures pot accuracy</Text>
                  </View>
                </View>
              </View>

              {/* Mockup Screen Column */}
              <View style={styles.showcaseMockupCol}>
                <View style={[styles.mockupWindow, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                  <View style={[styles.mockupWindowHeader, { backgroundColor: colors.cardRaised, borderBottomColor: colors.borderSubtle }]}>
                    <View style={styles.mockupDots}>
                      <View style={[styles.mockupDot, { backgroundColor: '#EF4444' }]} />
                      <View style={[styles.mockupDot, { backgroundColor: '#FBBF24' }]} />
                      <View style={[styles.mockupDot, { backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={[styles.mockupWindowTitle, { color: colors.textMuted }]}>Bank Vault & Physical Chip Audit</Text>
                  </View>

                  <View style={styles.mockupBody}>
                    <View style={[styles.mockupReconciledPill, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                      <CheckCircle2 size={15} color="#10B981" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>
                        100 / 100 Physical Chips Reconciled ✓
                      </Text>
                    </View>

                    <View style={styles.mockupProgressWrap}>
                      <View style={styles.mockupProgressBar}>
                        <View style={[styles.mockupProgressPlay, { width: '75%', backgroundColor: colors.primary }]} />
                        <View style={[styles.mockupProgressVault, { width: '25%', backgroundColor: '#3B82F6' }]} />
                      </View>
                      <View style={styles.mockupProgressLabels}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>In Play: 75 chips (₹2,250)</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#3B82F6' }}>In Vault: 25 chips (₹750)</Text>
                      </View>
                    </View>

                    <View style={[styles.mockupLoanCard, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <HandCoins size={15} color="#FBBF24" style={{ marginRight: 6 }} />
                        <Text style={[styles.mockupLoanTitle, { color: colors.text }]}>Inter-Player Credit Loan</Text>
                      </View>
                      <Text style={[styles.mockupLoanDesc, { color: colors.textSecondary }]}>
                        Rahul borrowed 10 chips (₹200) from Vikram • Automatically factored at settlement
                      </Text>
                    </View>

                    <View style={styles.mockupHostActionsRow}>
                      <View style={[styles.mockupMiniBtn, { backgroundColor: colors.primary }]}>
                        <Text style={styles.mockupMiniBtnText}>+ Buy-In</Text>
                      </View>
                      <View style={[styles.mockupMiniBtn, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle, borderWidth: 1 }]}>
                        <Text style={[styles.mockupMiniBtnText, { color: colors.text }]}>🤝 Lend</Text>
                      </View>
                      <View style={[styles.mockupMiniBtn, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle, borderWidth: 1 }]}>
                        <Text style={[styles.mockupMiniBtnText, { color: colors.text }]}>🚪 Cash Out</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* STEP 4: Mockup Left, Text Right (Desktop row-reverse: Child 1 Text is Right, Child 2 Mockup is Left) */}
            <View style={[styles.showcaseRow, isDesktop ? styles.showcaseRowDesktopReverse : styles.showcaseRowMobile]}>
              {/* Text Column */}
              <View style={styles.showcaseTextCol}>
                <View style={[styles.stepNumBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.stepNumText, { color: colors.primary }]}>04</Text>
                </View>
                <Text style={[styles.showcaseStepEyebrow, { color: colors.primary }]}>STEP 04 • BIPARTITE SETTLEMENT</Text>
                <Text style={[styles.showcaseTitle, { color: colors.text }]}>Settle & Share on WhatsApp</Text>
                <Text style={[styles.showcaseDesc, { color: colors.textSecondary }]}>
                  When game night wraps up, our bipartite debt-minimization engine calculates exact net balances and compresses all debts into the minimum number of direct transfers. Dispatch clean summaries directly to your WhatsApp group.
                </Text>
                <View style={styles.showcaseHighlights}>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>Consolidates 10+ cross-debts into 2 direct transfers</Text>
                  </View>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>1-Tap WhatsApp share with clean payment summary</Text>
                  </View>
                  <View style={styles.showcaseHighlightItem}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.showcaseHighlightText, { color: colors.text }]}>Public read-only ledger links for guests to audit</Text>
                  </View>
                </View>
              </View>

              {/* Mockup Screen Column */}
              <View style={styles.showcaseMockupCol}>
                <View style={[styles.mockupWindow, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                  <View style={[styles.mockupWindowHeader, { backgroundColor: colors.cardRaised, borderBottomColor: colors.borderSubtle }]}>
                    <View style={styles.mockupDots}>
                      <View style={[styles.mockupDot, { backgroundColor: '#EF4444' }]} />
                      <View style={[styles.mockupDot, { backgroundColor: '#FBBF24' }]} />
                      <View style={[styles.mockupDot, { backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={[styles.mockupWindowTitle, { color: colors.textMuted }]}>Official Game Settlement • Minimized</Text>
                  </View>

                  <View style={styles.mockupBody}>
                    <View style={[styles.mockupChampionCard, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                      <Trophy size={18} color="#D97706" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706', letterSpacing: 0.8 }}>CHAMPION</Text>
                        <Text style={[styles.mockupChampionName, { color: colors.text }]}>Vikram (+₹1,500 Net Profit)</Text>
                      </View>
                    </View>

                    <View style={styles.mockupSettlementRows}>
                      <View style={[styles.mockupSettlementRow, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}>
                        <Text style={[styles.mockupSettleText, { color: colors.text }]}>
                          <Text style={{ fontWeight: '700', color: '#EF4444' }}>Amit</Text> pays <Text style={{ fontWeight: '700', color: '#10B981' }}>Vikram</Text>
                        </Text>
                        <Text style={[styles.mockupSettleAmount, { color: colors.text }]}>₹1,000</Text>
                      </View>

                      <View style={[styles.mockupSettlementRow, { backgroundColor: colors.cardRaised, borderColor: colors.borderSubtle }]}>
                        <Text style={[styles.mockupSettleText, { color: colors.text }]}>
                          <Text style={{ fontWeight: '700', color: '#EF4444' }}>Pooja</Text> pays <Text style={{ fontWeight: '700', color: '#10B981' }}>Vikram</Text>
                        </Text>
                        <Text style={[styles.mockupSettleAmount, { color: colors.text }]}>₹500</Text>
                      </View>
                    </View>

                    <View style={[styles.mockupWhatsAppBtn, { backgroundColor: '#25D366' }]}>
                      <MessageSquare size={14} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.mockupWhatsAppBtnText}>Share Settlement to WhatsApp Group</Text>
                    </View>
                  </View>
                </View>
              </View>
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
  showcaseRowsContainer: {
    width: '100%',
    gap: 56,
    marginTop: 20
  },
  showcaseRow: {
    width: '100%'
  },
  showcaseRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 48
  },
  showcaseRowDesktopReverse: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 48
  },
  showcaseRowMobile: {
    flexDirection: 'column',
    gap: 24
  },
  showcaseTextCol: {
    flex: 1,
    minWidth: 280,
    justifyContent: 'center'
  },
  showcaseMockupCol: {
    flex: 1,
    minWidth: 280,
    width: '100%',
    justifyContent: 'center'
  },
  showcaseStepEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8
  },
  showcaseTitle: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 12
  },
  showcaseDesc: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18
  },
  showcaseHighlights: {
    gap: 10
  },
  showcaseHighlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  showcaseHighlightText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1
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
  mockupWindow: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8
  },
  mockupWindowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  mockupDots: {
    flexDirection: 'row',
    gap: 5,
    marginRight: 10
  },
  mockupDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  mockupWindowTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  mockupBody: {
    padding: 16,
    gap: 12
  },
  mockupGameTypeRow: {
    flexDirection: 'row',
    gap: 8
  },
  mockupTypePillActive: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  mockupTypePillActiveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF'
  },
  mockupTypePillInactive: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1
  },
  mockupTypePillInactiveText: {
    fontSize: 12,
    fontWeight: '600'
  },
  mockupBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1
  },
  mockupBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8
  },
  mockupChipGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  mockupChipItem: {
    alignItems: 'center',
    gap: 4
  },
  mockupChipCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mockupChipCount: {
    fontSize: 10,
    fontWeight: '700'
  },
  mockupVaultSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  mockupVaultSummaryText: {
    fontSize: 11,
    fontWeight: '800'
  },
  mockupTableCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  mockupCodeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  mockupCodeValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1
  },
  mockupQrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1
  },
  mockupQrPillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  mockupRosterList: {
    gap: 8
  },
  mockupRosterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  mockupPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  mockupPlayerName: {
    fontSize: 12,
    fontWeight: '700'
  },
  mockupPlayerChips: {
    fontSize: 12,
    fontWeight: '800'
  },
  mockupGuestBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  mockupActionRow: {
    flexDirection: 'row',
    gap: 8
  },
  mockupAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8
  },
  mockupAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF'
  },
  mockupReconciledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1
  },
  mockupProgressWrap: {
    gap: 6
  },
  mockupProgressBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden'
  },
  mockupProgressPlay: {
    height: '100%'
  },
  mockupProgressVault: {
    height: '100%'
  },
  mockupProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  mockupLoanCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4
  },
  mockupLoanTitle: {
    fontSize: 12,
    fontWeight: '800'
  },
  mockupLoanDesc: {
    fontSize: 11,
    lineHeight: 15
  },
  mockupHostActionsRow: {
    flexDirection: 'row',
    gap: 8
  },
  mockupMiniBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mockupMiniBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF'
  },
  mockupChampionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  mockupChampionName: {
    fontSize: 13,
    fontWeight: '800'
  },
  mockupSettlementRows: {
    gap: 6
  },
  mockupSettlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  mockupSettleText: {
    fontSize: 12
  },
  mockupSettleAmount: {
    fontSize: 13,
    fontWeight: '800'
  },
  mockupWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8
  },
  mockupWhatsAppBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF'
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
  },
  phoneArrowLeft: {
    position: 'absolute',
    left: 6,
    top: '48%',
    marginTop: -15,
    zIndex: 30,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  phoneArrowRight: {
    position: 'absolute',
    right: 6,
    top: '48%',
    marginTop: -15,
    zIndex: 30,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  slideContainer: {
    paddingTop: 56,
    paddingHorizontal: 10,
    paddingBottom: 24,
    gap: 7,
    flex: 1,
    zIndex: 10
  },
  slideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0B132B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  slideTableTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F1F5F9'
  },
  slideCodeBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.4)'
  },
  slideCodeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FB923C'
  },
  slideVaultBox: {
    backgroundColor: '#0F172A',
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  slideVaultLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5
  },
  slideReconciledTag: {
    fontSize: 8,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.3
  },
  slideProgressBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 3
  },
  slideProgressFill: {
    height: '100%'
  },
  slideVaultSub: {
    fontSize: 8.5,
    color: '#64748B',
    fontWeight: '600'
  },
  slidePotFelt: {
    backgroundColor: '#064E3B',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#059669'
  },
  slidePotLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6EE7B7',
    letterSpacing: 0.8
  },
  slidePotValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 1
  },
  slidePotSub: {
    fontSize: 8.5,
    color: '#A7F3D0',
    fontWeight: '600'
  },
  slideRoster: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4
  },
  slideRosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2
  },
  slidePlayerName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
    maxWidth: 130
  },
  slidePlayerChips: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#F8FAFC'
  },
  slideActionsRow: {
    flexDirection: 'row',
    gap: 5
  },
  slideMiniBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  slideMiniBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFF'
  },
  slideMiniBtnSec: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  slideMiniBtnSecText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E2E8F0'
  },
  slideChampionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B4B',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)'
  },
  slideChampLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.6
  },
  slideChampName: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFF'
  },
  slideSummaryTable: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  slideSummaryHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 3,
    marginBottom: 3
  },
  slideColHdr: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.4
  },
  slideSummaryDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2.5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  slideColTxt: {
    fontSize: 9,
    color: '#E2E8F0'
  },
  slideSettleBox: {
    backgroundColor: '#0B132B',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 3
  },
  slideSettleBoxHdr: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  slideSettleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  slideSettleText: {
    fontSize: 9.5,
    color: '#CBD5E1',
    fontWeight: '600'
  },
  slideSettleAmt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981'
  },
  slideWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803D',
    paddingVertical: 6,
    borderRadius: 6
  },
  slideWhatsAppText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFF'
  },
  slideRankingHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  slideRankingTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: 0.5
  },
  slideFilterPillsRow: {
    flexDirection: 'row',
    gap: 4
  },
  slideFilterMiniPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#1E293B'
  },
  slideFilterMiniTextActive: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFF'
  },
  slideFilterMiniText: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#94A3B8'
  },
  slideRankList: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  slideRankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  slideRankName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  slideRankStats: {
    fontSize: 8,
    color: '#94A3B8'
  },
  slideRankProfit: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981'
  },
  slideBadgeRow: {
    flexDirection: 'row',
    gap: 5
  },
  slideStreakBadge: {
    flex: 1,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.3)',
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center'
  },
  slideStreakText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FB923C'
  },
  slideFriendsList: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 5
  },
  slideFriendCard: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  slideFriendAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  slideOnlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 1,
    borderColor: '#0F172A'
  },
  slideFriendName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  slideRivalryText: {
    fontSize: 8,
    color: '#94A3B8'
  },
  slideInviteBtn: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)'
  },
  slideInviteBtnText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#38BDF8'
  },
  slideGroupBox: {
    backgroundColor: '#1E1B4B',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)'
  },
  slideGroupTitle: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#A5B4FC',
    letterSpacing: 0.4
  },
  slideGroupSub: {
    fontSize: 8,
    color: '#818CF8',
    marginTop: 1
  },
  slideAddFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    borderRadius: 6
  },
  slideAddFriendText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFF'
  },
  phoneDotRow: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 25
  },
  phoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  phoneDotActive: {
    backgroundColor: '#EA580C',
    width: 14
  }
});
