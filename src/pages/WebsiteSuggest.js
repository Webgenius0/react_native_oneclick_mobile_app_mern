import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  TextInput,
  Button,
  Touchable,
} from 'react-native';
import {useContext, useEffect, useState} from 'react';
import {tr} from '../translate/i18n';
import Colors from '../assets/Colors';
import {EmContext} from '../contexts/EmContext';
import {supportPhone} from '../../config';

export default function ({route, navigation}) {
  const {ctx} = useContext(EmContext);

  const [state, setState] = useState({
    link: '',
  });

  useEffect(() => {
    navigation.setOptions({
      title: tr('Suggest Website') || 'Suggest Website',
    });
  }, []);

  const handleSubmit = () => {
    let text = 'New website suggestion: ' + state.link;
    // encode text
    text = encodeURI(text);
    Linking.openURL('https://wa.me/' + supportPhone + '?text=' + text);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ctx.bgColor,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    text: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
      color: ctx.color,
    },
    textInput: {
      height: 40,
      width: '100%',
      borderColor: 'gray',
      borderWidth: 1,
      color: ctx.color,
    },

    btn: {
      marginTop: 20,
      backgroundColor: Colors.primary,
      padding: 10,
      borderRadius: 5,
    },
    btnText: {color: '#FFF', fontSize: 20},
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Link</Text>
      <TextInput
        style={styles.textInput}
        onChangeText={text => setState({...state, link: text})}
        value={state.link} />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
        <Text style={styles.btnText}>{tr('Submit') || 'Submit'}</Text>
      </TouchableOpacity>
    </View>
  );
}
