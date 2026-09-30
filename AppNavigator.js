import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeaderBackButton } from '@react-navigation/elements';
import { navigationRef } from './src/services/RootNavigation.js';

import { useContext, useEffect, useState } from 'react';
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
import Profile from './src/pages/Profile';
import Test from './src/pages/Test';
import Notifications from './src/pages/Notifications';
import PaymentStart from './src/pages/PaymentStart';
import PaymentResponse from './src/pages/PaymentResponse';
import WaafiPay from './src/pages/WaafiPay';
import Support from './src/pages/Support';
import CartForm from './src/pages/CartForm';
import EDahab from './src/pages/EDahab';
import HomeNew from './src/pages/HomeNew.js';
import { EXPRESS } from './config.js';
import BannerList from './src/pages/BannerList.js';

export default function AppNavigator() {
  const { ctx, setCtxDil } = useContext(EmContext);
  const { addItem } = useCartStore();

  const [state, setState] = useState({
    token: null,
    loading: true,
  });
  let initialRouteName;
  let authAfterInitialRouteName;

  initialRouteName = 'Splash';
  //initialRouteName = "Orders";
  // initialRouteName = "Profile";
  authAfterInitialRouteName = "Home";
  authAfterInitialRouteName = 'Categories';

  if (EXPRESS) {
    // authAfterInitialRouteName = 'Home';
  }
  
  if (__DEV__) {
    // authAfterInitialRouteName = "Orders";
    // authAfterInitialRouteName = 'Cart';
    // initialRouteName = 'AuthAfter';
    // authAfterInitialRouteName = 'Webview';
    //initialRouteName = 'Webview';
  }

  const loadLanguage = async () => {
    try {
      const lang = await storageGet('language');
      if (lang) {
        i18n.locale = lang;
        setCtxDil(lang);
      } else {
        const locales = RNLocalize.getLocales();
        const deviceLanguageCodes = locales && locales.length ? locales.map(locale => locale.languageCode) : [];
        const availableLanguages = ['en', 'tr', 'som'];

        let findedLang = false;
        deviceLanguageCodes.forEach(lang => {
          if (findedLang === false && availableLanguages.includes(lang)) {
            findedLang = lang;
            i18n.locale = lang;
            setCtxDil(lang);
          }
        });
      }

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

    // Handle shared links
    try {
      ReceiveSharingIntent.getReceivedFiles(
        files => {
          if (files && files.length > 0) {
            const sharedText = files[0].text;
            if (sharedText) {
              // Extract product info and add to cart
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
              // Navigate to cart
              setTimeout(() => {
                navigationRef.current?.navigate('Cart');
              }, 1000);
            }
          }
        },
        error => {
          // Normal on cold launch when no shared content is present
        },
      );
    } catch (e) {
      // Ignored
    }
  }, []);

  if (state.loading) {
    return null;
  }

  const headerTitleStyle = {
    color: ctx.isDark ? '#FFF' : '#000',
  };

  const CategoryStack = () => {
    return (
      <Stack.Navigator
        initialRouteName="CategoryList"
        screenOptions={{
          headerShown: false,
          headerBackTitle: tr('Geri'),
        }}>
        <Stack.Screen
          name="CategoryList"
          component={CategoryList}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CategoryDetail"
          component={CategoryDetail}
          options={{
            headerShown: true,
            headerTitleStyle: headerTitleStyle,
          }}
        />
      </Stack.Navigator>
    );
  };

  const AuthAfterTabNavigator = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          // color = focused ? '#000' : '#ccc';
          let width = 30, height = 30;
          let fill = focused ? Colors.primary : !ctx.isDark ? '#666' : '#FFF';
          let r = route.name;
          switch (route.name) {
            case 'Home':
              if (EXPRESS) {
                return (
                  <ExpressIcon
                    width={50}
                    height={50}
                    size={size}
                    fill={fill}
                  />
                );
              }
              return (<HomeIcon
                width={width}
                height={height}
                size={size}
                fill={fill}
              />);

              break;
            case 'Categories':
/* 
              return (<TurkeyIcon
                width={width}
                height={height}
                size={size}
                fill={fill}
              />); */
              return (
                <DotsIcon
                  width={width}
                  height={height}
                  size={size}
                  fill={fill}
                />
              );

              break;
            case 'CategoryList':
              return (
                <DotsIcon
                  width={width}
                  height={height}
                  size={size}
                  fill={fill}
                />
              );

              break;
            case 'Orders':
              return (
                <BagIcon
                  width={width}
                  height={height}
                  size={size}
                  fill={fill}
                />
              );
              break;
            case 'Cart':
              return (
                <CartIcon
                  width={width}
                  height={height}
                  size={size}
                  fill={fill}
                />
              );

              break;
            case 'Arrivals':
              // console.log('route.name', route.name, 'focused', focused);
              return (
                <TruckIcon
                  width={width}
                  height={height}
                  size={size}
                  fill={fill}
                />
              );

              break;
            case 'Balance':
              return (
                <CreditIcon
                  width={width}
                  height={height}
                  size={size}
                  fill={fill}
                />
              );
              break;
            case 'Menu':
              return (
                <CategoriesIcon
                  width={width}
                  height={height}
                  size={size}
                  fill={fill}
                />
              );
              break;
            case 'Support':
              return (
                <SupportIcon
                  width={width}
                  height={height}
                  size={size}
                  fill={fill}
                />
              );
              break;
          }

          // return <Icon name="information-circle-outline" color={"#000000"} />
          // return <Icon name={iconName} size={size} color={color} />;
          // return <Ionicons name={iconName} size={size} color={color} />;
          return null;
        },
        tabBarActiveBackgroundColor: ctx.bgColor,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: ctx.color,
        tabBarInactiveBackgroundColor: ctx.bgColor,
      })}
      initialRouteName={authAfterInitialRouteName}>
      {
        EXPRESS ? (
          <Tab.Screen
            name="Home"
            component={HomeNew}
            options={{
              title: tr('Express'),
              headerTitleStyle: headerTitleStyle,
              headerShown: true
            }}
          />
        ) : (
          <Tab.Screen
            name="Home"
            component={Home}
            options={{ title: tr('Anasayfa'), headerTitleStyle: headerTitleStyle }}
          />
        )}
      <Tab.Screen
        name="Categories"
        component={BannerList}
        options={{
          title: 'Market',
          // title: tr('Kategoriler'),
          headerTitleStyle: headerTitleStyle,
        }}
      />
      {/*<Tab.Screen name='Arrivals' component={Arrivals} options={{title: tr('Gelenler'), headerTitleStyle:headerTitleStyle}}/>*/}
      {/*<Tab.Screen name='Balance' component={Balance} options={{title: tr('Hareketler'), headerTitleStyle:headerTitleStyle}}/>*/}
      <Tab.Screen
        name="Cart"
        component={Cart}
        options={{
          title: tr('Sepet'),
          headerTitleStyle: headerTitleStyle,
          headerShown: true,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={Orders}
        options={{
          title: tr('Siparişler'),
          headerTitleStyle: headerTitleStyle,
        }}
      />
      <Tab.Screen
        name="Support"
        component={Support}
        options={{
          title: tr('Destek'),
          headerTitleStyle: headerTitleStyle,
        }}
      />
    </Tab.Navigator>
  );

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
          name="Login"
          component={Login}
          options={headerOptionNoTitle}
        />
        <Stack.Screen
          name="AuthAfter"
          component={AuthAfterTabNavigator}
          options={headerNoShowOptionTitle('Anasayfa')}
        />
        <Stack.Screen
          name="Register"
          component={Register}
          options={{ title: tr('Kayıt Ol'), headerTitleStyle: headerTitleStyle }}
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
            title: tr('Sepet'),
            headerTitleStyle: headerTitleStyle,
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="CartForm"
          component={CartForm}
          options={{
            title: tr('Sepet'),
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
          options={({ navigation }) => ({
            title: tr('Profil'),
            headerTitleStyle: headerTitleStyle,
            headerLeft: props => (
              <HeaderBackButton
                {...props}
                labelVisible={false}
                backTitleVisible={false}
                tintColor={ctx.color}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('AuthAfter');
                  }
                }}
              />
            ),
          })}
        />
        <Stack.Screen
          name="Notifications"
          component={Notifications}
          options={({ navigation }) => ({
            title: tr('Bildirimler'),
            headerTitleStyle: headerTitleStyle,
            headerLeft: props => (
              <HeaderBackButton
                {...props}
                labelVisible={false}
                backTitleVisible={false}
                tintColor={ctx.color}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('AuthAfter');
                  }
                }}
              />
            ),
          })}
        />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetail}
          options={{
            title: t('Sipariş Detay'),
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="Orderss"
          component={Orders}
          options={{
            title: t('Siparişler'),
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="OrderForm"
          component={OrderForm}
          options={{
            title: t('Sipariş Formu'),
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="Support"
          component={Support}
          options={{
            title: t('Destek'),
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="PaymentStart"
          component={PaymentStart}
          options={{
            title: t('Ödeme Yap'),
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="PaymentResponse"
          component={PaymentResponse}
          options={{
            title: t('Ödeme Sonucu'),
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="WaafiPay"
          component={WaafiPay}
          options={{
            title: t('Ödeme Yap'),
            headerShown: false,
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="EDahab"
          component={EDahab}
          options={{
            title: t('Ödeme Yap'),
            headerShown: false,
            headerTitleStyle: headerTitleStyle,
          }}
        />
        <Stack.Screen name="Test" component={Test} options={{ title: 'Test' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}