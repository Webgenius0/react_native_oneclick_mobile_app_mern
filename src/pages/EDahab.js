import React, {useState, useRef, useEffect} from 'react';
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
} from 'react-native';
import {t} from '../translate/i18n';
import GlobalStyle from '../assets/GlobalStyle';
import Toast from 'react-native-toast-message';
import ai from '../helpers/ai';
import {CommonActions} from '@react-navigation/native';
import Dump from '../components/Dump';
import {IS_LOCAL} from '../../config';
import Colors from '../assets/Colors';
import {delay, getUserAgent} from '../helpers/common';
import {useCartStore} from '../store/useCartStore';
import {useUserStore} from '../store/useUserStore';

export default function EDahab({navigation, route}) {
  const g = GlobalStyle;
  const user = useUserStore(state => state.user);

  const paymentType = 'mwallet';

  const fill = (__DEV__ && IS_LOCAL) || false;
  const defaultPhoneNumber = fill ? '657654580' : user?.telefon || '';

  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const tutar = route?.params?.tutar || 0;
  const anaTutar = route?.params?.ana_tutar || 0;
  const komisyonTutar = route?.params?.komisyon_tutar || 0;
  const [invoiceId, setInvoiceId] = useState(route?.params?.invoiceId || '');
  const siparis_ids = route?.params?.siparis_ids || '';
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [odemeID, setOdemeID] = useState('');

  const isCancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      // Cleanup polling on unmount
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

      if (isCancelledRef.current) {
        break;
      }

      try {
        const pollRes = await ai.post('payment-edahab', {
          ...basePayload,
          odemeID: currentOdemeId,
          invoiceId: currentInvoiceId,
        });

        const resData = pollRes?.data;
        console.log('eDahab pollRes:', resData);

        // Success: Payment confirmed by customer
        if (resData?.error === false) {
          setPolling(false);
          setSubmitting(false);
          useCartStore.getState().clearCart();

          Toast.show({
            type: 'success',
            text1: t('Ödeme Başarılı'),
            text2: resData?.msg || t('Ödeme Başarılı'),
          });

          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{name: 'AuthAfter', params: {screen: 'Orders'}}],
            }),
          );
          return;
        }

        // Still pending customer PIN input: continue polling
        if (resData?.pending === true) {
          continue;
        }

        // Explicit rejection or failure
        setPolling(false);
        setSubmitting(false);
        Toast.show({
          type: 'error',
          text1: t('Ödeme Başarısız'),
          text2: resData?.msg || t('Ödeme işlemi tamamlanamadı'),
          text2Style: {fontSize: 14, color: '#000', width: '100%'},
        });
        return;
      } catch (pollErr) {
        // Network resilience: keep polling until timeout even if single request hiccups
        console.warn('eDahab polling network notice:', pollErr?.message || pollErr);
      }
    }

    // Timeout reached
    if (!isCancelledRef.current) {
      setPolling(false);
      setSubmitting(false);
      Toast.show({
        type: 'error',
        text1: t('Zaman Aşımı'),
        text2: t('edahab_timeout_msg'),
        text2Style: {fontSize: 14, color: '#000', width: '100%'},
      });
    }
  };

  const handlePay = async () => {
    Keyboard.dismiss();

    if (submitting || polling) {
      return false;
    }

    if (!phoneNumber.trim()) {
      Toast.show({
        type: 'error',
        text1: t('Hata Oluştu'),
        text2: t('Lütfen tüm alanları doldurunuz'),
        text2Style: {fontSize: 14, color: '#000'},
      });
      return false;
    }

    isCancelledRef.current = false;
    setSubmitting(true);

    await delay(300);

    const userAgent = getUserAgent();
    const normalizedOrderIds = Array.isArray(siparis_ids)
      ? siparis_ids.join(',')
      : String(siparis_ids || '');

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
    };

    console.log('Initiating eDahab payment:', basePayload);

    try {
      // Step 1: Initial request to issue invoice & dispatch USSD push
      const r = await ai.post('payment-edahab', {
        ...basePayload,
        odemeID: 0,
        invoiceId: invoiceId,
      });

      console.log('eDahab initial response:', r?.data);

      const resData = r?.data;

      // Check if already approved immediately
      if (resData?.error === false) {
        setSubmitting(false);
        useCartStore.getState().clearCart();
        Toast.show({
          type: 'success',
          text1: t('Ödeme Başarılı'),
          text2: resData?.msg || t('Ödeme Başarılı'),
        });
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{name: 'AuthAfter', params: {screen: 'Orders'}}],
          }),
        );
        return;
      }

      // Check if USSD prompt was sent and invoice is pending
      const issuedOdemeID = resData?.odemeID;
      const issuedInvoiceId = resData?.invoiceId || invoiceId;

      if (resData?.pending === true && issuedOdemeID) {
        setOdemeID(issuedOdemeID);
        if (issuedInvoiceId) {
          setInvoiceId(issuedInvoiceId);
        }

        // Show prompt dialog / polling countdown
        setPolling(true);
        setCountdown(60);

        // Start polling loop
        await runPollingLoop(issuedOdemeID, issuedInvoiceId, basePayload);
      } else {
        // Definite failure on initialization
        setSubmitting(false);
        const errorMsg = resData?.msg || resData?.detail || t('Ödeme işlemi başlatılamadı');
        Toast.show({
          type: 'error',
          text1: t('Ödeme Başarısız'),
          text2: errorMsg,
          text2Style: {fontSize: 14, color: '#000', width: '100%'},
        });
      }
    } catch (err) {
      console.error('eDahab initiate error:', err);
      setSubmitting(false);
      Toast.show({
        type: 'error',
        text1: t('Hata Oluştu'),
        text2: err?.response?.data?.msg || err?.message || t('Ödeme Başarısız'),
      });
    }
  };

  const info = t('edahab_info');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>eDahab ${tutar}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>{t('Telefon')}</Text>

          {info ? (
            <View style={styles.info}>
              <Text style={styles.infoText}>{info}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.txtInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder={t('Telefon')}
            placeholderTextColor={'#999'}
            keyboardType="phone-pad"
            editable={!submitting && !polling}
          />
        </View>

        <Dump params={route?.params} show={false} />

        {submitting && !polling ? (
          <View style={[g.p10, g.alignCenter]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.submittingText}>{t('Ödeme Yapılıyor')}...</Text>
          </View>
        ) : null}

        <View style={[styles.rowHorizontal, g.alignCenter, g.pt30]}>
          <TouchableOpacity
            style={[g.btnCancel, g.m5, g.mw120]}
            disabled={submitting}
            onPress={handleCancel}>
            <Text style={[g.btnText, g.bold, styles.cancelBtnText]}>
              {t('İptal')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[g.btn, g.m5, g.mw120, styles.payBtn]}
            onPress={handlePay}
            disabled={submitting || polling}>
            <Text style={[g.btnText, g.bold, styles.payBtnText]}>
              {submitting ? t('Ödeme Yapılıyor') : t('Ödeme Yap')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Polling / USSD Confirmation Modal */}
        <Modal
          visible={polling}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCancelPolling}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <ActivityIndicator size="large" color="#4CAF50" style={styles.modalSpinner} />

              <Text style={styles.modalTitle}>
                {t('edahab_awaiting_title')}
              </Text>

              <Text style={styles.modalAmount}>
                ${tutar} USD
              </Text>

              <Text style={styles.modalInstruction}>
                {t('edahab_prompt_sent')}
              </Text>

              <View style={styles.modalPhoneBadge}>
                <Text style={styles.modalPhoneText}>
                  eDahab: {phoneNumber}
                </Text>
              </View>

              <View style={styles.countdownContainer}>
                <Text style={styles.countdownLabel}>{t('time_remaining')}:</Text>
                <Text style={styles.countdownValue}>{countdown}s</Text>
              </View>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCancelPolling}>
                <Text style={styles.modalCancelBtnText}>
                  {t('edahab_cancel_btn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Dump invoiceId={invoiceId} odemeID={odemeID} show={false} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  info: {
    backgroundColor: '#f4f6f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  row: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 20,
    width: '100%',
  },
  rowHorizontal: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    width: '100%',
    textAlign: 'center',
    color: '#1a1a1a',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  txtInput: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    width: '100%',
    backgroundColor: '#FFF',
    color: '#000',
    paddingHorizontal: 15,
    fontSize: 16,
  },
  payBtn: {
    backgroundColor: '#4CAF50',
  },
  payBtnText: {
    color: '#FFF',
    fontSize: 16,
  },
  cancelBtnText: {
    color: '#FFF',
    fontSize: 16,
  },
  submittingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalSpinner: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 12,
  },
  modalInstruction: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  modalPhoneBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  modalPhoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  countdownLabel: {
    fontSize: 14,
    color: '#777',
    marginRight: 6,
  },
  countdownValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  modalCancelBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  modalCancelBtnText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
});
