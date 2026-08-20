export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      avaliacoes: {
        Row: {
          avaliado_id: string;
          avaliador_id: string;
          comentario: string | null;
          created_at: string;
          id: string;
          nota: number;
          vaga_id: string | null;
        };
        Insert: {
          avaliado_id: string;
          avaliador_id: string;
          comentario?: string | null;
          created_at?: string;
          id?: string;
          nota: number;
          vaga_id?: string | null;
        };
        Update: {
          avaliado_id?: string;
          avaliador_id?: string;
          comentario?: string | null;
          created_at?: string;
          id?: string;
          nota?: number;
          vaga_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "avaliacoes_vaga_id_fkey";
            columns: ["vaga_id"];
            isOneToOne: false;
            referencedRelation: "vagas";
            referencedColumns: ["id"];
          },
        ];
      };
      bloqueio_agenda: {
        Row: { ajudante_id: string; created_at: string; data: string };
        Insert: { ajudante_id: string; created_at?: string; data: string };
        Update: { ajudante_id?: string; created_at?: string; data?: string };
        Relationships: [];
      };
      candidaturas: {
        Row: {
          ajudante_id: string;
          created_at: string;
          id: string;
          status: string;
          vaga_id: string;
        };
        Insert: {
          ajudante_id: string;
          created_at?: string;
          id?: string;
          status?: string;
          vaga_id: string;
        };
        Update: {
          ajudante_id?: string;
          created_at?: string;
          id?: string;
          status?: string;
          vaga_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidaturas_vaga_id_fkey";
            columns: ["vaga_id"];
            isOneToOne: false;
            referencedRelation: "vagas";
            referencedColumns: ["id"];
          },
        ];
      };
      categorias_servico: {
        Row: { nome: string; ordem: number; slug: string };
        Insert: { nome: string; ordem?: number; slug: string };
        Update: { nome?: string; ordem?: number; slug?: string };
        Relationships: [];
      };
      conversa_membros: {
        Row: { conversa_id: string; lido_ate: string | null; user_id: string };
        Insert: { conversa_id: string; lido_ate?: string | null; user_id: string };
        Update: { conversa_id?: string; lido_ate?: string | null; user_id?: string };
        Relationships: [
          {
            foreignKeyName: "conversa_membros_conversa_id_fkey";
            columns: ["conversa_id"];
            isOneToOne: false;
            referencedRelation: "conversas";
            referencedColumns: ["id"];
          },
        ];
      };
      conversas: {
        Row: {
          ajudante_id: string | null;
          created_at: string;
          id: string;
          tipo: string;
          vaga_origem_id: string | null;
          workspace_id: string;
        };
        Insert: {
          ajudante_id?: string | null;
          created_at?: string;
          id?: string;
          tipo: string;
          vaga_origem_id?: string | null;
          workspace_id: string;
        };
        Update: {
          ajudante_id?: string | null;
          created_at?: string;
          id?: string;
          tipo?: string;
          vaga_origem_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversas_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      denuncias: {
        Row: {
          alvo_id: string;
          alvo_tipo: string;
          created_at: string;
          denunciante_id: string;
          detalhe: string | null;
          id: string;
          motivo: string;
          resolucao: string | null;
          resolvido_por: string | null;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          alvo_id: string;
          alvo_tipo: string;
          created_at?: string;
          denunciante_id: string;
          detalhe?: string | null;
          id?: string;
          motivo: string;
          resolucao?: string | null;
          resolvido_por?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          alvo_id?: string;
          alvo_tipo?: string;
          created_at?: string;
          denunciante_id?: string;
          detalhe?: string | null;
          id?: string;
          motivo?: string;
          resolucao?: string | null;
          resolvido_por?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      demanda_servico: {
        Row: {
          categoria: string;
          cidade: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          categoria: string;
          cidade: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          categoria?: string;
          cidade?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      home_banner: {
        Row: {
          ativo: boolean;
          id: number;
          texto: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          ativo?: boolean;
          id?: number;
          texto?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          ativo?: boolean;
          id?: number;
          texto?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      invite: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          role: string;
          status: string;
          token: string;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          created_by: string;
          expires_at?: string;
          id?: string;
          role: string;
          status?: string;
          token: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          role?: string;
          status?: string;
          token?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invite_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      mensagens: {
        Row: {
          conteudo: string;
          conversa_id: string | null;
          created_at: string;
          destinatario_id: string | null;
          id: string;
          lida: boolean;
          remetente_id: string;
          vaga_id: string | null;
        };
        Insert: {
          conteudo: string;
          conversa_id?: string | null;
          created_at?: string;
          destinatario_id?: string | null;
          id?: string;
          lida?: boolean;
          remetente_id: string;
          vaga_id?: string | null;
        };
        Update: {
          conteudo?: string;
          conversa_id?: string | null;
          created_at?: string;
          destinatario_id?: string | null;
          id?: string;
          lida?: boolean;
          remetente_id?: string;
          vaga_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mensagens_vaga_id_fkey";
            columns: ["vaga_id"];
            isOneToOne: false;
            referencedRelation: "vagas";
            referencedColumns: ["id"];
          },
        ];
      };
      notificacoes: {
        Row: {
          created_at: string;
          id: string;
          link: string | null;
          mensagem: string | null;
          tipo: string;
          titulo: string;
          user_id: string;
          visualizada: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          link?: string | null;
          mensagem?: string | null;
          tipo: string;
          titulo: string;
          user_id: string;
          visualizada?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          link?: string | null;
          mensagem?: string | null;
          tipo?: string;
          titulo?: string;
          user_id?: string;
          visualizada?: boolean;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          bairro: string | null;
          bio: string | null;
          disponibilidade: string | null;
          cidade: string | null;
          created_at: string;
          estado: string | null;
          foto_url: string | null;
          nome: string;
          nota_media: number;
          status: string;
          tipo_base: string;
          total_avaliacoes: number;
          user_id: string;
          verificado: boolean;
        };
        Insert: {
          bairro?: string | null;
          bio?: string | null;
          disponibilidade?: string | null;
          cidade?: string | null;
          created_at?: string;
          estado?: string | null;
          foto_url?: string | null;
          nome?: string;
          nota_media?: number;
          status?: string;
          tipo_base?: string;
          total_avaliacoes?: number;
          user_id: string;
          verificado?: boolean;
        };
        Update: {
          bairro?: string | null;
          bio?: string | null;
          disponibilidade?: string | null;
          cidade?: string | null;
          created_at?: string;
          estado?: string | null;
          foto_url?: string | null;
          nome?: string;
          nota_media?: number;
          status?: string;
          tipo_base?: string;
          total_avaliacoes?: number;
          user_id?: string;
          verificado?: boolean;
        };
        Relationships: [];
      };
      profiles_pii: {
        Row: {
          created_at: string;
          email: string | null;
          telefone: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          telefone?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          telefone?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_modules: {
        Row: {
          allowed: boolean;
          created_at: string;
          module: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          allowed?: boolean;
          created_at?: string;
          module: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          allowed?: boolean;
          created_at?: string;
          module?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      vaga_local: {
        Row: { lat: number; lng: number; vaga_id: string };
        Insert: { lat: number; lng: number; vaga_id: string };
        Update: { lat?: number; lng?: number; vaga_id?: string };
        Relationships: [
          {
            foreignKeyName: "vaga_local_vaga_id_fkey";
            columns: ["vaga_id"];
            isOneToOne: true;
            referencedRelation: "vagas";
            referencedColumns: ["id"];
          },
        ];
      };
      vagas: {
        Row: {
          bairro: string | null;
          categoria: string;
          cep: string | null;
          cidade: string;
          created_at: string;
          criado_por: string;
          data_servico: string | null;
          descricao: string | null;
          hora_inicio: string | null;
          id: string;
          local_aprox_lat: number | null;
          local_aprox_lng: number | null;
          quantidade_vagas: number;
          status: string;
          titulo: string;
          valor_diaria: number;
          workspace_id: string;
        };
        Insert: {
          bairro?: string | null;
          categoria: string;
          cep?: string | null;
          cidade: string;
          created_at?: string;
          criado_por: string;
          data_servico?: string | null;
          descricao?: string | null;
          hora_inicio?: string | null;
          id?: string;
          local_aprox_lat?: number | null;
          local_aprox_lng?: number | null;
          quantidade_vagas?: number;
          status?: string;
          titulo: string;
          valor_diaria?: number;
          workspace_id: string;
        };
        Update: {
          bairro?: string | null;
          categoria?: string;
          cep?: string | null;
          cidade?: string;
          created_at?: string;
          criado_por?: string;
          data_servico?: string | null;
          descricao?: string | null;
          hora_inicio?: string | null;
          id?: string;
          local_aprox_lat?: number | null;
          local_aprox_lng?: number | null;
          quantidade_vagas?: number;
          status?: string;
          titulo?: string;
          valor_diaria?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vagas_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: { created_at: string; role: string; user_id: string; workspace_id: string };
        Insert: { created_at?: string; role?: string; user_id: string; workspace_id: string };
        Update: { created_at?: string; role?: string; user_id?: string; workspace_id?: string };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          cidade: string | null;
          created_at: string;
          estado: string | null;
          id: string;
          nome: string;
          owner_id: string;
        };
        Insert: {
          cidade?: string | null;
          created_at?: string;
          estado?: string | null;
          id?: string;
          nome: string;
          owner_id: string;
        };
        Update: {
          cidade?: string | null;
          created_at?: string;
          estado?: string | null;
          id?: string;
          nome?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_app_role: { Args: Record<PropertyKey, never>; Returns: string };
      has_capability: { Args: { v_user: string; v_ws: string; v_cap: string }; Returns: boolean };
      is_ajudante_aceito: { Args: { v_vaga: string; v_user: string }; Returns: boolean };
      is_conversa_membro: { Args: { v_conversa: string }; Returns: boolean };
      is_workspace_member: { Args: { ws: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
