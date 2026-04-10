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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cyclone_summaries: {
        Row: {
          generated_at: string
          headline: string
          id: string
          key_points: Json
          landfall_confidence: string | null
          landfall_estimate_iso: string | null
          landfall_rationale: string | null
          landfall_region: string | null
          model: string
          ratings: Json | null
          regional_snapshot: Json
          seriousness: number | null
          severity: string
          summary: string
        }
        Insert: {
          generated_at?: string
          headline: string
          id?: string
          key_points?: Json
          landfall_confidence?: string | null
          landfall_estimate_iso?: string | null
          landfall_rationale?: string | null
          landfall_region?: string | null
          model?: string
          ratings?: Json | null
          regional_snapshot?: Json
          seriousness?: number | null
          severity: string
          summary: string
        }
        Update: {
          generated_at?: string
          headline?: string
          id?: string
          key_points?: Json
          landfall_confidence?: string | null
          landfall_estimate_iso?: string | null
          landfall_rationale?: string | null
          landfall_region?: string | null
          model?: string
          ratings?: Json | null
          regional_snapshot?: Json
          seriousness?: number | null
          severity?: string
          summary?: string
        }
        Relationships: []
      }
      metservice_cache: {
        Row: {
          data: Json
          expires_at: string
          fetched_at: string
          resource: string
          source_status: number | null
        }
        Insert: {
          data: Json
          expires_at: string
          fetched_at?: string
          resource: string
          source_status?: number | null
        }
        Update: {
          data?: Json
          expires_at?: string
          fetched_at?: string
          resource?: string
          source_status?: number | null
        }
        Relationships: []
      }
      metservice_observations: {
        Row: {
          display_order: number
          fetched_at: string
          humidity: number | null
          obs_time: string | null
          pressure_hpa: number | null
          pressure_trend: string | null
          rainfall_24h_mm: number | null
          rainfall_3h_mm: number | null
          station: string | null
          temp_c: number | null
          town_name: string
          town_slug: string
          wind_direction: string | null
          wind_speed_kmh: number | null
        }
        Insert: {
          display_order?: number
          fetched_at?: string
          humidity?: number | null
          obs_time?: string | null
          pressure_hpa?: number | null
          pressure_trend?: string | null
          rainfall_24h_mm?: number | null
          rainfall_3h_mm?: number | null
          station?: string | null
          temp_c?: number | null
          town_name: string
          town_slug: string
          wind_direction?: string | null
          wind_speed_kmh?: number | null
        }
        Update: {
          display_order?: number
          fetched_at?: string
          humidity?: number | null
          obs_time?: string | null
          pressure_hpa?: number | null
          pressure_trend?: string | null
          rainfall_24h_mm?: number | null
          rainfall_3h_mm?: number | null
          station?: string | null
          temp_c?: number | null
          town_name?: string
          town_slug?: string
          wind_direction?: string | null
          wind_speed_kmh?: number | null
        }
        Relationships: []
      }
      metservice_warnings_national: {
        Row: {
          area_description: string | null
          base_name: string | null
          cap_id: string
          change_notes: string | null
          display_regions: string[] | null
          event_type: string | null
          expires_at: string | null
          fetched_at: string
          icon: string | null
          impact: string | null
          instruction: string | null
          is_active: boolean | null
          issued_at: string | null
          name: string | null
          next_issue_at: string | null
          polygons: Json | null
          preview_markdown: string | null
          raw: Json | null
          regions: string[] | null
          situation_headline: string | null
          situation_statement: string | null
          text: string | null
          threat_end_time: string | null
          threat_period: string | null
          threat_period_short: string | null
          threat_start_time: string | null
          warn_icon: string | null
          warn_level: string | null
          warning_type: string | null
        }
        Insert: {
          area_description?: string | null
          base_name?: string | null
          cap_id: string
          change_notes?: string | null
          display_regions?: string[] | null
          event_type?: string | null
          expires_at?: string | null
          fetched_at?: string
          icon?: string | null
          impact?: string | null
          instruction?: string | null
          is_active?: boolean | null
          issued_at?: string | null
          name?: string | null
          next_issue_at?: string | null
          polygons?: Json | null
          preview_markdown?: string | null
          raw?: Json | null
          regions?: string[] | null
          situation_headline?: string | null
          situation_statement?: string | null
          text?: string | null
          threat_end_time?: string | null
          threat_period?: string | null
          threat_period_short?: string | null
          threat_start_time?: string | null
          warn_icon?: string | null
          warn_level?: string | null
          warning_type?: string | null
        }
        Update: {
          area_description?: string | null
          base_name?: string | null
          cap_id?: string
          change_notes?: string | null
          display_regions?: string[] | null
          event_type?: string | null
          expires_at?: string | null
          fetched_at?: string
          icon?: string | null
          impact?: string | null
          instruction?: string | null
          is_active?: boolean | null
          issued_at?: string | null
          name?: string | null
          next_issue_at?: string | null
          polygons?: Json | null
          preview_markdown?: string | null
          raw?: Json | null
          regions?: string[] | null
          situation_headline?: string | null
          situation_statement?: string | null
          text?: string | null
          threat_end_time?: string | null
          threat_period?: string | null
          threat_period_short?: string | null
          threat_start_time?: string | null
          warn_icon?: string | null
          warn_level?: string | null
          warning_type?: string | null
        }
        Relationships: []
      }
      metservice_warnings_summary: {
        Row: {
          fetched_at: string
          highest_level: string | null
          id: number
          summary: Json
          warning_count: number
        }
        Insert: {
          fetched_at?: string
          highest_level?: string | null
          id?: number
          summary?: Json
          warning_count?: number
        }
        Update: {
          fetched_at?: string
          highest_level?: string | null
          id?: number
          summary?: Json
          warning_count?: number
        }
        Relationships: []
      }
      news_items: {
        Row: {
          fetched_at: string
          id: string
          image_url: string | null
          published_at: string | null
          source: string
          summary: string | null
          title: string
          url: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          source: string
          summary?: string | null
          title: string
          url: string
        }
        Update: {
          fetched_at?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          source?: string
          summary?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      niwa_forecast: {
        Row: {
          forecast: Json
          latitude: number | null
          location: Json | null
          location_id: number
          location_name: string
          longitude: number | null
          summary: Json
          updated_at: string
        }
        Insert: {
          forecast?: Json
          latitude?: number | null
          location?: Json | null
          location_id: number
          location_name: string
          longitude?: number | null
          summary?: Json
          updated_at?: string
        }
        Update: {
          forecast?: Json
          latitude?: number | null
          location?: Json | null
          location_id?: number
          location_name?: string
          longitude?: number | null
          summary?: Json
          updated_at?: string
        }
        Relationships: []
      }
      niwa_tweets: {
        Row: {
          created_at: string
          entities: Json | null
          first_seen_at: string
          full_text: string
          last_seen_at: string
          media_type: string | null
          media_url: string | null
          tweet_id: string
        }
        Insert: {
          created_at: string
          entities?: Json | null
          first_seen_at?: string
          full_text: string
          last_seen_at?: string
          media_type?: string | null
          media_url?: string | null
          tweet_id: string
        }
        Update: {
          created_at?: string
          entities?: Json | null
          first_seen_at?: string
          full_text?: string
          last_seen_at?: string
          media_type?: string | null
          media_url?: string | null
          tweet_id?: string
        }
        Relationships: []
      }
      niwa_videos: {
        Row: {
          first_seen_at: string
          id: string
          last_seen_at: string
          name: string
          release_time: string
          tag: string
          thumbnail_url: string | null
          vimeo_id: string
          vimeo_uri: string
        }
        Insert: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          name: string
          release_time: string
          tag: string
          thumbnail_url?: string | null
          vimeo_id: string
          vimeo_uri: string
        }
        Update: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          name?: string
          release_time?: string
          tag?: string
          thumbnail_url?: string | null
          vimeo_id?: string
          vimeo_uri?: string
        }
        Relationships: []
      }
      stuff_liveblog_posts: {
        Row: {
          author: string | null
          body: string | null
          fetched_at: string | null
          headline: string
          post_id: string
          published_at: string
          shared_links: Json | null
          source_updated_at: string | null
        }
        Insert: {
          author?: string | null
          body?: string | null
          fetched_at?: string | null
          headline: string
          post_id: string
          published_at: string
          shared_links?: Json | null
          source_updated_at?: string | null
        }
        Update: {
          author?: string | null
          body?: string | null
          fetched_at?: string | null
          headline?: string
          post_id?: string
          published_at?: string
          shared_links?: Json | null
          source_updated_at?: string | null
        }
        Relationships: []
      }
      weather_history: {
        Row: {
          gust_kmh: number
          humidity: number
          id: number
          precip_mm: number
          pressure_hpa: number
          recorded_at: string
          region: string
          temp_c: number
          wind_kmh: number
        }
        Insert: {
          gust_kmh: number
          humidity: number
          id?: number
          precip_mm: number
          pressure_hpa: number
          recorded_at?: string
          region: string
          temp_c: number
          wind_kmh: number
        }
        Update: {
          gust_kmh?: number
          humidity?: number
          id?: number
          precip_mm?: number
          pressure_hpa?: number
          recorded_at?: string
          region?: string
          temp_c?: number
          wind_kmh?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_feed_health: {
        Args: never
        Returns: {
          active: boolean
          jobname: string
          last_message: string
          last_run_at: string
          last_status: string
          last_success_at: string
          schedule: string
        }[]
      }
      prune_weather_history: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
