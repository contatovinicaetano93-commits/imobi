# Database Seed Scripts

Comprehensive seed scripts for populating the staging database with realistic test data.

## Overview

The seed scripts populate the database with:
- **13 Users**: admins, tomadores, engenheiros and parceiros
- **10 Credits**: Various amounts, statuses, and terms
- **10 Construction Projects (Obras)**: Different types and stages
- **90 Construction Stages (Etapas)**: 9 stages per obra
- **6 Photo Evidence (Evidencias)**: GPS-validated with distance calculations
- **15 KYC Documents**: Mixed approval statuses
- **10 Score History Records**: Constructor buildability scores

## Key Features

### Data Validation
- **GPS Validation**: All coordinates validated for São Paulo area bounds
- **Distance Calculation**: Haversine formula used for GPS distance from obra center
- **Password Hashing**: All passwords hashed with bcryptjs (10 rounds)
- **Interest Calculation**: Credit amounts include interest calculations (Principal + Interest formula)

### User Accounts

#### Admin Users
- Email: admin1@test.com, admin2@test.com, admin3@test.com
- Type: ADMIN
- All with APROVADO KYC status
- Shared password: TestPassword123

#### Tomador Users
- Email: construtora1@test.com through construtora5@test.com
- Type: TOMADOR
- Mixed KYC statuses (APROVADO, PENDENTE, REJEITADO, EM_VERIFICACAO)

#### Engenheiro/Parceiro Users
- Email: eng1@test.com through eng5@test.com
- Type: ENGENHEIRO or PARCEIRO
- Mixed KYC statuses

**Default Test Password**: `TestPassword123`

All passwords meet the schema requirements:
- Minimum 8 characters
- At least one uppercase letter (T, P)
- At least one number (1, 2, 3)

## Usage

### First Time Setup

Before running seeds, ensure the database is created and Prisma client is generated:

```bash
# From monorepo root
pnpm install                                # Install all dependencies
cd services/api
pnpm exec prisma generate --schema prisma/schema.prisma  # Generate Prisma client
pnpm exec prisma migrate dev --schema prisma/schema.prisma  # Run migrations
```

### Running the Seeds

```bash
# From services/api directory
pnpm seed

# Or using ts-node directly
pnpm ts-node --project tsconfig.json src/seeds/seed.ts
```

### After Seeding

Seeds will:
1. Clear all existing data (in foreign key dependency order)
2. Create all test users with hashed passwords
3. Create credits with calculated expiration dates
4. Create construction projects with GPS validation
5. Create 9 stages per project with percentual distribution
6. Create photo evidence with distance validation
7. Create KYC documents with mixed statuses
8. Create score history records
9. Create sample notifications

## Data Files

### seed-data.json
Contains all seed fixture data organized by entity:
- `usuarios`: User accounts with types and KYC statuses
- `creditos`: Credit products with amounts and terms
- `obras`: Construction projects with locations and statuses
- `etapas`: Stage definitions (generic, replicated per obra)
- `evidencias`: Photo evidence entries with coordinates
- `kycDocumentos`: KYC documents with statuses and rejection reasons
- `scoreHistoricos`: Score history records with reasons

### seed.ts
Main seed script containing:
- Database connection and Prisma client
- Helper functions for calculations and validation
- Individual seed functions for each entity
- Transaction management and error handling
- Detailed console output with progress indicators

## Data Relationships

```
Usuario
  ├─ Credito (1 to many)
  │   ├─ Obra (1 to many)
  │   │   ├─ EtapaObra (1 to many, 9 per obra)
  │   │   └─ EvidenciaEtapa (many)
  │   └─ LiberacaoParcela (via partial seeding)
  ├─ ScoreHistorico (1 to many)
  ├─ KycDocumento (1 to many)
  └─ Notificacao (1 to many)
```

## Testing the Data

After seeding, you can verify the data:

```bash
# Open Prisma Studio
pnpm exec prisma studio --schema prisma/schema.prisma

# Query specific data
SELECT COUNT(*) FROM "Usuario" WHERE tipo = 'ADMIN';
SELECT COUNT(*) FROM "Obra" WHERE status = 'EM_EXECUCAO';
SELECT AVG(score) FROM "ScoreHistorico";
```

### Login Credentials for Testing

- **Admin**: admin1@test.com / TestPassword123
- **Constructor**: construtora1@test.com / TestPassword123
- **Engineer**: eng1@test.com / TestPassword123

## Extending the Seed

To add more data:

1. Update `seed-data.json` with additional fixtures
2. Update seed functions to handle new data
3. Maintain proper foreign key relationships
4. Validate GPS coordinates for São Paulo area
5. Run the seed script

## Important Notes

- Passwords should NEVER be committed to version control
- The seed script is intended for staging/development only
- Production seeds should use different password management
- GPS coordinates are validated for São Paulo metropolitan area
- Interest calculations use the formula: `Principal + (Principal × TaxaMensal × PrazoMeses)`
- All timestamps are created with proper timezone handling

## Troubleshooting

### Database Connection Error
Ensure DATABASE_URL environment variable is set and the database is running.

### Prisma Client Not Found
Run: `pnpm exec prisma generate --schema prisma/schema.prisma`

### Foreign Key Constraint Error
Check that all referenced entities are created before dependent entities. The seed function handles this order automatically.

### GPS Validation Warning
Some coordinates might be flagged if outside São Paulo bounds. This is intentional for testing edge cases.
