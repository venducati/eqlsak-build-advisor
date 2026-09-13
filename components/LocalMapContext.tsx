import { createContext } from 'react';
export const LocalMapContext=createContext<((zone:string)=>void)|null>(null);
