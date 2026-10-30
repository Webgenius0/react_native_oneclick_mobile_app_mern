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

    setSubmitting(true);
    const userAgent = getUserAgent();

    const data = {
      name: user?.ad || 'Customer',
      cardNumber: trimmedNumber,
      accountNumber: trimmedNumber,
      tutar: tutar,
      amount: tutar,
      siparis_ids: siparis_ids,
      paymentMethodType: paymentType,
      userAgent: userAgent,
      dil: i18n.locale || 'en',
    };

    console.log('Initiating WaafiPay payment:', data);

    try {
      const r = await ai.post('payment-waafipay', data);
      console.log('WaafiPay response:', r?.data);

      if (r?.data?.error === false) {
        useCartStore.getState().clearCart();
        const successMsg =
          localizeApiMessage(r?.data?.msg, 'Payment Successful') ||
          tr('Payment Successful') ||
          'Payment Successful';
        Toast.show({
          type: 'success',
          text1: tr('Payment Successful') || 'Payment Successful',
          text2: successMsg,
        });
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'AuthAfter', params: { screen: 'Orders' } }],
          }),
        );
      } else {
        const rawMsg = r?.data?.msg || r?.data?.detail;
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
      const rawError =
        err?.response?.data?.msg ||
        err?.response?.data?.detail ||
        err?.message;
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
