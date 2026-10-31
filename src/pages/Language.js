import React, { useContext, useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EmContext } from '../contexts/EmContext';
import { availableLanguages, i18n, tr } from '../translate/i18n';
import { storageSet } from '../helpers/storage';
import { getFcmToken, fcmUpdate } from '../helpers/notification';
import AppHeader from '../components/common/AppHeader';

import GlobeIcon from '../assets/svg/menu_globe.svg';

const LANGUAGES = [
  { id: 'en', title: 'English' },
  { id: 'som', title: 'Soomaali' },
];

export default function Language({ navigation }) {
  const { ctx, ctxDil, setCtxDil } = useContext(EmContext);
  const [selectedLang, setSelectedLang] = useState(ctxDil || 'en');
  const [saving, setSaving] = useState(false);

  const isDark = ctx.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#252C34';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const activeBorder = '#F67922';

  const handleSelectLanguage = async langId => {
    setSelectedLang(langId);
    setSaving(true);
    try {
      await storageSet('language', langId);
      i18n.locale = langId;
      setCtxDil(langId);

      const fcmToken = await getFcmToken();
      if (fcmToken) {
        await fcmUpdate(fcmToken, true);
      }
    } catch (e) {
      // safe fallback
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      <AppHeader
        navigation={navigation}
        showBack={true}
        title={tr('Language') || 'Language'}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: pageBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Intro Info Card */}
        <View
          style={[
            styles.introCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <View style={styles.globeWrap}>
            <GlobeIcon width={28} height={28} />
          </View>
          <Text style={[styles.introTitle, { color: textColor }]}>
            {tr('Select Language') || 'Select Language'}
          </Text>
          <Text style={[styles.introSub, { color: subTextColor }]}>
            {tr('Choose your preferred language') ||
              'Choose your preferred language. The app interface and notifications will update immediately.'}
          </Text>
        </View>

        {/* Languages List */}
        <View style={styles.langList}>
          {LANGUAGES.map(item => {
            const isSelected = selectedLang === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                style={[
                  styles.langCard,
                  {
                    backgroundColor: cardBg,
                    borderColor: isSelected ? activeBorder : borderColor,
                  },
                  isSelected && styles.langCardSelected,
                ]}
                onPress={() => handleSelectLanguage(item.id)}>
                <View style={styles.langLeft}>
                  <Text
                    style={[
                      styles.langTitle,
                      { color: textColor },
                      isSelected && { color: '#F67922' },
                    ]}>
                    {item.title}
                  </Text>
                </View>

                {/* Radio Indicator */}
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: isSelected ? '#F67922' : borderColor },
                  ]}>
                  {isSelected ? <View style={styles.radioInner} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Done / Confirm Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.doneBtn}
          onPress={() => navigation.goBack()}>
          <Text style={styles.doneBtnText}>
            {tr('Done') || 'Done'}
          </Text>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  introCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  globeWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  introTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  introSub: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  langList: {
    gap: 12,
    marginBottom: 24,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  langCardSelected: {
    backgroundColor: 'rgba(246, 121, 34, 0.04)',
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  langTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F67922',
  },

  doneBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F67922',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F67922',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
