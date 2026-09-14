'use client';

import { createContext, useContext } from 'react';

const Contexte = createContext(null);

export default function FournisseurTextes({ langue, t, children }) {
  return <Contexte.Provider value={{ langue, t }}>{children}</Contexte.Provider>;
}

export function useTextes() {
  return useContext(Contexte);
}
