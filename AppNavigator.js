import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeaderBackButton } from '@react-navigation/elements';
import { navigationRef } from './src/services/RootNavigation.js';

import React, { useContext, useEffect, useState } from 'react';
import { i18n, t, tr } from './src/translate/i18n';
import { storageGet } from './src/helpers/storage';
import { EmContext } from './src/contexts/EmContext';
import Colors from './src/assets/Colors';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import { useCartStore } from './src/store/useCartStore';

import * as RNLocalize from 'react-native-localize';
import ReactNative from 'react-native';

import HomeIcon from './src/assets/svg/home.svg';
import CategoriesIcon from './src/assets/svg/categories.svg';
import DotsIcon from './src/assets/svg/dots.svg';
import CreditIcon from './src/assets/svg/credit.svg';
import CartIcon from './src/assets/svg/cart.svg';
import BagIcon from './src/assets/svg/bag.svg';
import TruckIcon from './src/assets/svg/truck.svg';
import SupportIcon from './src/assets/svg/support.svg';
import ExpressIcon from './src/assets/svg/1click.svg';
import AccountTabIcon from './src/assets/svg/account_tab.svg';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

import Menu from './src/pages/Menu';
import Home from './src/pages/Home';
import Register from './src/pages/Register';
import Login from './src/pages/Login';
import CategoryList from './src/pages/CategoryList';
import CategoryDetail from './src/pages/CategoryDetail';
import Orders from './src/pages/Orders';
import Cart from './src/pages/Cart';
import Webview from './src/pages/Webview';
import WebviewLite from './src/pages/WebviewLite';
import WebsiteSuggest from './src/pages/WebsiteSuggest';
import OrderDetail from './src/pages/OrderDetail';
import OrderForm from './src/pages/OrderForm';
import Splash from './src/pages/Splash';
import Onboarding from './src/pages/Onboarding';
import AuthWelcome from './src/pages/AuthWelcome';
import ContinueGuest from './src/pages/ContinueGuest';
import ChooseVerificationMethod from './src/pages/ChooseVerificationMethod';
import VerifyOtp from './src/pages/VerifyOtp';
import AccountCreatedSuccess from './src/pages/AccountCreatedSuccess';
import ForgotPassword from './src/pages/ForgotPassword';
import SetNewPassword from './src/pages/SetNewPassword';
import Profile from './src/pages/Profile';
import PersonalInformation from './src/pages/PersonalInformation';
import Account from './src/pages/Account';
import ContactOneClick from './src/pages/ContactOneClick';
import Faq from './src/pages/Faq';
import PrivacyPolicy from './src/pages/PrivacyPolicy';
import TermsOfService from './src/pages/TermsOfService';
import Language from './src/pages/Language';
import PaymentMethods from './src/pages/PaymentMethods';
import PrivacySecurity from './src/pages/PrivacySecurity';
import Test from './src/pages/Test';
import Notifications from './src/pages/Notifications';
import NotificationSettings from './src/pages/NotificationSettings';
import ChangePassword from './src/pages/ChangePassword';
import DeleteAccount from './src/pages/DeleteAccount';
import PaymentStart from './src/pages/PaymentStart';
import PaymentResponse from './src/pages/PaymentResponse';
import WaafiPay from './src/pages/WaafiPay';
import Support from './src/pages/Support';
import CartForm from './src/pages/CartForm';
import EDahab from './src/pages/EDahab';
import HomeNew from './src/pages/HomeNew.js';
import { EXPRESS } from './config.js';
import BannerList from './src/pages/BannerList.js';
import ReviewOrder from './src/pages/ReviewOrder.js';
import TrackOrder from './src/pages/TrackOrder.js';

function AuthAfterTabNavigator() {
  const { ctx } = useContext(EmContext);
  const headerTitleStyle = {
    color: ctx?.isDark ? '#FFF' : '#000',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let width = 24, height = 24;
          let fill = focused ? Colors.primary : !ctx?.isDark ? '#64748B' : '#9CA3AF';
          switch (route.name) {
            case 'Home':
            case 'Categories':
              return (
                <HomeIcon
                  width={24}
                  height={24}
                  size={size}
                  fill={fill}
                />
              );
            case 'Cart':
              return (
                <CartIcon
                  width={24}
                  height={24}
                  size={size}
                  fill={fill}
                />
              );
            case 'Orders':
              return (
                <BagIcon
                  width={24}
                  height={24}
                  size={size}
                  fill={fill}
                />
              );
            case 'Account':
            case 'Profile':
              return (
                <AccountTabIcon
                  width={24}
                  height={24}
                  size={size}
                  stroke={fill}
                  color={fill}
                />
              );
          }
          return null;
        },
        tabBarActiveBackgroundColor: ctx?.bgColor,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: ctx?.color || '#64748B',
        tabBarInactiveBackgroundColor: ctx?.bgColor,
      })}
      initialRouteName="Home">
      <Tab.Screen
        name="Home"
        component={BannerList}
        options={{
          title: tr('Home') || 'Home',
          headerTitleStyle: headerTitleStyle,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={Cart}
        options={{
          title: tr('Cart') || 'Cart',
          headerTitleStyle: headerTitleStyle,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={Orders}
        options={{
          title: tr('Orders') || 'Orders',
          headerTitleStyle: headerTitleStyle,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Account"
        component={Account}
        options={{
          title: tr('Account') || 'Account',
          headerTitleStyle: headerTitleStyle,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { ctx, ctxDil, setCtxDil } = useContext(EmContext);
  const { addItem } = useCartStore();

  const [state, setState] = useState({
    token: null,
    loading: true,
  });

  const initialRouteName = 'Splash';

  const loadLanguage = async () => {
    try {
      const lang = await storageGet('language');
      const activeLang = lang && ['en', 'som'].includes(lang) ? lang : 'en';
      i18n.defaultLocale = 'en';
      i18n.locale = activeLang;
      setCtxDil(activeLang);

      const isRTL = i18n.locale === 'ar' || i18n.locale === 'ckb';
      ReactNative.I18nManager.allowRTL(isRTL);
      ReactNative.I18nManager.forceRTL(false);
    } catch (err) {
      console.log('loadLanguage error:', err);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadLanguage();

    try {
      ReceiveSharingIntent.getReceivedFiles(
        files => {
          if (files && files.length > 0) {
            const sharedText = files[0].text;
            if (sharedText) {
              const productTitle = 'Product';
              const productImage = '';

              addItem({
                title: productTitle,
                url: sharedText,
                count: 1,
                checked: true,
                image: productImage,
              });

              ReceiveSharingIntent.clearReceivedFiles();
              setTimeout(() => {
                navigationRef.current?.navigate('Cart');
              }, 1000);
            }
          }
        },
        () => {},
      );
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.loading) {
    return null;
  }

  const headerTitleStyle = {
    color: ctx?.isDark ? '#FFF' : '#000',
  };

  const headerOption = (title, headerShow) => {
    return {
      title: t(title),
      headerShown: headerShow !== undefined ? headerShow : true,
      headerTitleStyle: headerTitleStyle,
    };
  };

  const headerOptionNoTitle = () => {
    return {
      headerShown: false,
      headerTitleStyle: headerTitleStyle,
    };
  };

  const headerNoShowOptionTitle = title => {
    return {
      headerShown: false,
      title: t(title),
      headerTitleStyle: headerTitleStyle,
    };
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: true,
          headerBackTitleVisible: false,
          headerTintColor: ctx.color,
          headerStyle: {
            backgroundColor: ctx.bgColor,
          },
        }}>
        <Stack.Screen
          name="Splash"
          component={Splash}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="Onboarding"
          component={Onboarding}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="AuthWelcome"
          component={AuthWelcome}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="ContinueGuest"
          component={ContinueGuest}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="Login"
          component={Login}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="Register"
          component={Register}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="ChooseVerificationMethod"
          component={ChooseVerificationMethod}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="VerifyOtp"
          component={VerifyOtp}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="AccountCreatedSuccess"
          component={AccountCreatedSuccess}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPassword}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="SetNewPassword"
          component={SetNewPassword}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="AuthAfter"
          component={AuthAfterTabNavigator}
          options={headerNoShowOptionTitle('Home')}
        />
        <Stack.Screen
          name="Categories"
          component={BannerList}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Webview"
          component={Webview}
          options={{ headerTitleStyle: headerTitleStyle }}
        />
        <Stack.Screen
          name="WebviewLite"
          component={WebviewLite}
          options={{
            headerTitleStyle: headerTitleStyle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="WebsiteSuggest"
          component={WebsiteSuggest}
          options={{ headerTitleStyle: headerTitleStyle }}
        />
        <Stack.Screen
          name="Cart"
          component={Cart}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ReviewOrder"
          component={ReviewOrder}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="CartForm"
          component={CartForm}
          options={{
            title: tr('Cart') || 'Cart',
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="Menu"
          component={Menu}
          options={{ title: tr('Menu'), headerTitleStyle: headerTitleStyle }}
        />
        <Stack.Screen
          name="Profile"
          component={Profile}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PersonalInformation"
          component={PersonalInformation}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Account"
          component={Account}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ContactOneClick"
          component={ContactOneClick}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Faq"
          component={Faq}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicy}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TermsOfService"
          component={TermsOfService}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Language"
          component={Language}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Notifications"
          component={Notifications}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="NotificationSettings"
          component={NotificationSettings}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PaymentMethods"
          component={PaymentMethods}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PrivacySecurity"
          component={PrivacySecurity}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChangePassword"
          component={ChangePassword}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DeleteAccount"
          component={DeleteAccount}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetail}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="TrackOrder"
          component={TrackOrder}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Orderss"
          component={Orders}
          options={{
            title: tr('Orders') || 'Orders',
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="OrderForm"
          component={OrderForm}
          options={{
            title: tr('Order Form') || 'Order Form',
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="Support"
          component={Support}
          options={{
            title: tr('Support') || 'Support',
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="PaymentStart"
          component={PaymentStart}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="PaymentResponse"
          component={PaymentResponse}
          options={{
            title: tr('Payment Result') || 'Payment Result',
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="WaafiPay"
          component={WaafiPay}
          options={{
            title: tr('Pay') || 'Pay',
            headerShown: false,
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="EDahab"
          component={EDahab}
          options={{
            title: tr('Pay') || 'Pay',
            headerShown: false,
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen name="Test" component={Test} options={{ title: 'Test' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}