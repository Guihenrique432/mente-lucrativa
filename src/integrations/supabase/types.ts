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
      contratos: {
        Row: {
          cliente: string
          created_at: string
          custo_estimado: number
          data_fim: string | null
          data_inicio: string
          dia_vencimento: number | null
          id: string
          observacao: string | null
          recorrente: boolean
          situacao: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
          valor_contratado: number
          valor_mensal: number
        }
        Insert: {
          cliente: string
          created_at?: string
          custo_estimado?: number
          data_fim?: string | null
          data_inicio?: string
          dia_vencimento?: number | null
          id?: string
          observacao?: string | null
          recorrente?: boolean
          situacao?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id: string
          valor_contratado?: number
          valor_mensal?: number
        }
        Update: {
          cliente?: string
          created_at?: string
          custo_estimado?: number
          data_fim?: string | null
          data_inicio?: string
          dia_vencimento?: number | null
          id?: string
          observacao?: string | null
          recorrente?: boolean
          situacao?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
          valor_contratado?: number
          valor_mensal?: number
        }
        Relationships: []
      }
      contratos_recebimentos: {
        Row: {
          contrato_id: string
          created_at: string
          data: string
          id: string
          observacao: string | null
          updated_at: string
          user_id: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          contrato_id: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          updated_at?: string
          user_id: string
          valor: number
          vencimento?: string | null
        }
        Update: {
          contrato_id?: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_recebimentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: string
          created_at: string
          data: string
          id: string
          observacao: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      historico_lancamentos: {
        Row: {
          acao: string
          campos_alterados: string[]
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          registro_id: string
          tabela: string
          user_id: string
        }
        Insert: {
          acao: string
          campos_alterados?: string[]
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          registro_id: string
          tabela: string
          user_id: string
        }
        Update: {
          acao?: string
          campos_alterados?: string[]
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          registro_id?: string
          tabela?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          kind: string
          label: string | null
          status: Database["public"]["Enums"]["invite_status"]
          token_hash: string
          token_hint: string
          token_plain: string | null
          used_at: string | null
          used_by: string | null
          uses: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          kind?: string
          label?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token_hash: string
          token_hint?: string
          token_plain?: string | null
          used_at?: string | null
          used_by?: string | null
          uses?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          kind?: string
          label?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token_hash?: string
          token_hint?: string
          token_plain?: string | null
          used_at?: string | null
          used_by?: string | null
          uses?: number
        }
        Relationships: []
      }
      metas: {
        Row: {
          created_at: string
          id: string
          meta_lucro: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_lucro?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_lucro?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          data: string
          id: string
          observacao: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacao_execucoes: {
        Row: {
          data: string
          detalhe: string | null
          finalizado_em: string | null
          horario: string
          iniciado_em: string
          status: string
        }
        Insert: {
          data: string
          detalhe?: string | null
          finalizado_em?: string | null
          horario?: string
          iniciado_em?: string
          status?: string
        }
        Update: {
          data?: string
          detalhe?: string | null
          finalizado_em?: string | null
          horario?: string
          iniciado_em?: string
          status?: string
        }
        Relationships: []
      }
      notificacoes_diarias: {
        Row: {
          canal: string
          created_at: string
          data: string
          horario: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          canal: string
          created_at?: string
          data: string
          horario?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          canal?: string
          created_at?: string
          data?: string
          horario?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      perfil_financeiro: {
        Row: {
          aliquota_iss: number | null
          anexo_simples: string | null
          atende_clientes: boolean
          atividade: string | null
          beneficios_fiscais: string | null
          cnae: string | null
          created_at: string
          creditos_deducoes: string | null
          faturamento_12m: number | null
          folha_mensal: number
          forma_recebimento: string | null
          funcionarios: number
          modelo: string
          municipio: string | null
          natureza_juridica: string | null
          observacoes: string | null
          onboarding_concluido: boolean
          periodo_apuracao: string
          possui_creditos: boolean
          principais_despesas: string[]
          pro_labore: number
          profissao: string | null
          recorrencia_receita: string
          regime_tributario: string
          separa_pessoal_empresa: boolean
          tem_contador: boolean
          tem_contratos: boolean
          tem_estoque: boolean
          tem_folha: boolean
          tipos_receita: string[]
          uf: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aliquota_iss?: number | null
          anexo_simples?: string | null
          atende_clientes?: boolean
          atividade?: string | null
          beneficios_fiscais?: string | null
          cnae?: string | null
          created_at?: string
          creditos_deducoes?: string | null
          faturamento_12m?: number | null
          folha_mensal?: number
          forma_recebimento?: string | null
          funcionarios?: number
          modelo?: string
          municipio?: string | null
          natureza_juridica?: string | null
          observacoes?: string | null
          onboarding_concluido?: boolean
          periodo_apuracao?: string
          possui_creditos?: boolean
          principais_despesas?: string[]
          pro_labore?: number
          profissao?: string | null
          recorrencia_receita?: string
          regime_tributario?: string
          separa_pessoal_empresa?: boolean
          tem_contador?: boolean
          tem_contratos?: boolean
          tem_estoque?: boolean
          tem_folha?: boolean
          tipos_receita?: string[]
          uf?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aliquota_iss?: number | null
          anexo_simples?: string | null
          atende_clientes?: boolean
          atividade?: string | null
          beneficios_fiscais?: string | null
          cnae?: string | null
          created_at?: string
          creditos_deducoes?: string | null
          faturamento_12m?: number | null
          folha_mensal?: number
          forma_recebimento?: string | null
          funcionarios?: number
          modelo?: string
          municipio?: string | null
          natureza_juridica?: string | null
          observacoes?: string | null
          onboarding_concluido?: boolean
          periodo_apuracao?: string
          possui_creditos?: boolean
          principais_despesas?: string[]
          pro_labore?: number
          profissao?: string | null
          recorrencia_receita?: string
          regime_tributario?: string
          separa_pessoal_empresa?: boolean
          tem_contador?: boolean
          tem_contratos?: boolean
          tem_estoque?: boolean
          tem_folha?: boolean
          tipos_receita?: string[]
          uf?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      preferencias_notificacao: {
        Row: {
          created_at: string
          horarios: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          horarios?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          horarios?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          created_at: string
          custo: number
          id: string
          nome: string
          preco_venda: number
          quantidade: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custo?: number
          id?: string
          nome: string
          preco_venda?: number
          quantidade?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custo?: number
          id?: string
          nome?: string
          preco_venda?: number
          quantidade?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          plano: string
          plano_cancelado_em: string | null
          plano_expira_em: string | null
          plano_renova_automaticamente: boolean
          plano_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          plano?: string
          plano_cancelado_em?: string | null
          plano_expira_em?: string | null
          plano_renova_automaticamente?: boolean
          plano_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          plano?: string
          plano_cancelado_em?: string | null
          plano_expira_em?: string | null
          plano_renova_automaticamente?: boolean
          plano_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      receitas: {
        Row: {
          categoria: string
          created_at: string
          data: string
          id: string
          observacao: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      expirar_assinaturas: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      invite_status: "pending" | "used" | "expired" | "revoked"
      tipo_movimentacao: "entrada" | "saida"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      invite_status: ["pending", "used", "expired", "revoked"],
      tipo_movimentacao: ["entrada", "saida"],
    },
  },
} as const
