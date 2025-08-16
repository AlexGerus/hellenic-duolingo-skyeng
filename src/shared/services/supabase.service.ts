import { environment } from '../../environments/environment';
import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  client: SupabaseClient;
  router = inject(Router);

  constructor() {
    const url = environment.supabaseUrl;
    const key = environment.supabaseAnonKey;

    this.client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        flowType: 'pkce'
      },
    });
    (globalThis as any).__SUPABASE_CLIENT__ = this.client;
  }

  get supa() {
    return this.client;
  }

  async signUp(email: string, password: string) {
    const { error } = await this.client.auth.signUp({ email, password });
    if (error) throw error;
  }

  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw error;
    } else {
      this.router.navigate(['/login']);
    }
  }
}
