import { useEffect,useState } from 'react';
export function useLocalState<T>(key:string,initial:T){
 const [value,setValue]=useState<T>(()=>{try{const v=localStorage.getItem(key);return v?JSON.parse(v):initial}catch{return initial}});
 useEffect(()=>{localStorage.setItem(key,JSON.stringify(value))},[key,value]);
 return [value,setValue] as const;
}
