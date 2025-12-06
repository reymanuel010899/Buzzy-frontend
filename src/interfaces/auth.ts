export const SUCCEES_LOGIN = 'LOGIN CON EXITO'
export const FAILED_LOGIN = 'LOGIN FALLIDO'

export const SUCCEES_REGISTER = 'RESGISTRADO CON EXITO'
export const FAILED_REGISTER = 'REGISTRADO FALLIDO'

export const SUCCEES_GET_PROFILES = 'OBTENER PERFILES CON EXITO'
export const FAILED_GET_PROFILES = 'OBTENER PERFILES  FALLIDO'

export interface IDataSignUp {
    name: string,
    email: string,
    password: string,
}


export interface IUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface ILoginResponse {
  message: string;
  user: IUser;
  token: string;
}

export interface IRegisterResponse {
  message: string;
  user: IUser;
  token: string;
}


export interface IAuthContext {
  user: IUser | null;
  login: (userData: IUser, token: string) => void;
  logout: () => void;
}
