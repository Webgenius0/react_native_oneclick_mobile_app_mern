import {t, tr} from '../translate/i18n';
import {Text} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import {useContext} from 'react';
import {EmContext} from '../contexts/EmContext';

export default function ({
  teslimatSehirID,
  setTeslimatSehirID,
  teslimatSehirs,
  changeText,
  label,
  refProps
}) {
  const {ctx} = useContext(EmContext);

  let selectedItem = teslimatSehirs.find(
    item => item.value === teslimatSehirID,
  );

  if(!selectedItem){
    selectedItem = {
      label: t('Şehir Seçin'),
      value: null,
    };
  }

  return (
    <>
      <RNPickerSelect
        ref={refProps}
        onValueChange={value => setTeslimatSehirID(value)}
        style={{
          inputAndroid: {
            color: '#333',
            fontSize: 14,
            padding: 0,
            margin: 0,
            marginBottom: 15,
          },
          inputIOS: {
            color: '#333',
            fontSize: 14,
            padding: 0,
            margin: 0,
            paddingBottom: 0,
          },
          iconContainer: {
            top: 0,
            right: 0,
            bottom: 0,
            paddingBottom: 0,
          },
          viewContainer: {
            padding: 0,
            margin:0,
          },
          placeholder: {
            margin: 0,
            padding: 0
          },
        }}
        useNativeAndroidPickerStyle={false}
        fixAndroidTouchableBug={true}
        items={teslimatSehirs.map(item => {
          return {
            label: item.label,
            value: item.value,
          };
        })}
        value={teslimatSehirID || 0}>
        <Text style={{color: '#000', backgroundColor: '#b2ed95', fontSize: 16, fontWeight: 'bold'}}>
          {label ? t('Teslimat Şehri') + ': ' : ''}
          {selectedItem?.label}
          {changeText ? ' (' + t('Değiştir') + ')' : ''}
        </Text>
      </RNPickerSelect>
    </>
  );
}
