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
import { tr } from '../translate/i18n';
import Toast from 'react-native-toast-message';
import ai from '../helpers/ai';
import { CommonActions } from '@react-navigation/native';
import { IS_LOCAL } from '../../config';
import { getUserAgent } from '../helpers/common';
import { useCartStore } from '../store/useCartStore';
import { useUserStore } from '../store/useUserStore';
import AppHeader from '../components/common/AppHeader';
import { EmContext } from '../contexts/EmContext';

export default function WaafiPay({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);
  const user = useUserStore(state => state.user);

  const paymentType = 'mwallet';
  const fill = (__DEV__ && IS_LOCAL) || false;
  const defaultAccountNumber = fill ? '252615214249' : user?.telefon || '';

  const [accountNumber, setAccountNumber] = useState(defaultAccountNumber);
  const [tutar, setTutar] = useState(route?.params?.tutar || 0);
  const [siparis_ids, setSiparis_ids] = useState(
    route?.params?.siparis_ids || '',
  );
  const [submitting, setSubmitting] = useState(false);

  const handleCancel = () => {
    setSubmitting(false);
    navigation.goBack();
  };

  const handlePay = async () => {
    Keyboard.dismiss();

    if (submitting) return false;

    if (!accountNumber.trim()) {
      Toast.show({
        type: 'error',
        text1: tr('Hata Oluştu') || 'Required Field',
        text2: tr('Lütfen telefon numaranızı girin') || 'Please enter your account / phone number',
        text2Style: { fontSize: 14, color: '#000' },
      });
      return false;
    }

    setSubmitting(true);
    const userAgent = getUserAgent();

    const data = {
      name: user?.ad || 'Customer',
      cardNumber: accountNumber.trim(),
      accountNumber: accountNumber.trim(),
      tutar: tutar,
      amount: tutar,
      siparis_ids: siparis_ids,
      paymentMethodType: paymentType,
      userAgent: userAgent,
    };

    console.log('Initiating WaafiPay payment:', data);

    try {
      const r = await ai.post('payment-waafipay', data);
      console.log('WaafiPay response:', r?.data);

      if (r?.data?.error === false) {
        useCartStore.getState().clearCart();
        Toast.show({
          type: 'success',
          text1: tr('Ödeme Başarılı') || 'Payment Successful',
          text2: r?.data?.msg || tr('Ödeme Başarılı') || 'Payment Successful',
        });
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'AuthAfter', params: { screen: 'Orders' } }],
          }),
        );
      } else {
        const errorMsg =
          r?.data?.msg || r?.data?.detail || tr('Ödeme Başarısız') || 'Payment Failed';
        Toast.show({
          type: 'error',
          text1: tr('Ödeme Başarısız') || 'Payment Failed',
          text2: errorMsg,
          text2Style: { fontSize: 14, color: '#000', width: '100%' },
        });
      }
    } catch (err) {
      console.error('WaafiPay error:', err);
      Toast.show({
        type: 'error',
        text1: tr('Hata Oluştu') || 'Payment Error',
        text2: err?.response?.data?.msg || err?.message || tr('Ödeme Başarısız') || 'Payment Failed',
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
  const borderColor = isDark ? '#374151' : '#F1F5F9';
  const inputBg = isDark ? '#374151' : '#F8FAFC';

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
        title={tr('WaafiPay Payment') || 'WaafiPay Payment'}
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
                WaafiPay / ZAAD Service
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

        {/* Input Card */}
        <View
          style={[
            styles.inputCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <Text style={[styles.cardHeaderTitle, { color: textColor }]}>
            {tr('Phone Number') || 'ZAAD / WaafiPay Account Number'}
          </Text>

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
              placeholder="e.g. 252615214249"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              editable={!submitting}
            />
          </View>

          {/* Info Notice */}
          <View style={styles.infoNoticeBox}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01"
                stroke="#F67922"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.infoNoticeText}>
              {tr(
                'Enter your registered WaafiPay or ZAAD mobile number. You will receive a direct payment prompt on your phone.',
              ) ||
                'Enter your registered WaafiPay or ZAAD mobile number. You will receive a direct payment prompt on your phone.'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
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
              {tr('İptal') || 'Cancel'}
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
    fontSize: 16,
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
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 10,
    padding: 0,
  },
  infoNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    padding: 12,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#9A3412',
    marginLeft: 8,
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
