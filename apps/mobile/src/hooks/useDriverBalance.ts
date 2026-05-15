import { supabase } from '../lib/supabase';
import { useAsyncData } from './useAsyncData';

export interface DriverBalance {
  total_earned: number;
  total_paid: number;
  pending_payouts: number;
  balance: number;
  available_to_withdraw: number;
}

export function useDriverBalance() {
  const result = useAsyncData<DriverBalance | null>(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (driverError || !driverData) return null;

    const { data, error } = await supabase.rpc('get_driver_balance', {
      p_driver_id: driverData.id,
    });

    if (error) throw error;
    return data as DriverBalance;
  }, null);

  return {
    balance: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.execute,
  };
}
