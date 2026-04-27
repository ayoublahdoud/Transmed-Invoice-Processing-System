# Transmed Invoice Processing System

Système de traitement automatisé des factures fournisseurs pour **Transmed** (industrie pharmaceutique, Maroc).

---

## 🏗 Architecture

```
Factures (PDF · JPEG · PNG · XML)
         │
         ▼
┌─────────────────────────┐       ┌────────────────────┐
│  Serveur Pré-traitement │──────▶│  Contrôle d'Accès  │
│  Validation · SHA-256   │       │  Droits utilisateurs│
│  Déduplication          │       └────────┬───────────┘
└────────────┬────────────┘                │
             │ Pipeline IA                 │ Gestion documentaire
             ▼                             ▼
     ┌───────────────┐          ┌─────────────────────┐
     │  Moteur OCR   │          │    Digital Repo      │
     │  Extraction   │          │  SharePoint/OneDrive │
     └───────┬───────┘          │  Indexation/Recherche│
             ▼                  └──────────┬──────────┘
     ┌───────────────┐                     │
     │   Agent IA    │          ┌──────────▼──────────┐
     │ Analyse/Class.│          │  Événement → Email  │
     └───────┬───────┘          │  Validation User    │
             ▼                  └─────────────────────┘
     ┌───────────────┐
     │  Base Données │
     │  Structurée   │
     └───────────────┘
```

---

## 🚀 Déploiement Vercel

### Option 1 — Via Interface Vercel (recommandé)

1. Connectez-vous sur [vercel.com](https://vercel.com)
2. Cliquez **"Add New Project"**
3. Importez le repo `transmed-invoice-system` depuis GitHub
4. Vercel détecte automatiquement `vercel.json` → cliquez **Deploy**
5. Votre app est en ligne en ~30 secondes ✓

### Option 2 — Via CLI

```bash
npm i -g vercel
cd transmed-invoice-system
vercel --prod
```

---

## 📁 Structure du Projet

```
transmed-invoice-system/
├── index.html     ← Application SPA complète (HTML/CSS/JS vanilla)
├── vercel.json    ← Configuration déploiement Vercel (static)
├── README.md      ← Documentation
└── .gitignore
```

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| **Upload Drag & Drop** | PDF, JPEG, PNG, XML |
| **Pipeline animé** | 6 étapes temps réel avec statuts |
| **Déduplication SHA-256** | Détection automatique des doublons |
| **Mode Démo** | 6 factures fictives (Pharmavie, Roche, Atlas Medical, Novartis...) |
| **Dashboard stats** | Total · OCR · Repo · Doublons |
| **Tableau filtrable** | Par route (OCR / Digital Repo / Doublons) |
| **Notifications toast** | Feedback temps réel |

---

## 🎨 Design System

| Variable | Couleur | Usage |
|---|---|---|
| `--navy` | `#0D2B4E` | Fond header, titres |
| `--blue-dark` | `#1A4F8A` | Primaire Transmed |
| `--blue-mid` | `#3BA8D4` | Accents, boutons |
| `--blue-light` | `#6DCFEC` | Highlights |
| `--accent` | `#00C9A7` | Succès, statuts OK |

---

## 🛠 Stack Technique

- **Frontend** : HTML5 / CSS3 / JavaScript ES6+ (vanilla, zero dépendances)
- **Fonts** : Sora + IBM Plex Mono (Google Fonts)
- **Déploiement** : Vercel Static Site
- **CI/CD** : GitHub → Vercel (auto-deploy sur push)

---

## 📋 Fournisseurs Simulés (Mode Démo)

- Pharmavie Maroc
- Roche Maroc SA
- Atlas Medical
- Novartis Maroc
- Sanofi Maroc
- GSK Pharma MA

---

## 📄 Licence

Usage interne Transmed — © 2024 Transmed
