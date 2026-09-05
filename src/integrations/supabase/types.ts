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
      admin_credential: {
        Row: {
          code_hash: string
          created_at: string
          id: boolean
          image_hash: string
          updated_at: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: boolean
          image_hash: string
          updated_at?: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: boolean
          image_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      block_images: {
        Row: {
          block_id: string
          created_at: string
          id: string
          path: string
          position: number
          updated_at: string
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          path: string
          position?: number
          updated_at?: string
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          path?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_images_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          content: string
          id: string
          image_url: string | null
          section: string
          slot: number
          updated_at: string
        }
        Insert: {
          content?: string
          id?: string
          image_url?: string | null
          section?: string
          slot: number
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          image_url?: string | null
          section?: string
          slot?: number
          updated_at?: string
        }
        Relationships: []
      }
      gate_verifications: {
        Row: {
          access_expires_at: string | null
          access_token_hash: string | null
          attempted_at: string | null
          entered_at: string
          id: string
          last_seen_at: string | null
          session_binding_hash: string
          status: string
          verified_at: string | null
          visitor_id: string
          visitor_number: number
        }
        Insert: {
          access_expires_at?: string | null
          access_token_hash?: string | null
          attempted_at?: string | null
          entered_at?: string
          id?: string
          last_seen_at?: string | null
          session_binding_hash: string
          status?: string
          verified_at?: string | null
          visitor_id: string
          visitor_number: number
        }
        Update: {
          access_expires_at?: string | null
          access_token_hash?: string | null
          attempted_at?: string | null
          entered_at?: string
          id?: string
          last_seen_at?: string | null
          session_binding_hash?: string
          status?: string
          verified_at?: string | null
          visitor_id?: string
          visitor_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "gate_verifications_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      revisions: {
        Row: {
          created_at: string
          id: string
          items: Json
          note: string | null
          reviewed_at: string | null
          section: string
          status: string
          visitor_number: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          note?: string | null
          reviewed_at?: string | null
          section: string
          status?: string
          visitor_number?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          note?: string | null
          reviewed_at?: string | null
          section?: string
          status?: string
          visitor_number?: number | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: boolean
          updated_at: string
          view_only: boolean
        }
        Insert: {
          id?: boolean
          updated_at?: string
          view_only?: boolean
        }
        Update: {
          id?: boolean
          updated_at?: string
          view_only?: boolean
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          body: string
          created_at: string
          id: string
          images: string[]
          name: string
          review_note: string | null
          reviewed_at: string | null
          status: string
          title: string
          updated_at: string
          visitor_number: number | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          images?: string[]
          name: string
          review_note?: string | null
          reviewed_at?: string | null
          status?: string
          title: string
          updated_at?: string
          visitor_number?: number | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          images?: string[]
          name?: string
          review_note?: string | null
          reviewed_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          visitor_number?: number | null
        }
        Relationships: []
      }
      visitors: {
        Row: {
          created_at: string
          id: string
          label: string | null
          number: number
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          number?: number
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          number?: number
          token?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gate_admin_status: { Args: never; Returns: boolean }
      gate_begin_verification: {
        Args: { p_binding_hash: string; p_token: string }
        Returns: {
          initialized: boolean
          verification_id: string
          visitor_id: string
          visitor_label: string
          visitor_number: number
        }[]
      }
      gate_ensure_visitor: {
        Args: { p_token?: string }
        Returns: {
          label: string
          number: number
          token: string
        }[]
      }
      gate_require_admin: {
        Args: { p_access_token_hash: string; p_visitor_token?: string }
        Returns: {
          admin: boolean
          visitor_number: number
        }[]
      }
      gate_revoke: { Args: { p_access_token_hash: string }; Returns: undefined }
      gate_session_admin: {
        Args: {
          p_binding_hash: string
          p_verification_id: string
          p_visitor_id: string
        }
        Returns: {
          admin: boolean
          visitor_number: number
        }[]
      }
      gate_verify: {
        Args: {
          p_access_expires_at: string
          p_access_token_hash: string
          p_code_hash: string
          p_image_hash: string
          p_visitor_token: string
        }
        Returns: {
          created: boolean
          ok: boolean
          verification_id: string
          visitor_label: string
          visitor_number: number
        }[]
      }
      is_view_only: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
