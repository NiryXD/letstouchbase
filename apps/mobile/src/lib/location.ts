// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Business Trip) ──
import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

import { supabase } from './supabase';

/**
 * Business Trip — temporarily relocate your deck. Geocodes a typed
 * city/address and overrides profiles.location (the PostGIS point the deck
 * queries), flagging is_business_trip. "Return to office" resets to the
 * device's real location. Same WKT-string write the onboarding flow uses.
 */
export function useStartBusinessTrip() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (address: string) => {
      const trimmed = address.trim();
      if (!trimmed) throw new Error('Enter a city or address.');
      const matches = await Location.geocodeAsync(trimmed);
      if (!matches[0]) throw new Error("Couldn't find that location. Try a city and region.");
      const { latitude, longitude } = matches[0];
      const { error } = await supabase
        .from('profiles')
        .update({ location: `POINT(${longitude} ${latitude})`, is_business_trip: true })
        .eq('user_id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['deck'] });
    },
  });
}

export function useEndBusinessTrip() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // best-effort reset to the real device location; the flag clears regardless
      let locationWkt: string | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          locationWkt = `POINT(${pos.coords.longitude} ${pos.coords.latitude})`;
        }
      } catch {
        // keep the existing point if we can't read the device's
      }
      const patch: Record<string, unknown> = { is_business_trip: false };
      if (locationWkt) patch.location = locationWkt;
      const { error } = await supabase.from('profiles').update(patch).eq('user_id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['deck'] });
    },
  });
}
