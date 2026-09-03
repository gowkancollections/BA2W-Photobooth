export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      admin_roles: {
        Row: {
          user_id: string;
          role: "admin" | "superadmin";
          created_at: string | null;
        };
        Insert: {
          user_id: string;
          role: "admin" | "superadmin";
          created_at?: string | null;
        };
        Update: {
          user_id?: string;
          role?: "admin" | "superadmin";
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      frames: {
        Row: {
          id: string;
          name: string | null;
          description: string | null;
          category:
            | "single"
            | "strip-3"
            | "strip-4"
            | "photostrip-3x2"
            | "photostrip-4x2";
          r2_image_path: string | null;
          canvas_width: number | null;
          canvas_height: number | null;
          aspect_ratio: number | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          name?: string | null;
          description?: string | null;
          category:
            | "single"
            | "strip-3"
            | "strip-4"
            | "photostrip-3x2"
            | "photostrip-4x2";
          r2_image_path?: string | null;
          canvas_width?: number | null;
          canvas_height?: number | null;
          aspect_ratio?: number | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          description?: string | null;
          category?:
            | "single"
            | "strip-3"
            | "strip-4"
            | "photostrip-3x2"
            | "photostrip-4x2";
          r2_image_path?: string | null;
          canvas_width?: number | null;
          canvas_height?: number | null;
          aspect_ratio?: number | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "frames_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      frame_slots: {
        Row: {
          id: string;
          frame_id: string;
          slot_order: number;
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          created_at: string | null;
        };
        Insert: {
          id: string;
          frame_id: string;
          slot_order: number;
          x: number;
          y: number;
          width: number;
          height: number;
          rotation?: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          frame_id?: string;
          slot_order?: number;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          rotation?: number;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "frame_slots_frame_id_fkey";
            columns: ["frame_id"];
            isOneToOne: false;
            referencedRelation: "frames";
            referencedColumns: ["id"];
          },
        ];
      };
      stickers: {
        Row: {
          id: string;
          name: string | null;
          category: string | null;
          r2_image_path: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          name?: string | null;
          category?: string | null;
          r2_image_path?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          category?: string | null;
          r2_image_path?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stickers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type FrameRow = Database["public"]["Tables"]["frames"]["Row"];
export type FrameSlotRow = Database["public"]["Tables"]["frame_slots"]["Row"];
export type StickerRow = Database["public"]["Tables"]["stickers"]["Row"];
export type AdminRoleRow = Database["public"]["Tables"]["admin_roles"]["Row"];

export type FrameCategory = FrameRow["category"];
