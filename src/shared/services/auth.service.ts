import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Session, User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supa = inject(SupabaseService);

  // Сессия и готовность
  private readonly _session = signal<Session | null>(null);
  private readonly _ready = signal(false);

  // Профиль и роль
  private readonly _profile = signal<any | null>(null);
  private readonly _role = computed<string | null>(() => this._profile()?.role ?? null);

  // Публичные сигналы
  readonly ready = computed(() => this._ready());
  readonly isLoggedIn = computed(() => !!this._session());
  readonly isAdmin = computed(() => this._role() === 'admin');
  readonly profile = computed(() => this._profile());

  // Первичная инициализация (для guard-ов)
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    // 1) восстановление сессии
    const { data } = await this.supa.supa.auth.getSession();
    const session = data.session ?? null;
    this._session.set(session);

    // 2) если залогинен — грузим профиль прежде чем ставить ready=true
    if (session?.user) {
      await this.loadProfile(session.user);
    } else {
      this._profile.set(null);
    }

    this._ready.set(true);

    // 3) подписка на дальнейшие изменения
    this.supa.supa.auth.onAuthStateChange(async (_event, session2) => {
      this._session.set(session2 ?? null);
      if (session2?.user) {
        await this.loadProfile(session2.user);
      } else {
        this._profile.set(null);
      }
    });
  }

  private async loadProfile(user: User): Promise<void> {
    const { data, error } = await this.supa.supa
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!error) this._profile.set(data);
  }

  /** Ждать, пока первая инициализация (с возможной загрузкой профиля) завершится */
  waitUntilReady(): Promise<void> {
    return this.initPromise;
  }

  /** Форс-перезагрузка профиля (например после изменения роли) */
  async refreshProfile(): Promise<void> {
    const u = (await this.supa.supa.auth.getUser()).data.user;
    if (u) await this.loadProfile(u);
  }

  /** Текущая сессия, если нужно вне сигналов */
  get session(): Session | null {
    return this._session();
  }
}
