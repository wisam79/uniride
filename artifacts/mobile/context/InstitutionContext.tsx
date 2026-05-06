import React, { createContext, useState, useContext, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface Institution {
  id: string;
  name: string;
  location: string | null;
}

interface InstitutionContextValue {
  institutions: Institution[];
  fetchInstitutions: () => Promise<void>;
}

const InstitutionContext = createContext<InstitutionContextValue | null>(null);

export function InstitutionProvider({ children }: { children: React.ReactNode }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const fetchInstitutions = useCallback(async () => {
    const { data } = await supabase.from("institutions").select("*").order("name");
    if (data) setInstitutions(data as Institution[]);
  }, []);

  const value: InstitutionContextValue = {
    institutions,
    fetchInstitutions,
  };

  return <InstitutionContext.Provider value={value}>{children}</InstitutionContext.Provider>;
}

export function useInstitution() {
  const ctx = useContext(InstitutionContext);
  if (!ctx) throw new Error("useInstitution must be used within InstitutionProvider");
  return ctx;
}
