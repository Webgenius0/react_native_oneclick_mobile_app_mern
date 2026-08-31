import DocumentPicker from 'react-native-document-picker';
import {tr} from '../../translate/i18n';
import {useState} from 'react';
import FastImage from 'react-native-fast-image';
import {Text, TouchableOpacity} from 'react-native';
import NoImage from '../../assets/svg/no-image.svg';

export default function({item, onChange}) {

  const [img, setImg] = useState('');
  const defaultImg = {uri: item.image || ''};
  const [uploadFile, setUploadFile] = useState(defaultImg);


  const selectFile = async () => {
    // Opening Document Picker to select one file
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        allowMultiSelection: false,
        // mode: "import",
      });

      setUploadFile(res[0]);

      let imgData = {
        uri: uploadFile?.uri,
        type: uploadFile?.type, // or photo.type
        name: uploadFile?.name,
      };


      onChange('imgData', imgData);
      console.log("select file res : " + JSON.stringify(res[0]));
    } catch (err) {
      //setUploadFile(null);
      console.log("catch", err);
      if (DocumentPicker.isCancel(err)) {
        alert(tr("İptal Edildi"));
      } else {
        alert("Unknown Error: " + JSON.stringify(err));
        throw err;
      }
    }
  };

  return (
    <TouchableOpacity onPress={async () => selectFile()}
                      style={{flexDirection: 'row', alignItems: 'center'}}>

      {uploadFile?.uri && uploadFile?.uri.length > 3 ? (
    <FastImage
      source={{uri: uploadFile?.uri || 'https://via.placeholder.com/150'}}
      style={{width: 50, height: 50, marginRight: 10}}
      resizeMode={FastImage.resizeMode.cover}
    />) : (<>
        <NoImage width={50} height={50} style={{marginRight: 10}} fill={'#333'}/>
      </>)
      }

    </TouchableOpacity>
  )




}
