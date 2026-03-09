import React from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
    ArrowRight,
    BellRing,
    FolderClock,
    ShieldCheck,
    Sparkles,
    UsersRound,
    WalletCards,
    Zap,
} from 'lucide-react-native';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { BrandLogo } from '@/components/BrandLogo';
import { AppLegalFooter } from '@/components/AppLegalFooter';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PublicCard, PublicSiteLayout } from '@/components/website/PublicSiteLayout';
import { AppShowcase } from '@/components/website/AppShowcase';

const { width } = Dimensions.get('window');

export default function LandingPage() {
    const router = useRouter();

    if (Platform.OS === 'web') {
        return (
            <PublicSiteLayout
                eyebrow="Buddy Balance . Mobile Ledger . 2026"
                title="The cleanest way to track what friends owe, what you owe, and what changed."
                description="Buddy Balance turns informal lending into something readable: shared balances, friend-linked records, notifications that make sense, and premium export tools wrapped in a warm mobile-first interface."
                actions={[
                    { href: '/help-support', label: 'Explore the product' },
                    { href: '/contact', label: 'Visit support', variant: 'secondary' },
                ]}
                heroVisual={<AppShowcase />}
            >
                <View style={styles.webRibbon}>
                    <Text style={styles.webRibbonText}>
                        RETRO GLOSS . TRUSTED CONTACTS . SHARED EVENTS . HUMAN-FRIENDLY LEDGERS
                    </Text>
                </View>

                <View style={styles.webMagazineGrid}>
                    <PublicCard
                        title="A shared ledger that still feels personal"
                        description="The app was designed for real relationships, not anonymous invoicing. You can track borrowed cash, returned items, partial payments, friend links, and notification events without flattening everything into boring spreadsheet language."
                    >
                        <View style={styles.webFeatureList}>
                            <FeatureBullet
                                icon={<WalletCards size={16} color="#4F46E5" />}
                                text="Cash and item records live in the same timeline."
                            />
                            <FeatureBullet
                                icon={<BellRing size={16} color="#0EA5E9" />}
                                text="Informational events notify the other side without fake approvals."
                            />
                            <FeatureBullet
                                icon={<UsersRound size={16} color="#16A34A" />}
                                text="Friend-linked contacts stay mirrored instead of duplicating bad data."
                            />
                        </View>
                    </PublicCard>

                    <LinearGradient colors={['#111A3B', '#212B60']} style={styles.webStatementPanel}>
                        <Text style={styles.webStatementLabel}>WHY IT FEELS DIFFERENT</Text>
                        <Text style={styles.webStatementTitle}>Less fintech dashboard. More polished personal utility.</Text>
                        <Text style={styles.webStatementCopy}>
                            Buddy Balance keeps the visual softness of the mobile app while adding sharper chrome,
                            typography, and motion on the web. The result feels a little 2000s product-site, but still current.
                        </Text>
                    </LinearGradient>

                    <PublicCard
                        title="What the product emphasizes"
                        description="Instead of only showing totals, the interface foregrounds context: who acted, what changed, whether it needs approval, and whether the current state is neutral, owed, or owed-to-you."
                    >
                        <View style={styles.signalGrid}>
                            <SignalChip label="Zero balance is neutral" />
                            <SignalChip label="Header shows Premium" />
                            <SignalChip label="Contacts can add record" />
                            <SignalChip label="Admin stays separate" />
                            <SignalChip label="Biometric lock ready" />
                            <SignalChip label="CSV exports for Premium" />
                        </View>
                    </PublicCard>
                </View>

                <View style={styles.webSpread}>
                    <LinearGradient colors={['rgba(255,255,255,0.94)', 'rgba(255,255,255,0.72)']} style={styles.webSpreadPanel}>
                        <Text style={styles.webSectionEyebrow}>INSIDE THE APP</Text>
                        <Text style={styles.webSectionTitle}>Three core moments the site should sell immediately.</Text>
                        <View style={styles.webJourneyList}>
                            <JourneyRow
                                icon={<Sparkles size={16} color="#5B63FF" />}
                                title="Open balance with honest state"
                                copy="If the relationship is settled, the product treats it as neutral instead of nudging users toward a false green or red story."
                            />
                            <JourneyRow
                                icon={<UsersRound size={16} color="#16A34A" />}
                                title="Contacts become action surfaces"
                                copy="Expand a person, review history, edit details, and create a record from the same place without re-selecting the contact."
                            />
                            <JourneyRow
                                icon={<FolderClock size={16} color="#F59E0B" />}
                                title="Notifications separate signal from work"
                                copy="Approvals only appear when approval is required. Informational updates still land as visible events."
                            />
                        </View>
                    </LinearGradient>

                    <View style={styles.webStatColumn}>
                        <LinearGradient colors={['#DDE4FF', '#EEF2FF']} style={styles.webStatBlock}>
                            <Text style={styles.webStatNumber}>11</Text>
                            <Text style={styles.webStatCaption}>shared records visible in the mock home snapshot</Text>
                        </LinearGradient>

                        <LinearGradient colors={['#FFF0D1', '#FFF7EA']} style={styles.webStatBlock}>
                            <Text style={styles.webStatNumber}>2</Text>
                            <Text style={styles.webStatCaption}>public legal pages that anchor store-submission links</Text>
                        </LinearGradient>

                        <LinearGradient colors={['#DCFCE7', '#F0FDF4']} style={styles.webStatBlock}>
                            <Text style={styles.webStatNumber}>1</Text>
                            <Text style={styles.webStatCaption}>language system across mobile, support, and policy pages</Text>
                        </LinearGradient>
                    </View>
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
                        <Text style={styles.subtitle}>Hassle-free lending, for your loved ones.</Text>
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

function FeatureBullet({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <View style={styles.webFeatureBullet}>
            <View style={styles.webFeatureBulletIcon}>{icon}</View>
            <Text style={styles.webFeatureBulletText}>{text}</Text>
        </View>
    );
}

function SignalChip({ label }: { label: string }) {
    return (
        <View style={styles.signalChipPill}>
            <Text style={styles.signalChipLabel}>{label}</Text>
        </View>
    );
}

function JourneyRow({
    icon,
    title,
    copy,
}: {
    icon: React.ReactNode;
    title: string;
    copy: string;
}) {
    return (
        <View style={styles.journeyRow}>
            <View style={styles.journeyIcon}>{icon}</View>
            <View style={styles.journeyCopy}>
                <Text style={styles.journeyTitle}>{title}</Text>
                <Text style={styles.journeyText}>{copy}</Text>
            </View>
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
    webMagazineGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 18,
    },
    webFeatureList: {
        marginTop: 16,
        gap: 12,
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
    webStatementPanel: {
        flex: 1,
        minWidth: 280,
        borderRadius: 28,
        padding: 24,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.18,
        shadowRadius: 30,
        elevation: 12,
    },
    webStatementLabel: {
        color: '#A5B4FC',
        fontFamily: 'SpaceMono',
        fontSize: 11,
        letterSpacing: 1.6,
    },
    webStatementTitle: {
        marginTop: 14,
        color: '#FFFFFF',
        fontSize: 30,
        lineHeight: 34,
        fontWeight: '900',
    },
    webStatementCopy: {
        marginTop: 14,
        color: '#CBD5E1',
        fontSize: 15,
        lineHeight: 25,
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
