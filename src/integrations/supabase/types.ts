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
      activations: {
        Row: {
          categories: string[] | null
          collections: string[] | null
          content: Json
          created_at: string
          end_date: string | null
          full_width: boolean
          hide_title: boolean
          id: string
          name: string
          price_max: number | null
          price_min: number | null
          start_date: string | null
          type: string
          updated_at: string
        }
        Insert: {
          categories?: string[] | null
          collections?: string[] | null
          content?: Json
          created_at?: string
          end_date?: string | null
          full_width?: boolean
          hide_title?: boolean
          id?: string
          name: string
          price_max?: number | null
          price_min?: number | null
          start_date?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          categories?: string[] | null
          collections?: string[] | null
          content?: Json
          created_at?: string
          end_date?: string | null
          full_width?: boolean
          hide_title?: boolean
          id?: string
          name?: string
          price_max?: number | null
          price_min?: number | null
          start_date?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_integrations: {
        Row: {
          api_key: string | null
          config: Json
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          provider: string
          type: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          provider: string
          type: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          provider?: string
          type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          created_at: string
          direction: string
          error_message: string | null
          id: string
          integration_id: string | null
          payload: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          direction: string
          error_message?: string | null
          id?: string
          integration_id?: string | null
          payload?: Json | null
          status: string
        }
        Update: {
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          integration_id?: string | null
          payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      campaign_assets: {
        Row: {
          asset_type: string
          cached_url: string | null
          created_at: string | null
          enabled: boolean | null
          health_status: string | null
          id: string
          label: string
          last_health_check: string | null
          media_type: string | null
          original_url: string
          render_mode: string | null
          source_id: string | null
          updated_at: string | null
        }
        Insert: {
          asset_type: string
          cached_url?: string | null
          created_at?: string | null
          enabled?: boolean | null
          health_status?: string | null
          id?: string
          label: string
          last_health_check?: string | null
          media_type?: string | null
          original_url: string
          render_mode?: string | null
          source_id?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_type?: string
          cached_url?: string | null
          created_at?: string | null
          enabled?: boolean | null
          health_status?: string | null
          id?: string
          label?: string
          last_health_check?: string | null
          media_type?: string | null
          original_url?: string
          render_mode?: string | null
          source_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_assets_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "campaign_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sources: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          label: string
          page_url: string
          season: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          page_url: string
          season: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          page_url?: string
          season?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      carousel_rules: {
        Row: {
          carousel_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          match_dimensions: string[]
          max_results: number | null
          priority: number
          sort_by: string | null
          target_attribute_overrides: Json | null
          target_category: string
          trigger_categories: string[]
          trigger_filters: Json | null
          updated_at: string | null
        }
        Insert: {
          carousel_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_dimensions?: string[]
          max_results?: number | null
          priority?: number
          sort_by?: string | null
          target_attribute_overrides?: Json | null
          target_category: string
          trigger_categories?: string[]
          trigger_filters?: Json | null
          updated_at?: string | null
        }
        Update: {
          carousel_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_dimensions?: string[]
          max_results?: number | null
          priority?: number
          sort_by?: string | null
          target_attribute_overrides?: Json | null
          target_category?: string
          trigger_categories?: string[]
          trigger_filters?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carousel_rules_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "product_carousels"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_content: {
        Row: {
          category: string | null
          celebrity_name: string
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          product_code: string | null
          shop_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          celebrity_name: string
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          product_code?: string | null
          shop_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          celebrity_name?: string
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          product_code?: string | null
          shop_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          activation_id: string | null
          additional_data: Json | null
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
          product_id: string | null
          reward_code: string | null
          reward_sent: boolean | null
          reward_type: string
        }
        Insert: {
          activation_id?: string | null
          additional_data?: Json | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          phone?: string | null
          product_id?: string | null
          reward_code?: string | null
          reward_sent?: boolean | null
          reward_type?: string
        }
        Update: {
          activation_id?: string | null
          additional_data?: Json | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          product_id?: string | null
          reward_code?: string | null
          reward_sent?: boolean | null
          reward_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      looks: {
        Row: {
          ai_reasoning: string | null
          color_palette: string[] | null
          composition: string
          created_at: string
          description: string | null
          id: string
          name: string
          product_ids: string[]
          style: string | null
          total_price: string | null
          updated_at: string
        }
        Insert: {
          ai_reasoning?: string | null
          color_palette?: string[] | null
          composition: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          product_ids: string[]
          style?: string | null
          total_price?: string | null
          updated_at?: string
        }
        Update: {
          ai_reasoning?: string | null
          color_palette?: string[] | null
          composition?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          product_ids?: string[]
          style?: string | null
          total_price?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          accent_color: string | null
          brand_name: string | null
          custom_css: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          page_title: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string | null
          custom_css?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          page_title?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          brand_name?: string | null
          custom_css?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          page_title?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_activations: {
        Row: {
          activation_id: string
          created_at: string
          display_order: number
          id: string
          product_id: string
        }
        Insert: {
          activation_id: string
          created_at?: string
          display_order?: number
          id?: string
          product_id: string
        }
        Update: {
          activation_id?: string
          created_at?: string
          display_order?: number
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_activations_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_activations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_carousel_items: {
        Row: {
          carousel_id: string
          created_at: string
          display_order: number
          id: string
          source_product_id: string | null
          target_product_id: string
        }
        Insert: {
          carousel_id: string
          created_at?: string
          display_order?: number
          id?: string
          source_product_id?: string | null
          target_product_id: string
        }
        Update: {
          carousel_id?: string
          created_at?: string
          display_order?: number
          id?: string
          source_product_id?: string | null
          target_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_carousel_items_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "product_carousels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_carousel_items_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_carousel_items_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_carousels: {
        Row: {
          created_at: string
          display_order: number
          display_position: string
          exclude_current: boolean
          fallback_behavior: string | null
          fallback_product_ids: string[] | null
          id: string
          is_active: boolean
          layout: Json
          match_config: Json
          match_type: string
          min_products: number
          name: string
          show_on_categories: string[]
          sort_by: string
          target_attribute_overrides: Json
          target_category: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          display_position?: string
          exclude_current?: boolean
          fallback_behavior?: string | null
          fallback_product_ids?: string[] | null
          id?: string
          is_active?: boolean
          layout?: Json
          match_config?: Json
          match_type?: string
          min_products?: number
          name: string
          show_on_categories?: string[]
          sort_by?: string
          target_attribute_overrides?: Json
          target_category?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          display_position?: string
          exclude_current?: boolean
          fallback_behavior?: string | null
          fallback_product_ids?: string[] | null
          id?: string
          is_active?: boolean
          layout?: Json
          match_config?: Json
          match_type?: string
          min_products?: number
          name?: string
          show_on_categories?: string[]
          sort_by?: string
          target_attribute_overrides?: Json
          target_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_pair_scores: {
        Row: {
          click_count: number
          conversion_count: number
          id: string
          product_code_a: string
          product_code_b: string
          score: number
          updated_at: string
          view_count: number
        }
        Insert: {
          click_count?: number
          conversion_count?: number
          id?: string
          product_code_a: string
          product_code_b: string
          score?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          click_count?: number
          conversion_count?: number
          id?: string
          product_code_a?: string
          product_code_b?: string
          score?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      product_views: {
        Row: {
          id: string
          product_id: string
          session_id: string
          user_id: string | null
          view_duration_seconds: number | null
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          session_id: string
          user_id?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          session_id?: string
          user_id?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_attributes: Json | null
          care_instructions: string | null
          category: string | null
          collection: string | null
          color: string | null
          composition: string | null
          created_at: string
          description: string | null
          gender: string
          generated_look: Json | null
          heel_height_mm: number | null
          id: string
          images: Json | null
          is_available: boolean
          material: string | null
          name: string
          occasion: string[] | null
          price: string | null
          price_tier: string | null
          product_code: string | null
          shopify_handle: string | null
          short_code: string | null
          silhouette_family: string | null
          slug: string
          source_url: string | null
          style_mood: string | null
          updated_at: string
          wear_with: Json | null
          you_may_also_like: Json | null
        }
        Insert: {
          ai_attributes?: Json | null
          care_instructions?: string | null
          category?: string | null
          collection?: string | null
          color?: string | null
          composition?: string | null
          created_at?: string
          description?: string | null
          gender?: string
          generated_look?: Json | null
          heel_height_mm?: number | null
          id?: string
          images?: Json | null
          is_available?: boolean
          material?: string | null
          name: string
          occasion?: string[] | null
          price?: string | null
          price_tier?: string | null
          product_code?: string | null
          shopify_handle?: string | null
          short_code?: string | null
          silhouette_family?: string | null
          slug: string
          source_url?: string | null
          style_mood?: string | null
          updated_at?: string
          wear_with?: Json | null
          you_may_also_like?: Json | null
        }
        Update: {
          ai_attributes?: Json | null
          care_instructions?: string | null
          category?: string | null
          collection?: string | null
          color?: string | null
          composition?: string | null
          created_at?: string
          description?: string | null
          gender?: string
          generated_look?: Json | null
          heel_height_mm?: number | null
          id?: string
          images?: Json | null
          is_available?: boolean
          material?: string | null
          name?: string
          occasion?: string[] | null
          price?: string | null
          price_tier?: string | null
          product_code?: string | null
          shopify_handle?: string | null
          short_code?: string | null
          silhouette_family?: string | null
          slug?: string
          source_url?: string | null
          style_mood?: string | null
          updated_at?: string
          wear_with?: Json | null
          you_may_also_like?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      recommendation_clicks: {
        Row: {
          carousel_id: string
          clicked_at: string
          id: string
          match_reason: string | null
          rule_id: string | null
          session_id: string | null
          source_product_id: string
          target_product_id: string
        }
        Insert: {
          carousel_id: string
          clicked_at?: string
          id?: string
          match_reason?: string | null
          rule_id?: string | null
          session_id?: string | null
          source_product_id: string
          target_product_id: string
        }
        Update: {
          carousel_id?: string
          clicked_at?: string
          id?: string
          match_reason?: string | null
          rule_id?: string | null
          session_id?: string | null
          source_product_id?: string
          target_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_clicks_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "product_carousels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_clicks_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_clicks_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_requests: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          damage_type: string
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          id: string
          photos: string[] | null
          product_id: string | null
          status: string
          updated_at: string
          user_email: string | null
          user_name: string | null
          warranty_status: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          damage_type: string
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          id?: string
          photos?: string[] | null
          product_id?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_name?: string | null
          warranty_status?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          damage_type?: string
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          id?: string
          photos?: string[] | null
          product_id?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_name?: string | null
          warranty_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          look_product_codes: string[] | null
          metadata: Json | null
          product_code: string
          session_id: string
          target_product_code: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          look_product_codes?: string[] | null
          metadata?: Json | null
          product_code: string
          session_id: string
          target_product_code?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          look_product_codes?: string[] | null
          metadata?: Json | null
          product_code?: string
          session_id?: string
          target_product_code?: string | null
        }
        Relationships: []
      }
      scrape_logs: {
        Row: {
          assets_found: number | null
          assets_new: number | null
          assets_removed: number | null
          completed_at: string | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          assets_found?: number | null
          assets_new?: number | null
          assets_removed?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          assets_found?: number | null
          assets_new?: number | null
          assets_removed?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_scan_events: { Args: never; Returns: undefined }
      generate_short_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
