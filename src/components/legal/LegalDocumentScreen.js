import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EmContext } from '../../contexts/EmContext';
import { i18n, tr } from '../../translate/i18n';
import AppHeader from '../common/AppHeader';
import {
  fetchLegalPage,
  getCachedLegalPage,
  groupBlocksIntoSections,
  parseHtmlBlocks,
  parseInlineTokens,
} from '../../helpers/legalHelper';

export default function LegalDocumentScreen({
  navigation,
  slug,
  fallbackTitle,
  badgeText = 'LEGAL NOTICE',
}) {
  const { ctx, ctxDil } = useContext(EmContext);
  const isDark = ctx?.isDark;

  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const activeLang =
    ctxDil === 'som' || i18n?.locale === 'som' ? 'som' : 'en';

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        // Fast instant load from memory or disk cache
        const cached = await getCachedLegalPage(slug, activeLang);
        if (cached) {
          setPageData(cached);
          setLoading(false);
          setError(null);
        } else {
          setLoading(true);
        }
      }

      try {
        const { data } = await fetchLegalPage(slug, activeLang, isRefresh);
        setPageData(data);
        setError(null);
      } catch (err) {
        // If we already have cached data, don't show full-screen error
        if (!pageData) {
          setError(err?.message || 'Failed to load document');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [slug, activeLang, pageData],
  );

  useEffect(() => {
    loadData();
  }, [slug, activeLang]);

  // Theme colors
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#252C34';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const dividerColor = isDark ? '#374151' : '#F1F5F9';
  const brandColor = '#F67922';

  // Parse HTML content into structured sections
  const sections = useMemo(() => {
    if (!pageData?.content) return [];
    const blocks = parseHtmlBlocks(pageData.content);
    return groupBlocksIntoSections(blocks);
  }, [pageData?.content]);

  // Header Title
  const headerTitle =
    pageData?.title || tr(fallbackTitle) || fallbackTitle;

  // Subtitle / metadata
  const docSubtitle = useMemo(() => {
    if (!pageData) return '';
    const parts = [];
    if (pageData.version) {
      parts.push(`Version ${pageData.version}`);
    }
    if (pageData.updated_at) {
      parts.push(`Updated: ${pageData.updated_at}`);
    }
    return parts.length > 0
      ? parts.join(' · ')
      : 'We value your trust and are committed to protecting your rights.';
  }, [pageData]);

  // Render inline rich text with bold formatting
  const renderRichText = (text, defaultStyle, boldStyle) => {
    const tokens = parseInlineTokens(text);
    if (!tokens || tokens.length === 0) return null;
    return (
      <Text style={defaultStyle}>
        {tokens.map((tok, idx) => (
          <Text
            key={idx}
            style={tok.bold ? [defaultStyle, boldStyle] : defaultStyle}>
            {tok.text}
          </Text>
        ))}
      </Text>
    );
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
        title={headerTitle}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      {loading && !pageData ? (
        <View style={[styles.centerContainer, { backgroundColor: pageBg }]}>
          <ActivityIndicator size="large" color={brandColor} />
          <Text style={[styles.loadingText, { color: subTextColor }]}>
            {tr('Loading') || 'Loading...'}
          </Text>
        </View>
      ) : error && !pageData ? (
        <View style={[styles.centerContainer, { backgroundColor: pageBg }]}>
          <View
            style={[
              styles.errorCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <Text style={[styles.errorTitle, { color: textColor }]}>
              {tr('Unable to load document') || 'Unable to load document'}
            </Text>
            <Text style={[styles.errorSub, { color: subTextColor }]}>
              {tr('Please check your internet connection and try again.') ||
                'Please check your internet connection and try again.'}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: brandColor }]}
              activeOpacity={0.8}
              onPress={() => loadData(true)}>
              <Text style={styles.retryBtnText}>
                {tr('Retry') || 'Retry'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          style={[styles.container, { backgroundColor: pageBg }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={brandColor}
              colors={[brandColor]}
            />
          }>
          <View
            style={[
              styles.documentCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            {/* Header area */}
            <View style={styles.docHeader}>
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{badgeText}</Text>
              </View>
              <Text style={[styles.docTitle, { color: textColor }]}>
                {pageData?.title || headerTitle}
              </Text>
              <Text style={[styles.docSub, { color: subTextColor }]}>
                {docSubtitle}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            {/* Continuous Sections */}
            {sections.map((sec, secIdx) => (
              <View key={secIdx} style={styles.sectionWrap}>
                {sec.title ? (
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    {sec.title}
                  </Text>
                ) : null}

                {sec.items.map((item, itemIdx) => {
                  if (item.type === 'ul' || item.type === 'ol') {
                    return (
                      <View key={itemIdx} style={styles.listContainer}>
                        {item.items.map((liText, liIdx) => (
                          <View key={liIdx} style={styles.listItemRow}>
                            <Text
                              style={[
                                styles.bulletDot,
                                { color: brandColor },
                              ]}>
                              •{' '}
                            </Text>
                            <View style={styles.listItemContent}>
                              {renderRichText(
                                liText,
                                [styles.sectionBody, { color: subTextColor }],
                                [styles.boldText, { color: textColor }],
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  }

                  // Paragraph item
                  return (
                    <View key={itemIdx} style={styles.paragraphWrap}>
                      {renderRichText(
                        item.content,
                        [styles.sectionBody, { color: subTextColor }],
                        [styles.boldText, { color: textColor }],
                      )}
                    </View>
                  );
                })}

                {secIdx < sections.length - 1 ? (
                  <View
                    style={[
                      styles.sectionDivider,
                      { backgroundColor: dividerColor },
                    ]}
                  />
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  errorCard: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  documentCard: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  docHeader: {
    marginBottom: 16,
  },
  badgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(246, 121, 34, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F67922',
    letterSpacing: 0.4,
  },
  docTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  docSub: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  sectionWrap: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  paragraphWrap: {
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 13.5,
    lineHeight: 21,
  },
  boldText: {
    fontWeight: '700',
  },
  listContainer: {
    marginTop: 4,
    marginBottom: 10,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 21,
    marginRight: 6,
  },
  listItemContent: {
    flex: 1,
  },
  sectionDivider: {
    height: 1,
    marginTop: 18,
    marginBottom: 18,
  },
});

