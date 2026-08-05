# BLACKOUT — Version Netlify (Functions + Blobs)

Ce projet est une adaptation du backend Express original pour tourner
sur Netlify, en remplaçant :
- Le serveur Express (`server.js`) → des **Netlify Functions** (`netlify/functions/api.js`)
- Le fichier JSON local (`blackout_db.json`) → **Netlify Blobs** (stockage clé-valeur persistant)

## Structure

```
netlify-project/
├── netlify.toml              # Config Netlify (redirections /api/* → fonction)
├── package.json              # Dépendance @netlify/blobs
├── public/                   # Fichiers statiques servis tels quels
│   ├── index.html
│   ├── admin.html
│   ├── login.html
│   ├── script.js
│   └── styles.css
└── netlify/
    └── functions/
        ├── api.js            # Toutes les routes API (login, users, implants, categories, orders)
        └── utils/
            └── database.js   # Logique de données, utilise Netlify Blobs au lieu de fs
```

## Déploiement

### Option A — Via l'interface Netlify (le plus simple)

1. Créez un compte sur [netlify.com](https://netlify.com) si vous n'en avez pas.
2. Poussez ce dossier sur un dépôt GitHub/GitLab.
3. Sur Netlify : **Add new site → Import an existing project** → connectez votre dépôt.
4. Netlify détectera automatiquement `netlify.toml`. Laissez les réglages par défaut.
5. Cliquez sur **Deploy**.

Netlify Blobs est **activé automatiquement** dès que le site est déployé sur
Netlify — aucune configuration supplémentaire n'est nécessaire, pas de
clé API à fournir.

### Option B — Déploiement en ligne de commande

```bash
npm install -g netlify-cli
cd netlify-project
netlify login
netlify init          # associe ce dossier à un nouveau site Netlify
netlify deploy --prod
```

## Test en local avant déploiement

```bash
cd netlify-project
npm install
netlify dev
```

Cela lance un serveur local qui simule l'environnement Netlify (fonctions +
Blobs inclus) sur `http://localhost:8888`.

## Différences avec la version Express originale

- Toutes les routes `/api/...` passent maintenant par **une seule fonction**
  (`api.js`) qui route en interne selon le chemin — au lieu de plusieurs
  routes Express séparées. Le comportement observable (URLs, méthodes,
  réponses JSON) est identique.
- Les données sont stockées dans un **Netlify Blob** nommé `blackout-db`
  au lieu du fichier `blackout_db.json`. Elles persistent entre les
  déploiements et les invocations de fonctions, comme le ferait un fichier
  classique — mais ne sont plus consultables directement sur le disque
  du dépôt Git.
- Au premier appel à l'API sur un nouveau site, la base est initialisée
  automatiquement avec les mêmes données de départ (users, implants,
  catégories, commandes) que la version originale.

## Limites connues

- Le plan gratuit Netlify a des quotas sur les fonctions (nombre
  d'invocations/mois) et sur le stockage Blobs — largement suffisants
  pour un usage de démonstration/portfolio, mais à surveiller si le
  trafic augmente.
- Les mots de passe restent stockés en clair dans les données, comme
  dans la version originale — à ne pas utiliser en production réelle
  sans ajouter un hachage (bcrypt, etc.).
