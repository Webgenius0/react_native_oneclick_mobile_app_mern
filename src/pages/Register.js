import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  StatusBar,
  Alert,
} from 'react-native';
import AppHeader from '../components/common/AppHeader';
import AppTextInput from '../components/common/AppTextInput';
import AppButton from '../components/common/AppButton';
import AppCheckbox from '../components/common/AppCheckbox';
import KeyboardAvoidingComponent from '../components/KeyboardAvoidingComponent';
import Svg, { Path } from 'react-native-svg';
import ai from '../helpers/ai';

const DEFAULT_CITIES = [
  { id: 11, name: 'Hargeisa' },
  { id: 2, name: 'Mogadishu' },
  { id: 14, name: 'Borama' },
  { id: 13, name: 'Burco' },
  { id: 23, name: 'Berbera' },
  { id: 15, name: 'Garowe' },
  { id: 22, name: 'Bosaso' },
  { id: 24, name: 'Galkayo' },
  { id: 12, name: 'Djibouti' },
  { id: 16, name: 'Dubai' },
];

export default function Register({ navigation }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    cityId: null,
    cityName: '',
    password: '',
    confirmPassword: '',
  });

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cities, setCities] = useState(DEFAULT_CITIES);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        // Primary API guide endpoint: GET /api/city-list
        let res = await ai.get('city-list').catch(() => null);
        let rawList = res?.data?.list || res?.data?.ss || res?.data?.cities;

        // Fallback to register-data if city-list is empty
        if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
          res = await ai.get('register-data').catch(() => null);
          rawList = res?.data?.list || res?.data?.ss || res?.data?.cities;
        }

        if (Array.isArray(rawList) && rawList.length > 0) {
          const mapped = rawList.map(c => ({
            id: c.id !== undefined ? c.id : c.key,
            name: c.name || c.ad || c.value,
            fiyat: c.fiyat || c.price || '0.00',
          }));
          setCities(mapped);
        }
      } catch (e) {
        // Graceful fallback to default cities on offline/error
        console.log('City fetch fallback:', e?.message || e);
      }
    };

    fetchCities();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone Number is required';
    } else if (formData.phone.trim().length < 6) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.cityId) {
      newErrors.city = 'Please select a city';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Use at least 8 characters.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      Alert.alert(
        'Terms & Policy',
        'Please agree to the Terms of Service and Privacy Policy to proceed.',
      );
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = () => {
    if (!validate()) {
      return;
    }

    // Move to Choose Verification Method
    navigation.navigate('ChooseVerificationMethod', {
      registrationData: formData,
      phone: formData.phone,
      email: formData.email,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <AppHeader
        navigation={navigation}
        showBack={true}
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('AuthWelcome');
          }
        }}
      />

      <KeyboardAvoidingComponent>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* Header Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Let's create your account to start shopping.
            </Text>
          </View>

          {/* Form Fields */}
          <AppTextInput
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChangeText={t => handleChange('fullName', t)}
            error={errors.fullName}
          />

          <AppTextInput
            label="Phone Number"
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={t => handleChange('phone', t)}
            error={errors.phone}
          />

          <AppTextInput
            label="Email address"
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={t => handleChange('email', t)}
            error={errors.email}
          />

          {/* City Selector */}
          <AppTextInput
            label="City"
            placeholder="Select a city"
            value={formData.cityName}
            editable={false}
            onPress={() => setCityModalVisible(true)}
            error={errors.city}
            rightComponent={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9l6 6 6-6"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            }
          />

          <AppTextInput
            label="Password"
            placeholder="Enter your password"
            secureTextEntry={true}
            value={formData.password}
            onChangeText={t => handleChange('password', t)}
            helperText="Use at least 8 characters."
            error={errors.password}
          />

          <AppTextInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            secureTextEntry={true}
            value={formData.confirmPassword}
            onChangeText={t => handleChange('confirmPassword', t)}
            error={errors.confirmPassword}
          />

          {/* Checkbox: Terms & Privacy */}
          <AppCheckbox
            checked={agreeTerms}
            onChange={setAgreeTerms}
            style={styles.checkboxWrap}>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.orangeLink}>Terms of Service</Text> and{' '}
              <Text style={styles.orangeLink}>Privacy Policy</Text>
            </Text>
          </AppCheckbox>

          {/* Create Account CTA */}
          <AppButton
            title="Create Account"
            variant="primary"
            onPress={handleCreateAccount}
            style={styles.submitBtn}
          />

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Login')}>
              <Text style={styles.orangeLinkBold}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingComponent>

      {/* City Picker Modal */}
      <Modal
        visible={cityModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCityModalVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select a City</Text>
            <FlatList
              data={cities}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.cityItem,
                    formData.cityId === item.id && styles.cityItemSelected,
                  ]}
                  onPress={() => {
                    setFormData(prev => ({
                      ...prev,
                      cityId: item.id,
                      cityName: item.name,
                    }));
                    if (errors.city) {
                      setErrors(prev => ({ ...prev, city: null }));
                    }
                    setCityModalVisible(false);
                  }}>
                  <Text
                    style={[
                      styles.cityText,
                      formData.cityId === item.id && styles.cityTextSelected,
                    ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
  },
  checkboxWrap: {
    marginVertical: 12,
  },
  termsText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    fontFamily: 'System',
  },
  orangeLink: {
    color: '#F58423',
    fontWeight: '600',
  },
  orangeLinkBold: {
    color: '#F58423',
    fontWeight: '700',
    fontSize: 14,
  },
  submitBtn: {
    marginTop: 18,
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  cityItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
  },
  cityItemSelected: {
    backgroundColor: '#FFF7ED',
  },
  cityText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  cityTextSelected: {
    color: '#F58423',
    fontWeight: '700',
  },
});
