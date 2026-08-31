
import {ActivityIndicator, Text} from 'react-native';

export default function Loading({status, color, size}){
  // show loading icon

  if(!status){
    return null;
  }

  if(!color){
    color = "#0000ff";
  }

  if(!size){
    size = "small";
  }


  return (<ActivityIndicator size={size} color={color} />)
}
