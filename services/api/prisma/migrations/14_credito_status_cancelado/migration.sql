-- Add CANCELADO to CreditoStatus enum
ALTER TYPE "CreditoStatus" ADD VALUE IF NOT EXISTS 'CANCELADO';
