import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, ScrollView } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
    ArrowRight,
    ShieldCheck,
    Zap,
} from 'lucide-react-native';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { BrandLogo } from '@/components/BrandLogo';
import { AppLegalFooter } from '@/components/AppLegalFooter';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PublicCard, PublicSiteLayout } from '@/components/website/PublicSiteLayout';
import { AppShowcase, InsideAppGallery } from '@/components/website/AppShowcase';

export default function LandingPage() {
    const router = useRouter();
    const [activeAppSlide, setActiveAppSlide] = useState(0);

    const APP_SLIDES = [
        {
            title: 'Add friends',
            subtitle: 'Connect with people you already know and keep your shared history together.',
            accent: '#6366F1',
            lines: ['Search by friend code', 'Invite by email or text', 'Keep shared activity in one place'],
        },
        {
            title: 'Create a record',
            subtitle: 'Save what happened, add details, and keep the timeline clear for both sides.',
            accent: '#0EA5E9',
            lines: ['Add notes and details', 'Set reminders or return dates', 'Keep the shared timeline updated'],
        },
        {
            title: 'Review shared history',
            subtitle: 'See updates in context instead of guessing what changed.',
            accent: '#22C55E',
            lines: ['Recent activity first', 'Shared timeline view', 'Clear status at a glance'],
        },
        {
            title: 'Account tools',
            subtitle: 'Manage your app settings, exports, and account preferences.',
            accent: '#F59E0B',
            lines: ['Export your history', 'Manage settings', 'Keep everything organized'],
        },
    ];

    if (Platform.OS === 'web') {
        return (
            <PublicSiteLayout
                eyebrow="Buddy Balance . Mobile Ledger . 2026"
                title="A simple way to keep shared records and reminders with friends."
                description="Buddy Balance helps friends keep track of shared activity, returns, reminders, and account history in one place. It does not send money, connect bank accounts, or move funds."
                primaryAction={{ href: 'https://apps.apple.com/' as Href, label: 'Download BuddyBalance' }}
                ctaSupportText="Track shared balances with friends and family in seconds."
                secondaryActions={[
                    { href: 'https://apps.apple.com/' as Href, label: 'App Store', variant: 'secondary' },
                    { href: 'https://play.google.com/store' as Href, label: 'Google Play', variant: 'secondary' },
                ]}
                heroVisual={<AppShowcase />}
            >
                <View style={styles.webRibbon}>
                    <Text style={styles.webRibbonText}>
                        SHARED RECORDS . FRIEND CONNECTIONS . CLEAR UPDATES . SIMPLE REMINDERS
                    </Text>
                </View>

                <View style={styles.webNoticeCard}>
                    <Text style={styles.webNoticeEyebrow}>IMPORTANT</Text>
                    <Text style={styles.webNoticeTitle}>Buddy Balance does not handle real money.</Text>
                    <Text style={styles.webNoticeStrongLine}>Not a payment processor. No bank connection. No money movement.</Text>
                    <Text style={styles.webNoticeBody}>
                        It does not send funds and does not connect to bank accounts. It helps friends keep a shared
                        record of things that already happened outside the app.
                    </Text>
                </View>

                <View style={styles.webCarouselSection}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.webCarouselTrack}
                    >
                        {APP_SLIDES.map((slide, index) => {
                            const active = index === activeAppSlide;
                            return (
                                <Pressable
                                    key={slide.title}
                                    onPress={() => setActiveAppSlide(index)}
                                    style={[
                                        styles.carouselCard,
                                        active && styles.carouselCardActive,
                                    ]}
                                >
                                    <View style={[styles.carouselBadge, { backgroundColor: slide.accent }]} />
                                    <Text style={styles.carouselTitle}>{slide.title}</Text>
                                    <Text style={styles.carouselSubtitle}>{slide.subtitle}</Text>
                                    <View style={styles.carouselList}>
                                        {slide.lines.map((line) => (
                                            <Text key={line} style={styles.carouselLine}>{line}</Text>
                                        ))}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={styles.webHighlights}>
                    <PublicCard
                        title="What new users notice first"
                        description="Buddy Balance is designed to make shared activity easy to understand: who updated something, what changed, what still needs attention, and how much money is still owed between friends or family."
                    >
                        <View style={styles.signalGrid}>
                            <SignalChip label="Shared history stays readable" />
                            <SignalChip label="Track money owed to friends or family" />
                            <SignalChip label="Contacts are easy to manage" />
                            <SignalChip label="Updates stay in context" />
                            <SignalChip label="Reminders are easy to follow" />
                            <SignalChip label="Settings stay organized" />
                            <SignalChip label="No bank connection required" />
                        </View>
                    </PublicCard>
                </View>

                <View style={styles.webShowcase}>
                    <InsideAppGallery />
                </View>

            </PublicSiteLayout>
        );
    }

    return (
        <AnimatedBackground style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <Animated.View
                        entering={FadeInUp.delay(300).duration(1000)}
                        style={styles.logoContainer}
                    >
                        <BrandLogo size="lg" showWordmark centered />
                        <Text style={styles.subtitle}>Keep shared records organized with the people you trust.</Text>
                    </Animated.View>

                    <Animated.View
                        entering={FadeInDown.delay(600).duration(1000)}
                        style={styles.featuresContainer}
                    >
                        <FeatureItem
                            icon={<ShieldCheck size={22} color="#1D4ED8" />}
                            text="Secure & Reliable"
                        />
                        <FeatureItem
                            icon={<Zap size={22} color="#0284C7" />}
                            text="Real-time Management"
                        />
                    </Animated.View>

                    <Animated.View
                        entering={FadeInDown.delay(900).duration(1000)}
                        style={styles.ctaContainer}
                    >
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                pressed && { transform: [{ scale: 0.98 }] }
                            ]}
                            onPress={() => router.push('/(auth)/login')}
                        >
                            <Text style={styles.buttonText}>Get Started</Text>
                            <ArrowRight size={20} color="#FFFFFF" strokeWidth={3} />
                        </Pressable>
                    </Animated.View>
                </View>

                <View style={styles.footer}>
                    <AppLegalFooter style={styles.footerText} />
                </View>
            </SafeAreaView>
        </AnimatedBackground>
    );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode, text: string }) {
    return (
        <LinearGradient
            colors={['rgba(255,255,255,0.84)', 'rgba(255,255,255,0.50)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureItem}
        >
            <View style={styles.featureIconWrap}>
                {icon}
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </LinearGradient>
    );
}

function SignalChip({ label }: { label: string }) {
    return (
        <View style={styles.signalChipPill}>
            <Text style={styles.signalChipLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    subtitle: {
        fontSize: 18,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 26,
        paddingHorizontal: 20,
        marginTop: 12,
    },
    featuresContainer: {
        width: '100%',
        marginBottom: 60,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.56)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.82)',
        shadowColor: '#334155',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
        elevation: 6,
    },
    featureIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderWidth: 1,
        borderColor: 'rgba(226,232,240,0.95)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 12,
    },
    ctaContainer: {
        width: '100%',
    },
    button: {
        backgroundColor: '#6366F1',
        height: 64,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    footer: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    footerText: {
        color: '#475569',
        fontSize: 12,
    },
    webRibbon: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: 'rgba(15,23,42,0.9)',
        alignSelf: 'flex-start',
    },
    webRibbonText: {
        color: '#DDE4FF',
        fontFamily: 'SpaceMono',
        fontSize: 11,
        letterSpacing: 1.4,
    },
    webNoticeCard: {
        padding: 22,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderWidth: 1,
        borderColor: '#C7D2FE',
        shadowColor: '#312E81',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
    },
    webNoticeEyebrow: {
        color: '#4F46E5',
        fontFamily: 'SpaceMono',
        fontSize: 11,
        letterSpacing: 1.6,
    },
    webNoticeTitle: {
        marginTop: 10,
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '900',
        color: '#111827',
        maxWidth: 720,
    },
    webNoticeBody: {
        marginTop: 10,
        fontSize: 16,
        lineHeight: 26,
        color: '#475569',
        maxWidth: 840,
    },
    webNoticeStrongLine: {
        marginTop: 10,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '900',
        color: '#1E1B4B',
        maxWidth: 840,
    },
    webMagazineGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 18,
    },
    webCarouselSection: {
        marginTop: 6,
        gap: 16,
    },
    webCarouselHeader: {
        padding: 18,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    webCarouselEyebrow: {
        fontSize: 12,
        fontWeight: '800',
        color: '#6366F1',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    webCarouselTitle: {
        marginTop: 10,
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
    },
    webCarouselBody: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 22,
        color: '#475569',
    },
    webCarouselTrack: {
        gap: 16,
        paddingVertical: 6,
        paddingHorizontal: 6,
    },
    carouselCard: {
        width: 240,
        borderRadius: 22,
        padding: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#1E1B4B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 6,
        transform: [{ scale: 0.96 }],
    },
    carouselCardActive: {
        width: 280,
        borderColor: '#6366F1',
        transform: [{ scale: 1 }],
    },
    carouselBadge: {
        width: 48,
        height: 6,
        borderRadius: 999,
        marginBottom: 14,
    },
    carouselTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    carouselSubtitle: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 20,
        color: '#475569',
    },
    carouselList: {
        marginTop: 14,
        gap: 8,
    },
    carouselLine: {
        fontSize: 12,
        lineHeight: 18,
        color: '#64748B',
    },
    webHighlights: {
        gap: 16,
    },
    webShowcase: {
        gap: 18,
    },
    webFeatureBullet: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    webFeatureBulletIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    webFeatureBulletText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 22,
        color: '#334155',
    },
    signalGrid: {
        marginTop: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    signalChipPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#EEF2FF',
    },
    signalChipLabel: {
        color: '#4F46E5',
        fontSize: 12,
        fontWeight: '800',
    },
    webSpread: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 18,
    },
    webSpreadPanel: {
        flex: 1,
        minWidth: 320,
        borderRadius: 30,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.72)',
    },
    webSectionEyebrow: {
        color: '#5B63FF',
        fontFamily: 'SpaceMono',
        fontSize: 11,
        letterSpacing: 1.8,
    },
    webSectionTitle: {
        marginTop: 12,
        color: '#0F172A',
        fontSize: 32,
        lineHeight: 36,
        fontWeight: '900',
        maxWidth: 640,
    },
    webJourneyList: {
        marginTop: 20,
        gap: 16,
    },
    journeyRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    journeyIcon: {
        width: 38,
        height: 38,
        borderRadius: 14,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    journeyCopy: {
        flex: 1,
    },
    journeyTitle: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '800',
    },
    journeyText: {
        marginTop: 6,
        color: '#475569',
        fontSize: 14,
        lineHeight: 22,
    },
    webStatColumn: {
        width: 260,
        maxWidth: '100%',
        gap: 18,
    },
    webStatBlock: {
        borderRadius: 26,
        padding: 20,
        minHeight: 160,
        justifyContent: 'space-between',
    },
    webStatNumber: {
        color: '#0F172A',
        fontSize: 56,
        lineHeight: 56,
        fontWeight: '900',
    },
    webStatCaption: {
        color: '#475569',
        fontSize: 14,
        lineHeight: 22,
    },
});
