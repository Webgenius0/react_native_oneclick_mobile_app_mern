import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Modal,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, tr, localizeApiMessage, i18n } from '../translate/i18n';
import Toast from 'react-native-toast-message';
import ai from '../helpers/ai';
import { CommonActions } from '@react-navigation/native';
import { IS_LOCAL } from '../../config';
import { delay, getUserAgent, round } from '../helpers/common';
import { useCartStore } from '../store/useCartStore';
import { useUserStore } from '../store/useUserStore';
import AppHeader from '../components/common/AppHeader';
import { EmContext } from '../contexts/EmContext';

export default function EDahab({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);
  const user = useUserStore(state => state.user);

  const paymentType = 'mwallet';
  const fill = (__DEV__ && IS_LOCAL) || false;
  const defaultPhoneNumber = fill ? '657654580' : user?.telefon || '';

  const rawOrderIds =
    route?.params?.siparis_ids ??
    route?.params?.siparis_id ??
    route?.params?.order_ids ??
    route?.params?.order_id ??
    '';

  const initialNormalizedOrderIds = Array.isArray(rawOrderIds)
    ? rawOrderIds.filter(id => id !== null && id !== undefined && id !== '').join(',')
    : String(rawOrderIds || '');

  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const tutar = route?.params?.tutar || 0;
  const anaTutar = route?.params?.ana_tutar || 0;
  const komisyonTutar = route?.params?.komisyon_tutar || 0;
  const [invoiceId, setInvoiceId] = useState(route?.params?.invoiceId || '');
  const [siparis_ids, setSiparis_ids] = useState(initialNormalizedOrderIds);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [odemeID, setOdemeID] = useState('');

  const isCancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
    };
  }, []);

  const handleCancel = () => {
    isCancelledRef.current = true;
    setPolling(false);
    setSubmitting(false);
    navigation.goBack();
  };

  const handleCancelPolling = () => {
    isCancelledRef.current = true;
    setPolling(false);
    setSubmitting(false);
  };

  const runPollingLoop = async (currentOdemeId, currentInvoiceId, basePayload) => {
    const startTime = Date.now();
    const timeoutSeconds = 60;
    const timeoutMs = timeoutSeconds * 1000;
    const pollIntervalMs = 2500;

    while (Date.now() - startTime < timeoutMs && !isCancelledRef.current) {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      setCountdown(Math.max(0, timeoutSeconds - elapsedSeconds));

      await delay(pollIntervalMs);

      if (isCancelledRef.current) break;

      try {
        const pollRes = await ai.post('payment-edahab', {
          ...basePayload,
          odemeID: currentOdemeId,
          invoiceId: currentInvoiceId,
        });

        const resData = pollRes?.data;
        console.log('eDahab pollRes:', resData);

        if (resData?.error === false) {
          setPolling(false);
          setSubmitting(false);
          useCartStore.getState().clearCart();

          Toast.show({
            type: 'success',
            text1: tr('Payment Successful') || 'Payment Successful',
            text2: resData?.msg || tr('Payment Successful') || 'Payment Successful',
          });

          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'AuthAfter', params: { screen: 'Orders' } }],
            }),
          );
          return;
        }

        if (resData?.pending === true) {
          continue;
        }

        setPolling(false);
        setSubmitting(false);
        const errorMsg = localizeApiMessage(
          resData?.msg || resData?.detail,
          'Payment could not be completed.',
        );
        Toast.show({
          type: 'error',
          text1: tr('Payment Failed') || 'Payment Failed',
          text2: errorMsg,
          text2Style: { fontSize: 14, color: '#000', width: '100%' },
        });
        return;
      } catch (pollErr) {
        console.warn('eDahab polling network notice:', pollErr?.message || pollErr);
      }
    }

    if (!isCancelledRef.current) {
      setPolling(false);
      setSubmitting(false);
      Toast.show({
        type: 'error',
        text1: tr('Timeout') || 'Timeout',
        text2: t('edahab_timeout_msg') || 'Verification timed out. Please try again.',
        text2Style: { fontSize: 14, color: '#000', width: '100%' },
      });
    }
  };

  const handlePay = async () => {
    Keyboard.dismiss();

    if (submitting || polling) return false;

    if (!phoneNumber.trim()) {
      Toast.show({
        type: 'error',
        text1: tr('Required Field') || 'Required Field',
        text2: tr('Please enter your phone number') || 'Please enter your phone number',
        text2Style: { fontSize: 14, color: '#000' },
      });
      return false;
    }

    isCancelledRef.current = false;
    setSubmitting(true);

    await delay(300);

    const userAgent = getUserAgent();
    const normalizedOrderIds =
      (Array.isArray(siparis_ids)
        ? siparis_ids.filter(id => id !== null && id !== undefined && id !== '').join(',')
        : String(siparis_ids || '').trim()) || initialNormalizedOrderIds;

    if (!normalizedOrderIds) {
      setSubmitting(false);
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

    const numericTutar = Number(String(tutar).replace(/[^0-9.]/g, '')) || 0;

    const basePayload = {
      phoneNumber: phoneNumber.trim(),
      cardNumber: phoneNumber.trim(),
      accountNumber: phoneNumber.trim(),
      tutar: numericTutar,
      amount: numericTutar,
      ana_tutar: anaTutar,
      komisyon_tutar: komisyonTutar,
      komisyon_yuzde: route?.params?.komisyonYuzde || 0,
      siparis_ids: normalizedOrderIds,
      order_ids: normalizedOrderIds,
      siparis_id: normalizedOrderIds,
      paymentMethodType: paymentType,
      userAgent: userAgent,
      dil: i18n.locale || 'en',
    };

    console.log('Initiating eDahab payment:', basePayload);

    try {
      const r = await ai.post('payment-edahab', {
        ...basePayload,
        odemeID: 0,
        invoiceId: invoiceId,
      });

      console.log('eDahab initial response:', r?.data);
      let resData = r?.data;

      // Handle "Ödeme tutarı değişti; lütfen siparişleri yenileyiniz" by auto-synchronizing
      const rawInitialMsg = resData?.msg || resData?.detail || '';
      const isAmountChanged =
        rawInitialMsg.includes('tutarı değişti') ||
        rawInitialMsg.includes('tutari degisti') ||
        rawInitialMsg.includes('yenileyiniz') ||
        rawInitialMsg.toLowerCase().includes('amount changed');

      if (resData?.error === true && isAmountChanged) {
        console.log('eDahab amount change detected. Auto-synchronizing from database...');
        try {
          const syncRes = await ai.post('orders-unpaid', {
            siparis_id: route?.params?.siparis_id || (normalizedOrderIds.includes(',') ? null : normalizedOrderIds),
            grupID: route?.params?.grupID || null,
          });

          if (syncRes?.data?.error === false && Array.isArray(syncRes?.data?.ss)) {
            const activeList = normalizedOrderIds.split(',').map(s => s.trim()).filter(Boolean);
            let freshBase = 0;
            syncRes.data.ss.forEach(item => {
              if (activeList.includes(String(item.id)) || activeList.length === 0) {
                freshBase += parseFloat(item.tutar ?? item.tutar_usd ?? 0) || 0;
              }
            });
            if (syncRes.data.grup && syncRes.data.grup.nakliye_usd > 0) {
              freshBase += parseFloat(syncRes.data.grup.nakliye_usd);
            }

            let effectivePct = route?.params?.komisyonYuzde || 0;
            let effectiveFixed = 0;
            try {
              const mRes = await ai.get('payment-methods');
              if (mRes?.data?.error === false && Array.isArray(mRes?.data?.ss)) {
                const edMethod = mRes.data.ss.find(x => (x?.ad || x?.target || '').toLowerCase().includes('dahab'));
                if (edMethod) {
                  effectivePct = parseFloat(edMethod.komisyonYuzde) || 0;
                  effectiveFixed = parseFloat(edMethod.komisyonFixed) || 0;
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
              console.log(`Auto-retrying eDahab with synchronized amount: $${freshTotal.toFixed(2)}`);
              const retryPayload = {
                ...basePayload,
                tutar: freshTotal,
                amount: freshTotal,
                ana_tutar: freshBase,
                komisyon_tutar: freshKom,
                komisyon_yuzde: effectivePct,
                odemeID: 0,
                invoiceId: invoiceId,
              };
              const retryR = await ai.post('payment-edahab', retryPayload);
              console.log('eDahab retry response:', retryR?.data);
              resData = retryR?.data;
            }
          }
        } catch (syncErr) {
          console.log('Error auto-syncing orders for eDahab:', syncErr);
        }
      }

      if (resData?.error === false) {
        setSubmitting(false);
        useCartStore.getState().clearCart();
        const successMsg =
          localizeApiMessage(resData?.msg || resData?.responseMsg, 'Payment Successful') ||
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
        return;
      }

      const issuedOdemeID = resData?.odemeID;
      const issuedInvoiceId = resData?.invoiceId || invoiceId;

      if (resData?.pending === true && issuedOdemeID) {
        setOdemeID(issuedOdemeID);
        if (issuedInvoiceId) {
          setInvoiceId(issuedInvoiceId);
        }
        setPolling(true);
        setCountdown(60);
        await runPollingLoop(issuedOdemeID, issuedInvoiceId, basePayload);
      } else {
        setSubmitting(false);
        const rawMsg =
          resData?.responseMsg ||
          resData?.r?.message ||
          resData?.r?.msg ||
          resData?.message ||
          (resData?.msg && !resData.msg.toLowerCase().includes('başarısız') && !resData.msg.toLowerCase().includes('basarisiz') ? resData.msg : null) ||
          resData?.detail ||
          resData?.msg ||
          'Could not initiate payment.';
        const errorMsg = localizeApiMessage(
          rawMsg,
          'Could not initiate payment.',
        );
        Toast.show({
          type: 'error',
          text1: tr('Payment Failed') || 'Payment Failed',
          text2: errorMsg,
          text2Style: { fontSize: 14, color: '#000', width: '100%' },
        });
      }
    } catch (err) {
      console.error('eDahab initiate error:', err);
      setSubmitting(false);
      const errData = err?.response?.data;
      const rawError =
        errData?.responseMsg ||
        errData?.r?.message ||
        errData?.r?.msg ||
        errData?.message ||
        (errData?.msg && !errData.msg.toLowerCase().includes('başarısız') && !errData.msg.toLowerCase().includes('basarisiz') ? errData.msg : null) ||
        errData?.detail ||
        errData?.msg ||
        err?.message ||
        'Payment Failed';
      const errorMsg = localizeApiMessage(rawError, 'Payment Failed');
      Toast.show({
        type: 'error',
        text1: tr('Payment Error') || 'Payment Error',
        text2: errorMsg,
      });
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
        title={tr('E-Dahab Payment') || 'E-Dahab Payment'}
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
                source={require('../assets/img/edahab.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandTitleCol}>
              <Text style={[styles.brandTitle, { color: textColor }]}>
                E-Dahab Mobile Money
              </Text>
              <Text style={[styles.brandSub, { color: subTextColor }]}>
                Telesom Mobile Wallet
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
            {tr('Phone Number') || 'Registered Phone Number'}
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
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="e.g. 657654580"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              editable={!submitting && !polling}
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
                'Enter your E-Dahab registered phone number. You will receive a USSD prompt on your phone to approve the transaction with your PIN.',
              ) ||
                'Enter your E-Dahab registered phone number. You will receive a USSD prompt on your phone to approve the transaction with your PIN.'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePay}
            disabled={submitting || polling}
            style={[styles.payBtn, (submitting || polling) && styles.payBtnDisabled]}>
            {submitting && !polling ? (
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
            disabled={submitting || polling}
            style={[styles.cancelBtn, { borderColor: borderColor }]}>
            <Text style={[styles.cancelBtnText, { color: subTextColor }]}>
              {tr('Cancel') || 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* USSD Approval Modal */}
      <Modal
        visible={polling}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelPolling}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <View style={styles.modalSpinnerCircle}>
              <ActivityIndicator size="large" color="#F67922" />
            </View>

            <Text style={[styles.modalTitle, { color: textColor }]}>
              {tr('Awaiting Approval') || 'Awaiting Approval'}
            </Text>

            <Text style={styles.modalAmount}>${tutar} USD</Text>

            <Text style={[styles.modalInstruction, { color: subTextColor }]}>
              {tr(
                'A USSD push notification has been sent to your phone. Please check your screen and enter your PIN to complete payment.',
              ) ||
                'A USSD push notification has been sent to your phone. Please check your screen and enter your PIN to complete payment.'}
            </Text>

            <View style={styles.modalPhoneBadge}>
              <Text style={styles.modalPhoneText}>
                {phoneNumber}
              </Text>
            </View>

            <View style={styles.countdownRow}>
              <Text style={[styles.countdownLabel, { color: subTextColor }]}>
                {tr('Time Remaining') || 'Time Remaining'}:
              </Text>
              <Text style={styles.countdownValue}>{countdown}s</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCancelPolling}
              style={[styles.modalCancelBtn, { borderColor: borderColor }]}>
              <Text style={[styles.modalCancelText, { color: subTextColor }]}>
                {tr('Cancel Request') || 'Cancel Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalSpinnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F67922',
    marginBottom: 14,
  },
  modalInstruction: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalPhoneBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  modalPhoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownLabel: {
    fontSize: 13,
    marginRight: 6,
  },
  countdownValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F67922',
  },
  modalCancelBtn: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
