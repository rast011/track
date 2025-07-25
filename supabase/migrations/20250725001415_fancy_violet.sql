/*
  # Criar tabela de rastreamento de pedidos

  1. Nova Tabela
    - `rastreamento_pedidos`
      - `id` (uuid, primary key)
      - `nome` (text)
      - `cpf` (text)
      - `email` (text)
      - `telefone` (text)
      - `produto` (text)
      - `valor` (decimal)
      - `etapa_atual` (text, default 'Seu pedido foi criado')
      - `etapa_data` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Segurança
    - Habilitar RLS na tabela `rastreamento_pedidos`
    - Adicionar políticas para operações CRUD
*/

CREATE TABLE IF NOT EXISTS rastreamento_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL,
  email text,
  telefone text,
  produto text,
  valor decimal(10,2),
  etapa_atual text DEFAULT 'Seu pedido foi criado',
  etapa_data timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rastreamento_pedidos ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção via webhook
CREATE POLICY "Permitir inserção de pedidos"
  ON rastreamento_pedidos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política para permitir leitura de pedidos
CREATE POLICY "Permitir leitura de pedidos"
  ON rastreamento_pedidos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política para permitir atualização de pedidos
CREATE POLICY "Permitir atualização de pedidos"
  ON rastreamento_pedidos
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_rastreamento_cpf ON rastreamento_pedidos(cpf);
CREATE INDEX IF NOT EXISTS idx_rastreamento_etapa ON rastreamento_pedidos(etapa_atual);
CREATE INDEX IF NOT EXISTS idx_rastreamento_created_at ON rastreamento_pedidos(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_rastreamento_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_rastreamento_updated_at ON rastreamento_pedidos;
CREATE TRIGGER update_rastreamento_updated_at
    BEFORE UPDATE ON rastreamento_pedidos
    FOR EACH ROW
    EXECUTE FUNCTION update_rastreamento_updated_at_column();