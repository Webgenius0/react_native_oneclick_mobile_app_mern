import {
  Alert,
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {useState} from 'react';
import {t} from '../../translate/i18n';
import ai from '../../helpers/ai';

export default function ({modalVisible, setModalVisible, addItem}) {
  const defaultUrl = __DEV__ ? 'https://ty.gl/y6ggdtm0rp3wy' : '';

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState(defaultUrl);
  const [size, setSize] = useState('');
  const [count, setCount] = useState('1');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
    },
    button: {
      backgroundColor: '#007bff',
      padding: 10,
      borderRadius: 5,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
    },
    modalBackground: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
    },
    modalContainer: {
      width: '80%',
      padding: 20,
      backgroundColor: '#fff',
      borderRadius: 10,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      color: '#333',
    },
    input: {
      width: '100%',
      padding: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#ddd',
      color: '#333',
      borderRadius: 5,
      placeholderTextColor: '#ddd',
    },
    submitButton: {
      backgroundColor: '#28a745',
      padding: 10,
      borderRadius: 5,
      marginTop: 10,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    closeButton: {
      backgroundColor: '#ff5722',
      padding: 10,
      borderRadius: 5,
      marginTop: 10,
    },
    closeButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    label: {
      marginBottom: 5,
      color: '#333',
    },
    row: {
      width: '100%',
      marginBottom: 10,
    },
    require: {
      color: 'red',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

  const fetchImage = async () => {
    try {
      const r = await ai.post('cart-image', {url});
      console.log('r', r);
      if (r.data?.error === false && r.data?.image) {
        return r.data.image;
      }
    } catch (e) {
      console.log(e);
    }
    return '';
  };

  const handleSubmit = async () => {
    if (!url || !count) {
      Alert.alert(t('Uyarı'), t('Lütfen tüm alanları doldurunuz'));
      return;
    }

    const newImage = await fetchImage();
    console.log('newImage', newImage);

    const checked = true;
    const item = {
      title,
      url,
      size,
      count,
      checked,
      image: newImage,
      description,
      desc: description,
      price,
      currency,
    };

    addItem(item);
    if(!__DEV__) {
      resetForm();
    }
    setModalVisible(false);
  };

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setSize('');
    setCount('1');
    setDescription('');
    setPrice('');
    setCurrency('');
  };

  const handleCancel = () => {
    if(!__DEV__) {
      resetForm();
    }
    setModalVisible(false);
  };

  return (
    <Modal
      transparent={true}
      visible={modalVisible}
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}>
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Product</Text>

          <View style={styles.row}>
            <Text style={styles.label}>{t('Ad')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Ad')}
              placeholderTextColor={'#ddd'}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              {t('Link')}
              <Text style={styles.require}> *</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="URL"
              placeholderTextColor={'#ddd'}
              value={url}
              onChangeText={setUrl}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('Beden')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Beden')}
              placeholderTextColor={'#ddd'}
              value={size}
              onChangeText={setSize}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              {t('Miktar')}
              <Text style={styles.require}> *</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('Miktar')}
              placeholderTextColor={'#ddd'}
              value={count}
              onChangeText={setCount}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('Açıklama')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Açıklama')}
              placeholderTextColor={'#ddd'}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              width: '100%',
            }}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => handleCancel()}>
              <Text style={styles.closeButtonText}>{t('İptal')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>{t('Ürün Ekle')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
