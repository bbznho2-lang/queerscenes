export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          message: string
          sender_role: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          message: string
          sender_role?: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      content_clicks: {
        Row: {
          clicked_at: string
          content_id: string
          episode_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          clicked_at?: string
          content_id: string
          episode_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          clicked_at?: string
          content_id?: string
          episode_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_clicks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          author_name: string
          body: string
          content_id: string
          created_at: string
          id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          author_name?: string
          body: string
          content_id: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          content_id?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          banner_url: string | null
          created_at: string
          id: string
          is_archived: boolean
          is_premium: boolean
          links: Json
          player_url: string | null
          position: number
          preview_video_url: string | null
          section: string
          supporter_player_enabled: boolean
          synopsis: string | null
          tag: string
          title: string
          type: string
          updated_at: string
          year: number
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          is_premium?: boolean
          links?: Json
          player_url?: string | null
          position?: number
          preview_video_url?: string | null
          section?: string
          supporter_player_enabled?: boolean
          synopsis?: string | null
          tag?: string
          title?: string
          type?: string
          updated_at?: string
          year?: number
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          is_premium?: boolean
          links?: Json
          player_url?: string | null
          position?: number
          preview_video_url?: string | null
          section?: string
          supporter_player_enabled?: boolean
          synopsis?: string | null
          tag?: string
          title?: string
          type?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      direct_message_hides: {
        Row: {
          hidden_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          hidden_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_message_hides_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          media_name: string | null
          media_type: string | null
          media_url: string | null
          recipient_id: string | null
          sender_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          media_name?: string | null
          media_type?: string | null
          media_url?: string | null
          recipient_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          media_name?: string | null
          media_type?: string | null
          media_url?: string | null
          recipient_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      episodes: {
        Row: {
          content_id: string
          created_at: string
          episode_number: number
          id: string
          is_premium: boolean
          links: Json
          player_url: string | null
          season: number
          title: string
        }
        Insert: {
          content_id: string
          created_at?: string
          episode_number?: number
          id?: string
          is_premium?: boolean
          links?: Json
          player_url?: string | null
          season?: number
          title?: string
        }
        Update: {
          content_id?: string
          created_at?: string
          episode_number?: number
          id?: string
          is_premium?: boolean
          links?: Json
          player_url?: string | null
          season?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_episodes: {
        Row: {
          content_id: string | null
          created_at: string
          episode_id: string | null
          id: string
          position: number
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          episode_id?: string | null
          id?: string
          position?: number
        }
        Update: {
          content_id?: string | null
          created_at?: string
          episode_id?: string | null
          id?: string
          position?: number
        }
        Relationships: []
      }
      pending_supporters: {
        Row: {
          claimed_at: string | null
          created_at: string
          email: string
          id: string
          plan: string
          premium_expires_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          email: string
          id?: string
          plan: string
          premium_expires_at: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          plan?: string
          premium_expires_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_premium: boolean
          last_name: string | null
          premium_expires_at: string | null
          premium_plan: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_premium?: boolean
          last_name?: string | null
          premium_expires_at?: string | null
          premium_plan?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_premium?: boolean
          last_name?: string | null
          premium_expires_at?: string | null
          premium_plan?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_notes: {
        Row: {
          body: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_chats: {
        Row: {
          client_token: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_email: string
          user_name: string
        }
        Insert: {
          client_token?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_email: string
          user_name: string
        }
        Update: {
          client_token?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      supporter_events: {
        Row: {
          content_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          content_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_contents: {
        Args: { _ids: string[] }
        Returns: {
          banner_url: string
          id: string
          is_premium: boolean
          player_url: string
          position: number
          section: string
          synopsis: string
          tag: string
          title: string
          type: string
          year: number
        }[]
      }
      admin_get_contents_v2: {
        Args: { _ids: string[] }
        Returns: {
          banner_url: string
          id: string
          is_premium: boolean
          links: Json
          player_url: string
          position: number
          section: string
          synopsis: string
          tag: string
          title: string
          type: string
          year: number
        }[]
      }
      admin_get_episodes: {
        Args: { _content_id: string }
        Returns: {
          content_id: string
          created_at: string
          episode_number: number
          id: string
          is_premium: boolean
          links: Json
          player_url: string
          season: number
          title: string
        }[]
      }
      admin_set_profile_premium: {
        Args: {
          _is_premium: boolean
          _premium_expires_at?: string
          _premium_plan?: string
          _profile_id: string
        }
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_premium: boolean
          last_name: string
          premium_expires_at: string
          premium_plan: string
          user_id: string
        }[]
      }
      claim_supporter_for_current_user: { Args: never; Returns: Json }
      count_unread_direct_messages: { Args: never; Returns: number }
      current_user_can_play_premium: { Args: never; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_content_links: { Args: { _content_id: string }; Returns: Json }
      get_content_player_url: { Args: { _content_id: string }; Returns: string }
      get_episode_links: { Args: { _episode_id: string }; Returns: Json }
      get_episode_player_url: { Args: { _episode_id: string }; Returns: string }
      get_supporter_user_ids: {
        Args: { _user_ids: string[] }
        Returns: {
          user_id: string
        }[]
      }
      get_top_content_ids: {
        Args: { _limit?: number }
        Returns: {
          clicks: number
          content_id: string
          rank: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_support_chat_messages: {
        Args: { _chat_id: string; _token: string }
        Returns: {
          chat_id: string
          created_at: string
          id: string
          message: string
          sender_role: string
        }[]
      }
      log_supporter_event: {
        Args: {
          _content_id?: string
          _event_type: string
          _metadata?: Json
          _source: string
        }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      send_support_chat_message: {
        Args: { _chat_id: string; _message: string; _token: string }
        Returns: string
      }
      start_support_chat: {
        Args: { _email: string; _name: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
