import { createContext } from 'react';
import type { ToastContextType } from './toastTypes';

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
