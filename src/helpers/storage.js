import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageSet = async (k, v) => {
  try {
    let d = typeof v !== 'string' ? JSON.stringify(v) : v;
    await AsyncStorage.setItem(k, d);
  } catch (error) {
    console.log('Something went wrong set', error);
  }
};

export const storageGet = async (k) => {
  let d1 = null, d2 = null;
  let log = false;
  try {
    d1 = await AsyncStorage.getItem(k);
   if(log) console.log('storageGet FN k:', k, ' d1:', d1);
    // Parse once (IsJsonString + JSON.parse parsed every value twice; this
    // runs on every API request via getToken).
    try {
      d2 = JSON.parse(d1);
    } catch (_) {
      d2 = d1;
    }
  } catch (error) {
    console.log("\n\n"+"storageGet ---> Something went wrong get", error, "\n\n\n");
  }
  return d2;
};

export const storageDelete = async (k) => {
  try {
    await AsyncStorage.removeItem(k);
  } catch (error) {
    console.log('Something went wrong delete', error);
  }
};

export const IsJsonString = str => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

export const storageAllKeys = async () => {
  let keys = [];
  try {
    keys = await AsyncStorage.getAllKeys();
  } catch (error) {
    console.log('Something went wrong getAllKeys', error);
  }
  return keys;
};
