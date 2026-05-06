export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          gender: 'male' | 'female' | null;
          role: 'student' | 'driver' | 'admin' | 'unassigned';
          institution_id: string | null;
          is_activated: boolean;
          parent_name: string | null;
          parent_phone: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone?: string | null;
          gender?: 'male' | 'female' | null;
          role?: 'student' | 'driver' | 'admin' | 'unassigned';
          institution_id?: string | null;
          is_activated?: boolean;
          parent_name?: string | null;
          parent_phone?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          gender?: 'male' | 'female' | null;
          role?: 'student' | 'driver' | 'admin' | 'unassigned';
          institution_id?: string | null;
          is_activated?: boolean;
          parent_name?: string | null;
          parent_phone?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      drivers: {
        Row: {
          id: string;
          user_id: string;
          vehicle_info: string | null;
          vehicle_plate: string | null;
          vehicle_color: string | null;
          capacity: number;
          available_seats: number;
          monthly_fee: number;
          commission_bps: number;
          is_available: boolean;
          is_online: boolean;
          institution_id: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_info?: string | null;
          vehicle_plate?: string | null;
          vehicle_color?: string | null;
          capacity?: number;
          available_seats?: number;
          monthly_fee?: number;
          commission_bps?: number;
          is_available?: boolean;
          is_online?: boolean;
          institution_id?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_info?: string | null;
          vehicle_plate?: string | null;
          vehicle_color?: string | null;
          capacity?: number;
          available_seats?: number;
          monthly_fee?: number;
          commission_bps?: number;
          is_available?: boolean;
          is_online?: boolean;
          institution_id?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      routes: {
        Row: {
          id: string;
          driver_id: string;
          from_area: string;
          from_city: string;
          to_university: string;
          institution_id: string | null;
          departure_morning: string;
          departure_evening: string;
          total_seats: number;
          available_seats: number;
          monthly_fare: number;
          gender_preference: 'any' | 'female' | 'male';
          rating_bps: number;
          total_students: number;
          notes: string | null;
          is_active: boolean;
          is_deleted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          from_area: string;
          from_city?: string;
          to_university: string;
          institution_id?: string | null;
          departure_morning: string;
          departure_evening: string;
          total_seats?: number;
          available_seats?: number;
          monthly_fare?: number;
          gender_preference?: 'any' | 'female' | 'male';
          rating_bps?: number;
          total_students?: number;
          notes?: string | null;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          from_area?: string;
          from_city?: string;
          to_university?: string;
          institution_id?: string | null;
          departure_morning?: string;
          departure_evening?: string;
          total_seats?: number;
          available_seats?: number;
          monthly_fare?: number;
          gender_preference?: 'any' | 'female' | 'male';
          rating_bps?: number;
          total_students?: number;
          notes?: string | null;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          student_id: string;
          driver_id: string;
          driver_name: string;
          start_date: string;
          end_date: string;
          monthly_fee: number;
          commission_bps: number;
          commission_amount: number;
          driver_payout: number;
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          trips_used: number;
          trips_per_month: number;
          status: 'pending' | 'active' | 'cancelled' | 'expired';
          activation_code: string | null;
          idempotency_key: string | null;
          cancelled_at: string | null;
          refund_amount: number | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          driver_id: string;
          driver_name: string;
          start_date: string;
          end_date: string;
          monthly_fee: number;
          commission_bps?: number;
          commission_amount?: number;
          driver_payout?: number;
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          trips_used?: number;
          trips_per_month?: number;
          status?: 'pending' | 'active' | 'cancelled' | 'expired';
          activation_code?: string | null;
          idempotency_key?: string | null;
          cancelled_at?: string | null;
          refund_amount?: number | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          driver_id?: string;
          driver_name?: string;
          start_date?: string;
          end_date?: string;
          monthly_fee?: number;
          commission_bps?: number;
          commission_amount?: number;
          driver_payout?: number;
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          trips_used?: number;
          trips_per_month?: number;
          status?: 'pending' | 'active' | 'cancelled' | 'expired';
          activation_code?: string | null;
          idempotency_key?: string | null;
          cancelled_at?: string | null;
          refund_amount?: number | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      trips: {
        Row: {
          id: string;
          driver_id: string;
          subscription_id: string | null;
          direction: 'go' | 'return';
          trip_date: string;
          status: 'scheduled' | 'driver_waiting' | 'in_transit' | 'completed' | 'absent' | 'cancelled';
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          subscription_id?: string | null;
          direction: 'go' | 'return';
          trip_date?: string;
          status?: 'scheduled' | 'driver_waiting' | 'in_transit' | 'completed' | 'absent' | 'cancelled';
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          subscription_id?: string | null;
          direction?: 'go' | 'return';
          trip_date?: string;
          status?: 'scheduled' | 'driver_waiting' | 'in_transit' | 'completed' | 'absent' | 'cancelled';
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
        };
      };
      driver_absences: {
        Row: {
          id: string;
          driver_id: string;
          absence_date: string;
          deducted_amount: number;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          absence_date: string;
          deducted_amount?: number;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          absence_date?: string;
          deducted_amount?: number;
          reason?: string | null;
          created_at?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          driver_id: string;
          code: string;
          monthly_fee: number;
          commission_bps: number;
          is_used: boolean;
          used_by: string | null;
          used_at: string | null;
          batch_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          code: string;
          monthly_fee: number;
          commission_bps?: number;
          is_used?: boolean;
          used_by?: string | null;
          used_at?: string | null;
          batch_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          code?: string;
          monthly_fee?: number;
          commission_bps?: number;
          is_used?: boolean;
          used_by?: string | null;
          used_at?: string | null;
          batch_id?: string | null;
          created_at?: string;
        };
      };
      otp_codes: {
        Row: {
          id: string;
          phone: string;
          code: string;
          expires_at: string;
          used: boolean;
          attempts: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          code: string;
          expires_at: string;
          used?: boolean;
          attempts?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          code?: string;
          expires_at?: string;
          used?: boolean;
          attempts?: number;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          subscription_id: string | null;
          rating: number | null;
          comment: string | null;
          is_complaint: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          subscription_id?: string | null;
          rating?: number | null;
          comment?: string | null;
          is_complaint?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user_id?: string;
          to_user_id?: string;
          subscription_id?: string | null;
          rating?: number | null;
          comment?: string | null;
          is_complaint?: boolean;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'request_received' | 'request_accepted' | 'request_rejected' | 'subscription_activated' | 'subscription_expired' | 'subscription_cancelled' | 'driver_at_capacity' | 'trip_started' | 'trip_ended' | 'payment_confirmed' | 'driver_absent' | 'new_review';
          title: string;
          body: string | null;
          data: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'request_received' | 'request_accepted' | 'request_rejected' | 'subscription_activated' | 'subscription_expired' | 'subscription_cancelled' | 'driver_at_capacity' | 'trip_started' | 'trip_ended' | 'payment_confirmed' | 'driver_absent' | 'new_review';
          title: string;
          body?: string | null;
          data?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'request_received' | 'request_accepted' | 'request_rejected' | 'subscription_activated' | 'subscription_expired' | 'subscription_cancelled' | 'driver_at_capacity' | 'trip_started' | 'trip_ended' | 'payment_confirmed' | 'driver_absent' | 'new_review';
          title?: string;
          body?: string | null;
          data?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      student_preferences: {
        Row: {
          id: string;
          student_id: string;
          institution_id: string;
          go_time: string;
          return_time: string;
          pickup_area: string | null;
          dropoff_area: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          institution_id: string;
          go_time: string;
          return_time: string;
          pickup_area?: string | null;
          dropoff_area?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          institution_id?: string;
          go_time?: string;
          return_time?: string;
          pickup_area?: string | null;
          dropoff_area?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      trip_students: {
        Row: {
          id: string;
          trip_id: string;
          student_id: string;
          status: 'waiting' | 'picked_up' | 'dropped_off' | 'absent';
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          student_id: string;
          status?: 'waiting' | 'picked_up' | 'dropped_off' | 'absent';
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          student_id?: string;
          status?: 'waiting' | 'picked_up' | 'dropped_off' | 'absent';
          created_at?: string;
        };
      };
      driver_schedules: {
        Row: {
          id: string;
          driver_id: string;
          direction: 'go' | 'return';
          departure_time: string;
          area: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          direction: 'go' | 'return';
          departure_time: string;
          area?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          direction?: 'go' | 'return';
          departure_time?: string;
          area?: string | null;
          created_at?: string;
        };
      };
      app_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
      };
      subscription_requests: {
        Row: {
          id: string;
          student_id: string;
          driver_id: string;
          institution_id: string;
          go_time: string;
          return_time: string;
          pickup_area: string | null;
          dropoff_area: string | null;
          status: 'pending' | 'accepted' | 'rejected';
          responded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          driver_id: string;
          institution_id: string;
          go_time: string;
          return_time: string;
          pickup_area?: string | null;
          dropoff_area?: string | null;
          status?: 'pending' | 'accepted' | 'rejected';
          responded_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          driver_id?: string;
          institution_id?: string;
          go_time?: string;
          return_time?: string;
          pickup_area?: string | null;
          dropoff_area?: string | null;
          status?: 'pending' | 'accepted' | 'rejected';
          responded_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
