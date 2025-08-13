import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  client: SupabaseClient;

  constructor() {
    const url = environment.supabaseUrl;
    const key = environment.supabaseAnonKey;

    this.client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        flowType: 'pkce' // Добавьте это
      },
    });
    (globalThis as any).__SUPABASE_CLIENT__ = this.client;
  }

  get supa() { return this.client; }

  async signInWithOtp(email: string) {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true
      }
    });
    if (error) throw error;
  }
}
