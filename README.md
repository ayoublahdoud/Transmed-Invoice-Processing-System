# 🏥 Transmed Invoice Processing System — v2.0 (Production Réelle)

> Système **réel** de traitement automatisé des factures fournisseurs pour **Transmed** (industrie pharmaceutique, Maroc).  
> Propulsé par le **Moteur IA Transmed** pour l'OCR et l'extraction intelligente des données.

---

## 🏗 Architecture Réelle

```
Facture uploadée (PDF/JPEG/PNG/XML)
          │
          ▼
┌─────────────────────────────────────┐
│     Vercel Serverless Function      │  ← /api/process.js
│                                     │
│  1. Validation MIME réelle          │
│  2. SHA-256 fingerprint (Web Crypto)│
│  3. Déduplication (Vercel KV)       │
│  4. Upload → Vercel Blob (cloud)    │
│  5. Analyse → Moteur IA Transmed        │  ← OCR + Extraction
│  6. Sauvegarde → Vercel KV          │
└─────────────────────────────────────┘
          │
          ▼
   Données extraites :
   • Fournisseur · N° Facture · Date
   • Montant HT / TVA / TTC (MAD)
   • Lignes de facture
   • Score de confiance IA
```

---

## 🚀 Déploiement Complet — Étape par Étape

### Prérequis
- Compte [Vercel](https://vercel.com) (gratuit)
- Clé API Google Gemini (gratuite)
- Node.js 18+ installé

### Étape 1 — Cloner et installer

```bash
git clone https://github.com/ayoublahdoud/Transmed-Invoice-Processing-System.git
cd Transmed-Invoice-Processing-System
npm install
```

### Étape 2 — Créer les services Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Créer le projet
vercel

# Créer le stockage KV (base de données)
vercel kv create transmed-kv
# → Copier les variables KV_REST_API_URL et KV_REST_API_TOKEN

# Créer le stockage Blob (fichiers)
vercel blob create
# → Copier le BLOB_READ_WRITE_TOKEN
```

### Étape 3 — Configurer les variables d'environnement

Dans le dashboard Vercel → Settings → Environment Variables, ajouter :

| Variable | Valeur | Source |
|---|---|---|
| `GEMINI_API_KEY` | `sk-ant-...` | [aistudio.google.com](https://aistudio.google.com) |
| `KV_REST_API_URL` | `https://...upstash.io` | Vercel KV dashboard |
| `KV_REST_API_TOKEN` | `AX...` | Vercel KV dashboard |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_...` | Vercel Blob dashboard |

### Étape 4 — Déployer en production

```bash
vercel --prod
```

✅ Votre système est en ligne à `https://transmed-invoice-processing-system.vercel.app`

---

## 📁 Structure du Projet

```
Transmed-Invoice-Processing-System/
├── index.html                 ← Frontend SPA complet
├── api/
│   ├── process.js             ← Upload + Moteur IA + KV
│   ├── invoices.js            ← Liste des factures
│   ├── stats.js               ← Statistiques dashboard
│   └── invoice/
│       └── [id].js            ← Détail d'une facture
├── package.json               ← Dépendances Node.js
├── vercel.json                ← Configuration déploiement
├── .env.example               ← Exemple variables d'environnement
├── README.md                  ← Documentation technique
└── GUIDE_UTILISATION.md       ← Guide utilisateur
```

---

## 🤖 Données Extraites par Moteur IA

Pour chaque facture, le système extrait automatiquement :

```json
{
  "numero_facture": "F-2024-001",
  "date_facture": "2024-11-15",
  "date_echeance": "2024-12-15",
  "fournisseur": {
    "nom": "Pharmavie Maroc SARL",
    "adresse": "123 Rue Mohammed V, Casablanca",
    "telephone": "+212 5 22 XX XX XX",
    "ice": "001234567000012"
  },
  "lignes": [
    { "description": "Paracétamol 500mg x100", "quantite": 50, "prix_unitaire": 45.00, "montant": 2250.00 }
  ],
  "sous_total": 2250.00,
  "tva_taux": 20,
  "tva_montant": 450.00,
  "total_ttc": 2700.00,
  "devise": "MAD",
  "confiance": 0.95
}
```

---

## 🛠 Stack Technique Réelle

| Composant | Technologie | Usage |
|---|---|---|
| Frontend | HTML5 / CSS3 / JS vanilla | Dashboard SPA |
| Backend | Vercel Serverless Functions | API REST |
| OCR + IA | Moteur IA Transmed (Google Gemini) | Extraction données |
| Stockage fichiers | Vercel Blob | PDF/Images cloud |
| Base de données | Vercel KV (Redis) | Métadonnées + index |
| Déduplication | SHA-256 (Web Crypto) | Fingerprint réel |
| Déploiement | Vercel | CI/CD auto |

---

## 🔒 Sécurité

- Validation MIME stricte (extension + content-type)
- Fichiers stockés en accès privé (Vercel Blob `access: 'private'`)
- SHA-256 pour détecter les doublons exacts
- Variables d'environnement chiffrées (Vercel)
- Aucune donnée sensible exposée côté client

---

## 📋 Formats Supportés

| Format | Route | Traitement |
|---|---|---|
| PDF | OCR / IA | Vision IA (document) |
| JPEG / PNG | OCR / IA | Vision IA (image) |
| XML | Digital Repo | Parsing texte IA |

---

## 💰 Coûts Estimés (usage normal)

| Service | Coût |
|---|---|
| Vercel (Hobby) | Gratuit |
| Vercel KV | Gratuit jusqu'à 256MB |
| Vercel Blob | Gratuit jusqu'à 1GB |
| Moteur IA Transmed | Gratuit — 1500 factures/jour |

---

## 📄 Licence

Usage interne Transmed — © 2025 Transmed
