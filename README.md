# Plateforme documentaire ministérielle

Application Next.js 14 (App Router) en français pour la gestion et la diffusion de documents PDF par secteur ministériel. Thème d’interface adapté au secteur sélectionné, RBAC strict, stockage local des PDF et contrôle d’accès côté serveur. Menu juridique hiérarchisé par niveaux (Constitution, Lois, Décrets, Arrêtés, Décisions, Circulaires/Notes, Autres) personnalisable par secteur.

## Prérequis
- Node.js 18+
- PNPM/NPM/Yarn
- Docker (pour Postgres via docker-compose)

## Installation rapide
```bash
cp .env.example .env
pnpm install # ou npm install / yarn
docker-compose up -d
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

## Variables d’environnement
- `DATABASE_URL` : connexion Postgres
- `NEXTAUTH_SECRET` : secret NextAuth
- `NEXTAUTH_URL` : URL publique (ex: http://localhost:3000)
- `UPLOAD_DIR` : dossier de stockage des PDF (par défaut `./uploads`)

## Prisma
- `pnpm prisma:migrate` : applique les migrations
- `pnpm prisma:seed` : insère les secteurs, niveaux juridiques, menus, utilisateurs et un document exemple

## Tests
```bash
pnpm test
```

## Comptes de test
- superadmin@example.com / MotDePasse123!
- admin@example.com / MotDePasse123!
- editeur@example.com / MotDePasse123!
- lecteur@example.com / MotDePasse123!

## Notes de sécurité
- Toutes les routes API vérifient la session et le périmètre secteur.
- Téléversement PDF limité à 20 MB, type `application/pdf`, stockage local dans `UPLOAD_DIR`.

## Structure principale
- `app/` : pages App Router + handlers API
- `prisma/` : schéma et seed
- `lib/` : Prisma, auth, RBAC, thème secteur
- `components/ui/` : composants shadcn simplifiés
