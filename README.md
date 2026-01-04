# Plateforme documentaire ministérielle

Application Next.js 14 (App Router) en français pour la gestion et la diffusion de documents PDF par secteur ministériel. Thème d’interface adapté au secteur sélectionné, RBAC strict, stockage local des PDF et contrôle d’accès côté serveur. Menu juridique hiérarchisé par niveaux (Constitution, Lois, Décrets, Arrêtés, Décisions, Circulaires/Notes, Autres) personnalisable par secteur.

## Fonctionnalités clés
- Authentification NextAuth (credentials) + rôles : superadmin, admin, éditeur, lecteur
- Accès par secteur avec thème de couleur dédié et RBAC serveur
- Téléversement et stockage local de PDF (20 MB max) avec liens sécurisés
- Menu juridique éditable par secteur (niveaux, sous-niveaux et titres)
- Page admin par secteur pour utilisateurs, menus et documents

## Stack technique
- Next.js 14 (App Router), React 18, Tailwind CSS + composants shadcn simplifiés
- NextAuth avec adapter Prisma/PostgreSQL
- Prisma 5, migrations et seed TypeScript
- Vitest pour les tests unitaires

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

## Scripts npm
- `pnpm dev` : démarrer en développement
- `pnpm build` / `pnpm start` : build puis démarrer en production
- `pnpm lint` : lint Next.js/TypeScript
- `pnpm test` : tests Vitest
- `pnpm prisma:generate | prisma:migrate | prisma:seed` : utilitaires base

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

## Déploiement
- Préparer la base Postgres et configurer `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- `pnpm install && pnpm prisma:migrate && pnpm build && pnpm start`.
- S’assurer que le dossier `UPLOAD_DIR` existe et est accessible en écriture (montage volume si Docker).

## Structure principale
- `app/` : pages App Router + handlers API
- `prisma/` : schéma et seed
- `lib/` : Prisma, auth, RBAC, thème secteur
- `components/ui/` : composants shadcn simplifiés
