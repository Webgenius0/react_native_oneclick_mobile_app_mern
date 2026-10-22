import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EmContext } from '../contexts/EmContext';
import ai from '../helpers/ai';
import { tr } from '../translate/i18n';
import { storageGet, storageSet } from '../helpers/storage';
import AppHeader from '../components/common/AppHeader';

const { width } = Dimensions.get('window');

export default function PersonalInformation({ navigation }) {
  const { ctx, setCtx } = useContext(EmContext);

  const [state, setState] = useState({
    s: {},
    loading: true,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [city, setCity] = useState('');

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setState(prev => ({ ...prev, loading: true }));
      }

      const currentUser = await storageGet('user');
      const c = await ai.get('profile');

      let userData = currentUser || {};
      if (c?.data && c.data.error === false && c.data.s) {
        userData = c.data.s;
      }

      setState({
        s: userData,
        loading: false,
      });

      setFullName(userData.ad || 'Fatima Nour');
      setPhoneNumber(userData.tel || '+887315611353');
      setEmailAddress(userData.email || 'fatimanour0930@gmail.com');
      setCity(userData.sehir || userData.adres || 'Borama');
    } catch (err) {
      console.log('PersonalInformation fetch error:', err);
      const currentUser = await storageGet('user');
      setState({
        s: currentUser || {},
        loading: false,
      });
      setFullName(currentUser?.ad || 'Fatima Nour');
      setPhoneNumber(currentUser?.tel || '+887315611353');
      setEmailAddress(currentUser?.email || 'fatimanour0930@gmail.com');
      setCity(currentUser?.sehir || currentUser?.adres || 'Borama');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ad: fullName,
        tel: phoneNumber,
        email: emailAddress,
        adres: city,
        sehir: city,
      };

      const res = await ai.post('profile-update', payload);
      if (res?.data && res.data.error === false) {
        Alert.alert(
          tr('Başarılı') || 'Success',
          tr('Bilgileriniz başarıyla güncellendi') ||
            'Personal information updated successfully',
        );
        const updatedUser = {
          ...(state.s || {}),
          ...payload,
        };
        await storageSet('user', updatedUser);
        if (setCtx) {
          setCtx(prev => ({
            ...prev,
            user: updatedUser,
          }));
        }
        setIsEditing(false);
      } else {
        Alert.alert(
          tr('Hata') || 'Error',
          res?.data?.msg ||
            tr('Güncelleme sırasında bir hata oluştu') ||
            'Failed to update information',
        );
      }
    } catch (e) {
      console.log('Profile update error:', e);
      Alert.alert(
        tr('Hata') || 'Error',
        tr('Güncelleme sırasında bir hata oluştu') ||
          'Failed to update information',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(state.s.ad || 'Fatima Nour');
    setPhoneNumber(state.s.tel || '+887315611353');
    setEmailAddress(state.s.email || 'fatimanour0930@gmail.com');
    setCity(state.s.sehir || state.s.adres || 'Borama');
    setIsEditing(false);
  };

  const isDark = ctx.isDark;
  const pageBg = isDark ? '#111827' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#252C34';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const inputBg = isDark ? '#1F2937' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={pageBg}
      />

      {/* Header matching Figma */}
      <AppHeader
        navigation={navigation}
        showBack={true}
        title={tr('Personal Information') || 'Personal Information'}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: pageBg,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          style={[styles.container, { backgroundColor: pageBg }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              colors={['#F67922']}
              tintColor="#F67922"
            />
          }>
          {state.loading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#F67922" />
            </View>
          ) : (
            <View style={styles.formWrap}>
              {/* Profile Photo Section matching Figma */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarWrap}>
                  <Image
                    source={require('../assets/img/account/default_avatar.png')}
                    style={styles.avatarImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.avatarLabel, { color: subTextColor }]}>
                  {tr('Profile photo') || 'Profile photo'}
                </Text>
              </View>

              {/* Field 1: Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: subTextColor }]}>
                  {tr('Full Name') || 'Full Name'}
                </Text>
                <View
                  style={[
                    styles.fieldBox,
                    { backgroundColor: inputBg, borderColor: borderColor },
                    isEditing && styles.fieldBoxEditing,
                  ]}>
                  <TextInput
                    style={[styles.fieldInput, { color: textColor }]}
                    value={fullName}
                    onChangeText={setFullName}
                    editable={isEditing}
                    placeholder="Full Name"
                    placeholderTextColor={subTextColor}
                  />
                </View>
              </View>

              {/* Field 2: Phone Number */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: subTextColor }]}>
                  {tr('Phone Number') || 'Phone Number'}
                </Text>
                <View
                  style={[
                    styles.fieldBox,
                    { backgroundColor: inputBg, borderColor: borderColor },
                    isEditing && styles.fieldBoxEditing,
                  ]}>
                  <TextInput
                    style={[styles.fieldInput, { color: textColor }]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    editable={isEditing}
                    keyboardType="phone-pad"
                    placeholder="+887315611353"
                    placeholderTextColor={subTextColor}
                  />
                </View>
              </View>

              {/* Field 3: Email address */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: subTextColor }]}>
                  {tr('Email address') || 'Email address'}
                </Text>
                <View
                  style={[
                    styles.fieldBox,
                    { backgroundColor: inputBg, borderColor: borderColor },
                    isEditing && styles.fieldBoxEditing,
                  ]}>
                  <TextInput
                    style={[styles.fieldInput, { color: textColor }]}
                    value={emailAddress}
                    onChangeText={setEmailAddress}
                    editable={isEditing}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="name@example.com"
                    placeholderTextColor={subTextColor}
                  />
                </View>
              </View>

              {/* Field 4: City */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: subTextColor }]}>
                  {tr('City') || 'City'}
                </Text>
                <View
                  style={[
                    styles.fieldBox,
                    { backgroundColor: inputBg, borderColor: borderColor },
                    isEditing && styles.fieldBoxEditing,
                  ]}>
                  <TextInput
                    style={[styles.fieldInput, { color: textColor }]}
                    value={city}
                    onChangeText={setCity}
                    editable={isEditing}
                    placeholder="City"
                    placeholderTextColor={subTextColor}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonSection}>
                {isEditing ? (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={styles.primaryBtn}
                      onPress={handleSave}
                      disabled={saving}>
                      {saving ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryBtnText}>
                          {tr('Save Changes') || 'Save Changes'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.cancelBtn}
                      onPress={handleCancel}>
                      <Text style={[styles.cancelBtnText, { color: subTextColor }]}>
                        {tr('Cancel') || 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.primaryBtn}
                    onPress={() => setIsEditing(true)}>
                    <Text style={styles.primaryBtnText}>
                      {tr('Edit Info') || 'Edit Info'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 60,
  },
  loadingWrap: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formWrap: {
    width: '100%',
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '500',
  },

  // Fields
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  fieldBox: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  fieldBoxEditing: {
    borderColor: '#F67922',
    backgroundColor: 'rgba(246, 121, 34, 0.02)',
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '500',
    color: '#252C34',
    padding: 0,
  },

  // Buttons
  buttonSection: {
    marginTop: 20,
    gap: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F67922',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F67922',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
