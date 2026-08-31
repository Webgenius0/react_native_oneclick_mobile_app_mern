import {ScrollView, Text, View} from 'react-native';
import GlobalStyle from "../assets/GlobalStyle";

export default function(props){

  if(!__DEV__) return (<></>);



  if(props.hasOwnProperty('show') && !props.show) return (<></>);

  if(props.hasOwnProperty('show')){
    // remove show property
    let newProps = {...props};
    delete newProps.show;

    props = newProps;
  }

  const inner = <Text style={GlobalStyle.text}>{JSON.stringify(props, null, 2)}</Text>;


  if(props.hasOwnProperty('scroll') && props.scroll) return(
    <ScrollView style={{height: 200}}>
    <View style={{flex: 1, backgroundColor: '#EEE', padding: 5, width: '100%'}}>
      {inner}
    </View>
    </ScrollView>
  );

  return(
    <View>
      {inner}
    </View>
  )
}
