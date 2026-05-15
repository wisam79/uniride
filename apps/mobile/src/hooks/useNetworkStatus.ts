import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

export function evaluateState(state: NetInfoState): boolean {
  if (!state.isConnected) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      setIsOnline(evaluateState(state));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(evaluateState(state));
    });

    const interval = setInterval(async () => {
      const { error } = await supabase.rpc('ping');
      setIsOnline(!error);
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { isOnline };
}
