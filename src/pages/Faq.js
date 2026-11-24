import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  LayoutAnimation,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { EmContext } from '../contexts/EmContext';
import { i18n, tr } from '../translate/i18n';
import AppHeader from '../components/common/AppHeader';
import ai from '../helpers/ai';

import ChevronRightIcon from '../assets/svg/chevron_right.svg';
import SupportIcon from '../assets/svg/support.svg';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
  {
    id: 1,
    category: 'Orders',
    q: 'How do I place an international order?',
    a: 'You can browse any of our integrated international stores (like Amazon, iHerb, YesStyle, Shein), add products to your cart, and proceed to checkout. Alternatively, copy any product link and paste it into the app search bar to order directly.',
  },
  {
    id: 2,
    category: 'Shipping',
    q: 'How long does international shipping take?',
    a: 'Delivery typically takes between 7 to 14 business days depending on the store and your city. Once your order arrives at our local warehouse, our courier will deliver it right to your door.',
  },
  {
    id: 3,
    category: 'Shipping',
    q: 'How do I track my delivery status?',
    a: 'Go to the Orders tab in the bottom navigation. Tap on any order to see real-time milestone updates from purchase to customs clearance and final doorstep delivery.',
  },
  {
    id: 4,
    category: 'Payment',
    q: 'What payment methods do you accept?',
    a: 'We accept international Credit/Debit Cards (Visa, MasterCard, Troy) as well as popular local mobile wallets such as E-Dahab, WaafiPay, and ZAAD service.',
  },
  {
    id: 5,
    category: 'Orders',
    q: 'Can I cancel or modify my order after paying?',
    a: 'Orders can be cancelled or modified within 2 hours of payment before our purchasing team processes the item with the foreign store. Please contact us via Contact 1 Click immediately.',
  },
  {
    id: 6,
    category: 'Customs',
    q: 'Are customs and import taxes included?',
    a: 'Yes! 1 Click takes care of all international customs clearance, paperwork, and shipping formalities. All fees are clearly presented during checkout with no unexpected charges upon arrival.',
  },
  {
    id: 7,
    category: 'Returns',
    q: 'What is your return and refund policy?',
    a: 'If your item arrives damaged, defective, or incorrect, contact our support team within 48 hours of delivery with photos of the package. We will process a full replacement or refund.',
  },
];

export default function Faq({ navigation }) {
  const { ctx, ctxDil } = useContext(EmContext);
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const activeLang = ctxDil || i18n.locale || 'en';

  const fetchFaqs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const langParam = ['en', 'som'].includes(activeLang) ? activeLang : 'en';
      const res = await ai.get('faq', {
        params: {
          lang: langParam,
        },
      });

      if (res?.data && res.data.error === false && Array.isArray(res.data.faqs) && res.data.faqs.length > 0) {
        const mapped = res.data.faqs.map((f, i) => ({
          id: f.id || i,
          category: f.category || 'General',
          q: f.question || f.question_en || f.q || '',
          a: f.answer || f.answer_en || f.a || '',
        }));
        setFaqs(mapped);

        if (Array.isArray(res.data.categories) && res.data.categories.length > 0) {
          setCategories(res.data.categories);
        } else {
          const uniqueCats = Array.from(new Set(mapped.map(item => item.category).filter(Boolean)));
          setCategories(uniqueCats);
        }
      } else {
        // Fallback to local default FAQ
        setFaqs(FAQ_DATA);
        setCategories(['General', 'Orders', 'Payment', 'Shipping', 'Customs', 'Returns']);
      }
    } catch (e) {
      console.log('FAQ fetch error:', e?.message || e);
      setFaqs(FAQ_DATA);
      setCategories(['General', 'Orders', 'Payment', 'Shipping', 'Customs', 'Returns']);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeLang]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#252C34';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  const toggleExpand = id => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
  };

  const filteredFaqs = useMemo(() => {
    return faqs.filter(item => {
      const matchCat =
        selectedCategory === 'All' ||
        String(item.category).toLowerCase() === String(selectedCategory).toLowerCase();

      const qText = (item.q || '').toLowerCase();
      const aText = (item.a || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchQuery = !query || qText.includes(query) || aText.includes(query);

      return matchCat && matchQuery;
    });
  }, [faqs, selectedCategory, searchQuery]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      <AppHeader
        navigation={navigation}
        showBack={true}
        title={tr('FAQ') || 'FAQ'}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: pageBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchFaqs(true)}
            colors={['#F67922']}
            tintColor="#F67922"
          />
        }>
        {/* Search Bar */}
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder={tr('Search frequently asked questions...') || 'Search questions...'}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: subTextColor, fontSize: 16, paddingHorizontal: 6 }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Categories Horizontal Tabs */}
        {categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setSelectedCategory('All')}
              style={[
                styles.categoryPill,
                { backgroundColor: cardBg, borderColor: borderColor },
                selectedCategory === 'All' && styles.categoryPillActive,
              ]}>
              <Text
                style={[
                  styles.categoryPillText,
                  { color: textColor },
                  selectedCategory === 'All' && styles.categoryPillTextActive,
                ]}>
                {tr('All') || 'All'}
              </Text>
            </TouchableOpacity>

            {categories.map((cat, idx) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.75}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryPill,
                    { backgroundColor: cardBg, borderColor: borderColor },
                    isSelected && styles.categoryPillActive,
                  ]}>
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: textColor },
                      isSelected && styles.categoryPillTextActive,
                    ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Loading Spinner */}
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F67922" />
          </View>
        ) : (
          /* FAQ Accordion List */
          <View style={styles.faqList}>
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((item, idx) => {
                const isExpanded = expandedId === item.id;
                return (
                  <View
                    key={item.id ?? idx}
                    style={[
                      styles.faqCard,
                      { backgroundColor: cardBg, borderColor: borderColor },
                    ]}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.faqHeader}
                      onPress={() => toggleExpand(item.id)}>
                      <Text style={[styles.faqQuestion, { color: textColor }]}>
                        {item.q}
                      </Text>
                      <View
                        style={{
                          transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
                        }}>
                        <ChevronRightIcon width={18} height={18} />
                      </View>
                    </TouchableOpacity>

                    {isExpanded ? (
                      <View style={styles.faqAnswerWrap}>
                        <Text style={[styles.faqAnswer, { color: subTextColor }]}>
                          {item.a}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ color: subTextColor, fontSize: 14 }}>
                  {tr('No matching questions found') || 'No matching questions found.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bottom Help Card */}
        <View
          style={[
            styles.contactCtaCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <View style={styles.ctaIconWrap}>
            <SupportIcon width={28} height={28} fill="#F67922" />
          </View>
          <Text style={[styles.ctaTitle, { color: textColor }]}>
            {tr('Still have questions?') || 'Still have questions?'}
          </Text>
          <Text style={[styles.ctaSub, { color: subTextColor }]}>
            {tr("Can't find the answer you're looking for? Reach out to our 1 Click support team.") ||
              "Can't find the answer you're looking for? Reach out to our 1 Click support team."}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('ContactOneClick')}>
            <Text style={styles.ctaBtnText}>
              {tr('Contact 1 Click Support') || 'Contact 1 Click Support'}
            </Text>
          </TouchableOpacity>
        </View>
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

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 10,
    fontSize: 14,
  },

  categoryScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillActive: {
    backgroundColor: '#F67922',
    borderColor: '#F67922',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  faqList: {
    gap: 12,
    marginBottom: 24,
  },
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    marginRight: 10,
    lineHeight: 20,
  },
  faqAnswerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswer: {
    fontSize: 13.5,
    lineHeight: 20,
  },

  contactCtaCard: {
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    alignItems: 'center',
  },
  ctaIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  ctaSub: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  ctaBtn: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F67922',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
