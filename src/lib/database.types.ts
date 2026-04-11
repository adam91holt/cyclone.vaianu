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
      comprehensive_reports: {
        Row: {
          cache_creation_tokens: number | null
          cache_read_tokens: number | null
          duration_ms: number | null
          generated_at: string
          headline: string
          id: string
          input_tokens: number | null
          key_findings: Json | null
          markdown: string
          model: string
          output_tokens: number | null
          severity: string | null
          summary: string | null
          tool_calls: Json | null
        }
        Insert: {
          cache_creation_tokens?: number | null
          cache_read_tokens?: number | null
          duration_ms?: number | null
          generated_at?: string
          headline: string
          id?: string
          input_tokens?: number | null
          key_findings?: Json | null
          markdown: string
          model: string
          output_tokens?: number | null
          severity?: string | null
          summary?: string | null
          tool_calls?: Json | null
        }
        Update: {
          cache_creation_tokens?: number | null
          cache_read_tokens?: number | null
          duration_ms?: number | null
          generated_at?: string
          headline?: string
          id?: string
          input_tokens?: number | null
          key_findings?: Json | null
          markdown?: string
          model?: string
          output_tokens?: number | null
          severity?: string | null
          summary?: string | null
          tool_calls?: Json | null
        }
        Relationships: []
      }
      crowd_reports: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          latitude: number | null
          location_text: string
          longitude: number | null
          report_text: string
          reviewed_at: string | null
          reviewer_note: string | null
          status: string
          submitter_name: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location_text: string
          longitude?: number | null
          report_text: string
          reviewed_at?: string | null
          reviewer_note?: string | null
          status?: string
          submitter_name?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location_text?: string
          longitude?: number | null
          report_text?: string
          reviewed_at?: string | null
          reviewer_note?: string | null
          status?: string
          submitter_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      cyclone_summaries: {
        Row: {
          cyclone_lat: number | null
          cyclone_lon: number | null
          cyclone_position_confidence: string | null
          cyclone_position_rationale: string | null
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
          cyclone_lat?: number | null
          cyclone_lon?: number | null
          cyclone_position_confidence?: string | null
          cyclone_position_rationale?: string | null
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
          cyclone_lat?: number | null
          cyclone_lon?: number | null
          cyclone_position_confidence?: string | null
          cyclone_position_rationale?: string | null
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
      email_signups: {
        Row: {
          created_at: string | null
          email: string
          id: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
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
      nema_alerts: {
        Row: {
          body: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          link: string | null
          published_at: string | null
          severity: string
          summary: string | null
          title: string
        }
        Insert: {
          body?: string | null
          first_seen_at?: string
          id: string
          last_seen_at?: string
          link?: string | null
          published_at?: string | null
          severity: string
          summary?: string | null
          title: string
        }
        Update: {
          body?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          link?: string | null
          published_at?: string | null
          severity?: string
          summary?: string | null
          title?: string
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
      nzh_liveblog_posts: {
        Row: {
          author: string | null
          body: string | null
          fetched_at: string
          headline: string
          post_id: string
          published_at: string
          shared_links: Json
          source_updated_at: string | null
        }
        Insert: {
          author?: string | null
          body?: string | null
          fetched_at?: string
          headline: string
          post_id: string
          published_at: string
          shared_links?: Json
          source_updated_at?: string | null
        }
        Update: {
          author?: string | null
          body?: string | null
          fetched_at?: string
          headline?: string
          post_id?: string
          published_at?: string
          shared_links?: Json
          source_updated_at?: string | null
        }
        Relationships: []
      }
      nzta_road_events: {
        Row: {
          alternative_route: string | null
          centroid_lat: number | null
          centroid_lon: number | null
          comments: string | null
          description: string | null
          end_date: string | null
          event_type: string | null
          expected_resolution: string | null
          first_seen_at: string
          geometry: Json | null
          highway: string | null
          id: string
          impact: string | null
          island: string | null
          last_seen_at: string
          location: string | null
          planned: boolean
          region: string | null
          severity: string
          start_date: string | null
          status: string | null
        }
        Insert: {
          alternative_route?: string | null
          centroid_lat?: number | null
          centroid_lon?: number | null
          comments?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          expected_resolution?: string | null
          first_seen_at?: string
          geometry?: Json | null
          highway?: string | null
          id: string
          impact?: string | null
          island?: string | null
          last_seen_at?: string
          location?: string | null
          planned?: boolean
          region?: string | null
          severity: string
          start_date?: string | null
          status?: string | null
        }
        Update: {
          alternative_route?: string | null
          centroid_lat?: number | null
          centroid_lon?: number | null
          comments?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          expected_resolution?: string | null
          first_seen_at?: string
          geometry?: Json | null
          highway?: string | null
          id?: string
          impact?: string | null
          island?: string | null
          last_seen_at?: string
          location?: string | null
          planned?: boolean
          region?: string | null
          severity?: string
          start_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      power_outages: {
        Row: {
          cause: string | null
          centroid_lat: number | null
          centroid_lon: number | null
          cleared_at: string | null
          customer_count: number | null
          end_time: string | null
          equipment: string | null
          first_seen_at: string
          geometry: Json | null
          incident_id: string
          last_seen_at: string
          localities: string[] | null
          notes: string | null
          provider: string
          region: string | null
          restoration_hint: string | null
          service: string
          start_time: string | null
          status: string
          title: string | null
        }
        Insert: {
          cause?: string | null
          centroid_lat?: number | null
          centroid_lon?: number | null
          cleared_at?: string | null
          customer_count?: number | null
          end_time?: string | null
          equipment?: string | null
          first_seen_at?: string
          geometry?: Json | null
          incident_id: string
          last_seen_at?: string
          localities?: string[] | null
          notes?: string | null
          provider: string
          region?: string | null
          restoration_hint?: string | null
          service?: string
          start_time?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          cause?: string | null
          centroid_lat?: number | null
          centroid_lon?: number | null
          cleared_at?: string | null
          customer_count?: number | null
          end_time?: string | null
          equipment?: string | null
          first_seen_at?: string
          geometry?: Json | null
          incident_id?: string
          last_seen_at?: string
          localities?: string[] | null
          notes?: string | null
          provider?: string
          region?: string | null
          restoration_hint?: string | null
          service?: string
          start_time?: string | null
          status?: string
          title?: string | null
        }
        Relationships: []
      }
      power_outages_summary: {
        Row: {
          by_provider: Json
          by_region: Json
          id: number
          providers_failed: string[]
          total_customers: number
          total_incidents: number
          updated_at: string
        }
        Insert: {
          by_provider?: Json
          by_region?: Json
          id?: number
          providers_failed?: string[]
          total_customers?: number
          total_incidents?: number
          updated_at?: string
        }
        Update: {
          by_provider?: Json
          by_region?: Json
          id?: number
          providers_failed?: string[]
          total_customers?: number
          total_incidents?: number
          updated_at?: string
        }
        Relationships: []
      }
      river_readings: {
        Row: {
          council: string
          measurement: string
          site: string
          ts: string
          value: number | null
        }
        Insert: {
          council: string
          measurement?: string
          site: string
          ts: string
          value?: number | null
        }
        Update: {
          council?: string
          measurement?: string
          site?: string
          ts?: string
          value?: number | null
        }
        Relationships: []
      }
      river_sites: {
        Row: {
          council: string
          council_name: string | null
          last_fetched_at: string
          latest_ts: string | null
          latest_value: number | null
          latitude: number | null
          longitude: number | null
          measurement: string
          name: string
          unit: string | null
        }
        Insert: {
          council: string
          council_name?: string | null
          last_fetched_at?: string
          latest_ts?: string | null
          latest_value?: number | null
          latitude?: number | null
          longitude?: number | null
          measurement?: string
          name: string
          unit?: string | null
        }
        Update: {
          council?: string
          council_name?: string | null
          last_fetched_at?: string
          latest_ts?: string | null
          latest_value?: number | null
          latitude?: number | null
          longitude?: number | null
          measurement?: string
          name?: string
          unit?: string | null
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
      timeline_events: {
        Row: {
          body: string | null
          event_key: string
          first_seen_at: string
          id: string
          kind: string
          last_seen_at: string
          link: string | null
          metadata: Json | null
          occurred_at: string
          region: string | null
          severity: string
          source: string | null
          title: string
        }
        Insert: {
          body?: string | null
          event_key: string
          first_seen_at?: string
          id?: string
          kind: string
          last_seen_at?: string
          link?: string | null
          metadata?: Json | null
          occurred_at: string
          region?: string | null
          severity: string
          source?: string | null
          title: string
        }
        Update: {
          body?: string | null
          event_key?: string
          first_seen_at?: string
          id?: string
          kind?: string
          last_seen_at?: string
          link?: string | null
          metadata?: Json | null
          occurred_at?: string
          region?: string | null
          severity?: string
          source?: string | null
          title?: string
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
          wind_direction_deg: number | null
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
          wind_direction_deg?: number | null
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
          wind_direction_deg?: number | null
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
      get_latest_region_weather: {
        Args: never
        Returns: {
          gust_kmh: number
          humidity: number
          precip_mm: number
          pressure_hpa: number
          recorded_at: string
          region: string
          temp_c: number
          wind_direction_deg: number
          wind_kmh: number
        }[]
      }
      get_river_summary: {
        Args: never
        Returns: {
          baseline_ts: string
          baseline_value: number
          change: number
          change_pct: number
          council: string
          council_name: string
          latest_ts: string
          latest_value: number
          latitude: number
          longitude: number
          name: string
          reading_count: number
          unit: string
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
