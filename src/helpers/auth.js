import { storageGet, storageSet } from "./storage";


export const getToken = async () => {
  let token = null;
  try {
    let user = await getUser();
    token = user?.token;
  } catch (error) {
    console.log('Something went wrong - getToken', error);
    return 'catch err';
  }
  return token;
};

export const getUser = async () => {
  let user = null;
  try {
    user = await storageGet("user");
  } catch (error) {
    console.log('Something went wrong getUser', error);
  }

  return user;
};

export const setUser = async user => {
  try {
    await storageSet("user", user);
  } catch (error) {
    console.log('Something went wrong', error);
  }
};
