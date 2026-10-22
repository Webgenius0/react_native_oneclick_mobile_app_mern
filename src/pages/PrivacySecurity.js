import React, { useContext } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { EmContext } from '../contexts/EmContext';
import { tr } from '../translate/i18n';

export default function PrivacySecurity({ navigation }) {
  const { ctx } = useContext(EmContext);

  const isDark = ctx.isDark;
  const pageBg = isDark ? '#111827' : '#FFFFFF';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#94A3B8';
  const borderColor = isDark ? '#374151' : '#E2E8F0';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={pageBg}
      />

      {/* Top Header Bar with Centered Title */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { borderColor, backgroundColor: cardBg }]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke={textColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: textColor }]}>
          {tr('Privacy & Security') || 'Privacy & Security'}
        </Text>

        {/* Balance Spacer */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: pageBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Card 1: Change Password */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.menuCard, { backgroundColor: cardBg, borderColor }]}
          onPress={() => navigation.navigate('ChangePassword')}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconWrap, { backgroundColor: '#FFF8F3' }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Rect x={4} y={11} width={16} height={11} rx={2} stroke="#F67922" strokeWidth={2} />
                <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#F67922" strokeWidth={2} strokeLinecap="round" />
                <Path d="M12 15v3" stroke="#F67922" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                {tr('Change Password') || 'Change Password'}
              </Text>
              <Text style={[styles.cardSub, { color: subTextColor }]}>
                {tr('Updated your account password') || 'Updated your account password'}
              </Text>
            </View>
          </View>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 18l6-6-6-6"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        {/* Card 2: Privacy Policy */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.menuCard, { backgroundColor: cardBg, borderColor }]}
          onPress={() => navigation.navigate('PrivacyPolicy')}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconWrap, { backgroundColor: '#FFF8F3' }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  stroke="#F67922"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                {tr('Privacy Policy') || 'Privacy Policy'}
              </Text>
              <Text style={[styles.cardSub, { color: subTextColor }]}>
                {tr('Read our privacy policy') || 'Read our privacy policy'}
              </Text>
            </View>
          </View>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 18l6-6-6-6"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        {/* Card 3: Delete Account */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.menuCard, { backgroundColor: cardBg, borderColor }]}
          onPress={() => navigation.navigate('DeleteAccount')}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconWrap, { backgroundColor: '#FEF2F2' }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  stroke="#EF4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M10 11v6M14 11v6"
                  stroke="#EF4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                {tr('Delete Account') || 'Delete Account'}
              </Text>
              <Text style={[styles.cardSub, { color: subTextColor }]}>
                {tr('Permanently delete your account') || 'Permanently delete your account'}
              </Text>
            </View>
          </View>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 18l6-6-6-6"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  cardSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
});
