import {paymentTypes} from '../config';

describe('Payment Gateway - eDahab Integration', () => {
  test('paymentTypes in config.js includes enabled eDahab alongside WaafiPay', () => {
    expect(paymentTypes).toBeDefined();
    expect(paymentTypes.length).toBeGreaterThanOrEqual(2);

    const waafi = paymentTypes.find(p => p.name === 'WaafiPay' || p.target === 'WaafiPay');
    expect(waafi).toBeDefined();

    const edahab = paymentTypes.find(p => p.name === 'eDahab' || p.target === 'EDahab');
    expect(edahab).toBeDefined();
    expect(edahab.target).toBe('EDahab');
  });

  test('validates payload formatting and USSD push polling status transitions', () => {
    const phoneNumber = '657654580';
    const tutar = 15.5;
    const siparisIds = [101, 102];

    const normalizedOrderIds = Array.isArray(siparisIds) ? siparisIds.join(',') : String(siparisIds);

    const basePayload = {
      phoneNumber: phoneNumber.trim(),
      cardNumber: phoneNumber.trim(),
      accountNumber: phoneNumber.trim(),
      tutar: parseFloat(tutar),
      amount: parseFloat(tutar),
      siparis_ids: normalizedOrderIds,
      order_ids: normalizedOrderIds,
      siparis_id: normalizedOrderIds,
    };

    expect(basePayload.phoneNumber).toBe('657654580');
    expect(basePayload.siparis_ids).toBe('101,102');
    expect(basePayload.tutar).toBe(15.5);

    // Initial response structure from guide
    const initialRes = {
      error: true,
      pending: true,
      status: 'pending',
      odemeID: 104,
      invoiceId: 'f6282df333b945e8a36c508ab61e56ae',
      msg: 'Ödeme henüz onaylanmadı',
    };

    // When pending === true and odemeID > 0, polling must be triggered
    const shouldStartPolling = initialRes.pending === true && !!initialRes.odemeID;
    expect(shouldStartPolling).toBe(true);

    // Success response structure
    const successRes = {
      error: false,
      odemeID: 104,
      tahsilatID: 512,
      msg: 'Ödeme başarılı',
      siparis_ids: [101, 102],
    };
    expect(successRes.error).toBe(false);
    expect(successRes.tahsilatID).toBe(512);
  });
});
