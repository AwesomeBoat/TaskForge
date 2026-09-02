# TaskForge

TaskForge est une application de gestion de tâches avec priorités, échéances, tags, XP, streaks et sessions de concentration.

## Fonctionnalités

- Création, modification, suppression et complétion de tâches
- Vues `Today`, `Inbox`, `Upcoming`, `Completed` et `Important`
- Recherche, filtres par priorité/tag et tri
- XP selon la priorité et progression par niveaux
- Streaks de complétion
- Timer Focus avec historique des sessions
- Statistiques de progression
- Thème clair, sombre ou système
- Authentification avec sessions sécurisées
- Réinitialisation de mot de passe

## Prérequis

- Node.js 20 ou plus récent
- npm
- Docker Desktop, pour PostgreSQL
- Git, si vous clonez le projet

## Installation locale

Depuis le dossier du projet :

```bash
npm install
```

Copiez ensuite le fichier d'environnement :

```bash
copy .env.example .env
```

Sous macOS/Linux, utilisez plutôt :

```bash
cp .env.example .env
```

Ouvrez `.env` et remplacez au minimum `POSTGRES_PASSWORD` par un mot de passe local. La valeur doit être identique dans `DATABASE_URL` et `TEST_DATABASE_URL`.

Démarrez PostgreSQL :

```bash
npm run db:up
```

Appliquez les migrations :

```bash
npm run db:migrate
```

Lancez l'application en mode développement :

```bash
npm run dev
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000).

## Première utilisation

1. Cliquez sur `Create an account`.
2. Créez un compte avec un mot de passe d'au moins 10 caractères.
3. Ajoutez une tâche depuis `Today` ou `Inbox`.
4. Utilisez `!high`, `!medium` ou `!low` pour choisir la priorité rapidement.
5. Utilisez `#work` ou `#personal` pour ajouter des tags.
6. Utilisez `tomorrow`, `next week` ou une date au format `YYYY-MM-DD` pour l'échéance.
7. Lancez une session depuis `Focus` pour travailler sans distraction.

## Mot de passe oublié en développement

Aucun fournisseur email n'est configuré par défaut. Après une demande depuis `Forgot your password?`, le lien de réinitialisation est affiché dans le terminal qui exécute `npm run dev`.

En production, remplacez l'implémentation de `src/server/mailer.ts` par un fournisseur email réel.

## Commandes utiles

```bash
npm run dev          # serveur de développement
npm run build        # build de production
npm start            # démarrer le build de production
npm run typecheck    # vérifier TypeScript
npm test             # lancer les tests
npm run test:watch   # lancer Vitest en mode watch
npm run db:up        # démarrer PostgreSQL
npm run db:down      # arrêter PostgreSQL
npm run db:migrate   # appliquer les migrations
npm run db:generate  # générer une migration après un changement de schema
```

## Structure principale

```text
src/app/          Pages Next.js et routes API
src/components/   Composants d'interface partagés
src/features/     Fonctionnalités métier, notamment les tâches
src/server/       Authentification, sessions, tâches, statistiques et focus
src/db/           Schema Drizzle et migrations PostgreSQL
tests/            Tests Vitest
```

## Dépannage

### Le port PostgreSQL est déjà utilisé

TaskForge utilise le port `5433` sur la machine hôte afin d'éviter le port PostgreSQL standard `5432`. Vérifiez que `DATABASE_URL` utilise bien `localhost:5433`.

### La base ne démarre pas

Vérifiez que Docker Desktop est ouvert, puis consultez les logs :

```bash
docker compose logs db
```

Pour repartir d'une base locale vierge, cette commande supprime aussi le volume PostgreSQL :

```bash
docker compose down -v
npm run db:up
npm run db:migrate
```

### La session semble expirée

Supprimez les cookies de `localhost:3000`, redémarrez le serveur puis reconnectez-vous. Ne partagez jamais votre fichier `.env` : il contient les identifiants de base de données.

## Production

Avant un déploiement :

1. Utilisez un mot de passe PostgreSQL fort.
2. Définissez `APP_URL` sur l'URL HTTPS publique.
3. Configurez un fournisseur email dans `src/server/mailer.ts`.
4. Lancez les migrations sur la base de production.
5. Vérifiez que les variables secrètes ne sont jamais commitées.

Construisez et démarrez l'application avec :

```bash
npm run build
npm start
```
