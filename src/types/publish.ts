export interface IFacebookErrorDetailsError {
  message: string;
  type: string;
  code: number;
  error_subcode: number;
}

export interface IFacebookErrorDetails {
  error: IFacebookErrorDetailsError;
}

export interface IFacebookFailedError {
  message: string;
  code?: string; // Changed to optional
  details: IFacebookErrorDetails;
}

export interface IFacebookFailedItem {
  platform: "facebook";
  page_id: string;
  error: IFacebookFailedError;
}

export interface IXErrorDetails {
  title: string;
  detail: string;
  status: number;
  type: string;
}

export interface IXFailedError {
  code?: string; // Changed to optional
  details: IXErrorDetails;
  message: string;
}

export interface IXFailedItem {
  platform: "x";
  account_id: string;
  error: IXFailedError;
}

export type IFailedItem = IFacebookFailedItem | IXFailedItem;

export interface IFailed {
  failed: IFailedItem[];
}
