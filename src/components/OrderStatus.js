import { i18n } from "../translate/i18n";

export default function({ durum }) {

  /*
  let durumArr = [
    {id:1, ad: "Beklemede"},
    {id:2, ad: "Sipariş Verildi"},
    {id:3, ad: "Taşımada"},
    {id:4, ad: "Taşımada"},
    {id:5, ad: "Taşımada"},
    {id:11, ad: "Dağıtımda"},
    {id:6, ad: "Teslim Edildi"},
    {id:7, ad: "İptal Edildi"},
    {id:8, ad: "İptal Edildi"},
    {id:9, ad: "İptal Edildi"},
    {id:10, ad: "İptal Edildi"},
    {id:12, ad: "İptal Edildi"},
    {id:13, ad: "İptal Edildi"},
    {id:14, ad: "Beklemede"},
    {id:15, ad: "Onayınız bekleniyor"},
    {id:16, ad: "Onaylandı"},
    {id:17, ad: "İptal Ettiniz"},
    {id:18, ad: "Beklemede"},
    {id:19, ad: "Eksik Bilgi"},
  ];
  */
  /*
  $_siparis_durums = [
          1 => 'Hazırlanıyor',
          2 => 'Sipariş Verildi',
          3 => 'İst Depoda',
          4 => 'Kargoya Verildi',
          5 => 'Irak Depoda',
          11 => 'Dağıtımda',
          6 => 'Teslim Edildi',
          9 => 'İade Bekleniyor',
          8 => 'İade Edildi',
          10 => 'Yanlış Ürün',
          7 => 'İptal Edildi',
          12 => 'İptal: Yok',
          13 => 'İptal: Fiyatı Farklı',
          14 => 'Fiyat Bekleniyor',
          15 => 'Müşteri Onayda',
          16 => 'Müşteri Onayladı',
          17 => 'İptal: Müşteri Reddetti',
          18 => 'Müşteri Ödedi',
          19 => 'Eksik Bilgi',
      ];
   */

  let durumArr = [
    { id: 1, p: "Hazırlanıyor", ad: "Beklemede", en: "Pending" },
    { id: 2, p: "Sipariş Verildi", ad: "Sipariş Verildi", en: "Order Placed" },
    { id: 3, p: "İst Depoda", ad: "Türkiye Depoda", en: "Warehouse" },
    { id: 4, p: "Kargoya Verildi", ad: "Taşımada", en: "In Transit" },
    { id: 5, p: "Teslimat Deposunda", ad: "Teslimat Deposunda", en: "Local Warehouse" },
    { id: 11, p: "Dağıtımda", ad: "Dağıtımda", en: "Out for Delivery" },
    { id: 6, p: "Teslim Edildi", ad: "Teslim Edildi", en: "Delivered" },
    { id: 7, p: "İptal Edildi", ad: "İptal Edildi", en: "Cancelled" },
    { id: 8, p: "İade Edildi", ad: "İade Edildi", en: "Returned" },
    { id: 9, p: "İade Bekleniyor", ad: "İade Bekleniyor", en: "Return Pending" },
    { id: 10, p: "Yanlış Ürün", ad: "İptal Edildi", en: "Cancelled" },
    { id: 12, p: "İptal: Yok", ad: "Ürün Kalmadı", en: "Out of Stock" },
    { id: 13, p: "İptal: Fiyatı Farklı", ad: "Fiyatı Farklı", en: "Price Difference" },
    { id: 14, p: "Fiyat Bekleniyor", ad: "Fiyat Bekleniyor", en: "Awaiting Price" },
    { id: 15, p: "Müşteri Onayda", ad: "Onayınız Bekleniyor", en: "Pending Approval" },
    { id: 16, p: "Müşteri Onayladı", ad: "Onaylandı", en: "Approved" },
    { id: 17, p: "İptal: Müşteri Reddetti", ad: "İptal Ettiniz", en: "Cancelled by You" },
    { id: 18, p: "Müşteri Ödedi", ad: "Ödeme Başarılı", en: "Payment Successful" },
    { id: 19, p: "Eksik Bilgi", ad: "Eksik Bilgi", en: "Missing Info" },
    { id: 21, p: "Sipariş Onaylandı", ad: "Sipariş Onaylandı", en: "Order Confirmed" },
    { id: 22, p: "Seçtiğiniz beden bu ürün için mevcut değildir", ad: "Seçtiğiniz beden bu ürün için mevcut değildir", en: "Size not available" },
    { id: 23, p: "Lütfen bir beden seçin", ad: "Lütfen bir beden seçin", en: "Please select a size" },
    { id: 24, p: "Lütfen siparişinizi doğru şekilde verin", ad: "Lütfen siparişinizi doğru şekilde verin", en: "Invalid order details" },
  ];

  let durumObj = durumArr.find((item) => item.id === durum);

  if (!durumObj) return "";
  if (durumObj.en && i18n.exists(durumObj.en)) {
    return i18n.t(durumObj.en);
  }
  if (durumObj.ad && i18n.exists(durumObj.ad)) {
    return i18n.t(durumObj.ad);
  }
  return durumObj.en || "";


}
