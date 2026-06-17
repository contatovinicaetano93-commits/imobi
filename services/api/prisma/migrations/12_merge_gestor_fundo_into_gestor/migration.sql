-- Unifica perfil legado GESTOR_FUNDO → GESTOR (Gestor do Fundo)
UPDATE "Usuario" SET tipo = 'GESTOR' WHERE tipo = 'GESTOR_FUNDO';
