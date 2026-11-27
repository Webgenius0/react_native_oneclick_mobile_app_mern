import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr, localizeApiMessage, i18n } from '../translate/i18n';
import Toast from 'react-native-toast-message';
import ai from '../helpers/ai';
import { CommonActions } from '@react-navigation/native';
import { IS_LOCAL } from '../../config';
import { getUserAgent, round } from '../helpers/common';
import { useCartStore } from '../store/useCartStore';
import { useUserStore } from '../store/useUserStore';
import AppHeader from '../components/common/AppHeader';
import PaymentSuccessModal from '../components/common/PaymentSuccessModal';
import { EmContext } from '../contexts/EmContext';

export default function WaafiPay({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);
  const user = useUserStore(state => state.user);

  const paymentType = 'mwallet';
  const fill = (__DEV__ && IS_LOCAL) || false;
  const defaultAccountNumber = fill ? '252615214249' : user?.telefon || '';

  const rawOrderIds =
    route?.params?.siparis_ids ??
    route?.params?.siparis_id ??
    route?.params?.order_ids ??
    route?.params?.order_id ??
    '';

  const normalizedOrderIds = Array.isArray(rawOrderIds)
    ? rawOrderIds.filter(id => id !== null && id !== undefined && id !== '').join(',')
    : String(rawOrderIds || '');

  const [accountNumber, setAccountNumber] = useState(defaultAccountNumber);
  const [tutar, setTutar] = useState(route?.params?.tutar || 0);
  const [siparis_ids, setSiparis_ids] = useState(normalizedOrderIds);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleCancel = () => {
    setSubmitting(false);
    navigation.goBack();
  };

  const handleViewOrders = () => {
    setShowSuccessModal(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'AuthAfter', params: { screen: 'Orders' } }],
      }),
    );
  };

  const handleContinueShopping = () => {
    setShowSuccessModal(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'AuthAfter', params: { screen: 'Home' } }],
      }),
    );
  };

  const handlePay = async () => {
    Keyboard.dismiss();

    if (submitting) return false;

    const trimmedNumber = accountNumber.trim();
    if (!trimmedNumber) {
      Toast.show({
        type: 'error',
        text1: tr('Required Field') || 'Required Field',
        text2:
          tr('Please enter your account / phone number') ||
          'Please enter your account / phone number',
        text2Style: { fontSize: 14, color: '#000' },
      });
      return false;
    }

    const activeOrderIds =
      (Array.isArray(siparis_ids)
        ? siparis_ids.filter(id => id !== null && id !== undefined && id !== '').join(',')
        : String(siparis_ids || '').trim()) || normalizedOrderIds;

    if (!activeOrderIds) {
      Toast.show({
        type: 'error',
        text1: tr('Payment Error') || 'Payment Error',
        text2:
          tr('Order ID is missing. Please select an order to pay.') ||
          'Order ID is missing. Please select an order to pay.',
        text2Style: { fontSize: 14, color: '#000', width: '100%' },
      });
      return false;
    }

    setSubmitting(true);
    const userAgent = getUserAgent();

    const numericTutar = Number(String(tutar).replace(/[^0-9.]/g, '')) || 0;
    const anaTutar = route?.params?.ana_tutar ? Number(route.params.ana_tutar) : numericTutar;
    const komisyonTutar = route?.params?.komisyon_tutar ? Number(route.params.komisyon_tutar) : 0;
    const komisyonYuzde = route?.params?.komisyonYuzde ? Number(route.params.komisyonYuzde) : 0;

    const data = {
      name: user?.ad || 'Customer',
      cardNumber: trimmedNumber,
      accountNumber: trimmedNumber,
      tutar: numericTutar || tutar,
      amount: numericTutar || tutar,
      ana_tutar: anaTutar,
      komisyon_tutar: komisyonTutar,
      komisyon_yuzde: komisyonYuzde,
      siparis_ids: activeOrderIds,
      order_ids: activeOrderIds,
      siparis_id: activeOrderIds,
      paymentMethodType: paymentType,
      userAgent: userAgent,
      dil: i18n.locale || 'en',
    };

    console.log('Initiating WaafiPay payment:', data);

    try {
      let r = await ai.post('payment-waafipay', data);
      console.log('WaafiPay response:', r?.data);

      // Handle "Ödeme tutarı değişti; lütfen siparişleri yenileyiniz" by auto-synchronizing
      const initialRawMsg = r?.data?.msg || r?.data?.detail || '';
      const isAmountChanged =
        initialRawMsg.includes('tutarı değişti') ||
        initialRawMsg.includes('tutari degisti') ||
        initialRawMsg.includes('yenileyiniz') ||
        initialRawMsg.toLowerCase().includes('amount changed');

      if (r?.data?.error === true && isAmountChanged) {
        console.log('WaafiPay amount change detected from server. Auto-synchronizing from database...');
        try {
          const syncRes = await ai.post('orders-unpaid', {
            siparis_id: route?.params?.siparis_id || (activeOrderIds.includes(',') ? null : activeOrderIds),
            grupID: route?.params?.grupID || null,
          });

          if (syncRes?.data?.error === false && Array.isArray(syncRes?.data?.ss)) {
            const activeList = activeOrderIds.split(',').map(s => s.trim()).filter(Boolean);
            let freshBase = 0;
            syncRes.data.ss.forEach(item => {
              if (activeList.includes(String(item.id)) || activeList.length === 0) {
                freshBase += parseFloat(item.tutar ?? item.tutar_usd ?? 0) || 0;
              }
            });
            if (syncRes.data.grup && syncRes.data.grup.nakliye_usd > 0) {
              freshBase += parseFloat(syncRes.data.grup.nakliye_usd);
            }

            let effectivePct = komisyonYuzde;
            let effectiveFixed = 0;
            try {
              const mRes = await ai.get('payment-methods');
              if (mRes?.data?.error === false && Array.isArray(mRes?.data?.ss)) {
                const wMethod = mRes.data.ss.find(x => (x?.ad || x?.target || '').toLowerCase().includes('waafi'));
                if (wMethod) {
                  effectivePct = parseFloat(wMethod.komisyonYuzde) || 0;
                  effectiveFixed = parseFloat(wMethod.komisyonFixed) || 0;
                }
              }
            } catch (_) {}

            let freshKom = 0;
            if (effectivePct > 0) {
              freshKom = round(freshBase * (effectivePct / 100));
            } else if (effectiveFixed > 0) {
              freshKom = effectiveFixed;
            }
            const freshTotal = round(freshBase + freshKom);

            if (freshTotal > 0 && Math.abs(freshTotal - numericTutar) > 0.001) {
              console.log(`Auto-retrying WaafiPay with synchronized amount: $${freshTotal.toFixed(2)}`);
              setTutar(freshTotal.toFixed(2));

              const retryData = {
                ...data,
                tutar: freshTotal.toFixed(2),
                amount: freshTotal.toFixed(2),
                ana_tutar: freshBase.toFixed(2),
                komisyon_tutar: freshKom,
                komisyon_yuzde: effectivePct,
              };
              r = await ai.post('payment-waafipay', retryData);
              console.log('WaafiPay retry response:', r?.data);
            }
          }
        } catch (syncErr) {
          console.log('Error auto-syncing orders on amount change:', syncErr);
        }
      }

      // IMPORTANT: Only show success when backend explicitly confirms error === false.
      // Never treat a missing/truthy error flag as success.
      if (r?.data?.error === false) {
        setSubmitting(false);
        useCartStore.getState().clearCart();
        setShowSuccessModal(true);
        return;
      } else {
        // Payment definitively failed — log and show error. Order stays unpaid (durum=16).
        console.warn('WaafiPay payment not successful. Response:', JSON.stringify(r?.data));
        const rawMsg =
          r?.data?.responseMsg ||
          r?.data?.r?.message ||
          r?.data?.r?.msg ||
          r?.data?.message ||
          (r?.data?.msg && !r.data.msg.toLowerCase().includes('başarısız') && !r.data.msg.toLowerCase().includes('basarisiz') ? r.data.msg : null) ||
          r?.data?.detail ||
          r?.data?.msg ||
          'Payment Failed';
        const errorMsg = localizeApiMessage(rawMsg, 'Payment Failed');
        Toast.show({
          type: 'error',
          text1: tr('Payment Failed') || 'Payment Failed',
          text2: errorMsg,
          text2Style: { fontSize: 14, color: '#000', width: '100%' },
        });
      }
    } catch (err) {
      console.error('WaafiPay error:', err);
      const resData = err?.response?.data;
      const rawError =
        resData?.responseMsg ||
        resData?.r?.message ||
        resData?.r?.msg ||
        resData?.message ||
        (resData?.msg && !resData.msg.toLowerCase().includes('başarısız') && !resData.msg.toLowerCase().includes('basarisiz') ? resData.msg : null) ||
        resData?.detail ||
        resData?.msg ||
        err?.message ||
        'Payment Failed';
      const errorMsg = localizeApiMessage(rawError, 'Payment Failed');
      Toast.show({
        type: 'error',
        text1: tr('Payment Error') || 'Payment Error',
        text2: errorMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E2E8F0';
  const inputBg = isDark ? '#374151' : '#FFFFFF';
  const exampleBg = isDark ? '#111827' : '#F1F5F9';
  const exampleTextColor = isDark ? '#E2E8F0' : '#334155';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      <AppHeader
        navigation={navigation}
        showBack={true}
        onBackPress={handleCancel}
        title={tutar ? `WaafiPay $${tutar}` : 'WaafiPay'}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: pageBg }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Brand & Amount Card */}
        <View
          style={[
            styles.brandCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <View style={styles.logoRow}>
            <View style={[styles.logoWrap, { borderColor: borderColor }]}>
              <Image
                source={require('../assets/img/waafipay.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandTitleCol}>
              <Text style={[styles.brandTitle, { color: textColor }]}>
                WaafiPay ${tutar}
              </Text>
              <Text style={[styles.brandSub, { color: subTextColor }]}>
                Mobile Wallet & Direct Checkout
              </Text>
            </View>
          </View>

          <View style={[styles.amountBox, { borderTopColor: borderColor }]}>
            <Text style={[styles.amountLabel, { color: subTextColor }]}>
              {tr('Total Amount') || 'Total Amount'}
            </Text>
            <Text style={styles.amountValue}>${tutar} USD</Text>
          </View>
        </View>

        {/* Input & Examples Card */}
        <View
          style={[
            styles.inputCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <Text style={[styles.cardHeaderTitle, { color: textColor }]}>
            {tr('Phone') || 'Phone'}
          </Text>

          <Text style={[styles.cardSubtitle, { color: subTextColor }]}>
            WaafiPay - ZAAD, EVC+ iyo SAHAL
          </Text>

          {/* Example Box with Number Format Instructions */}
          <View
            style={[
              styles.exampleBox,
              { backgroundColor: exampleBg, borderColor: borderColor },
            ]}>
            <Text style={[styles.exampleText, { color: exampleTextColor }]}>
              {tr('waafi_info') ||
                'Please enter your number as\nZaad 063xxxxx\nEvc 061xxxx\nSahal 090xxxxxx\nLater Reply to outgoing messages.'}
            </Text>
          </View>

          {/* Phone Input */}
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: inputBg, borderColor: borderColor },
            ]}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                stroke="#64748B"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <TextInput
              style={[styles.textInput, { color: textColor }]}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder={tr('Phone') || 'Phone'}
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              editable={!submitting}
            />
          </View>
        </View>

        {/* Action Buttons (Consistent with EDahab & 1 Click design system) */}
        <View style={styles.actionWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePay}
            disabled={submitting}
            style={[styles.payBtn, submitting && styles.payBtnDisabled]}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.payBtnText}>
                {tr('Pay') || 'Pay'} ${tutar}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCancel}
            disabled={submitting}
            style={[styles.cancelBtn, { borderColor: borderColor }]}>
            <Text style={[styles.cancelBtnText, { color: subTextColor }]}>
              {tr('Cancel') || 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        visible={showSuccessModal}
        amount={tutar}
        currency="USD"
        paymentMethod="WaafiPay"
        phoneNumber={accountNumber}
        onViewOrders={handleViewOrders}
        onContinueShopping={handleContinueShopping}
      />
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
    padding: 16,
    paddingBottom: 40,
  },
  brandCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoWrap: {
    width: 68,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  logoImg: {
    width: 52,
    height: 30,
  },
  brandTitleCol: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  brandSub: {
    fontSize: 13,
  },
  amountBox: {
    borderTopWidth: 1,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 14,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F67922',
  },
  inputCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 14,
  },
  exampleBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 10,
    padding: 0,
  },
  actionWrap: {
    rowGap: 12,
  },
  payBtn: {
    backgroundColor: '#F67922',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
